import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "@/lib/env";
import { fetchNewStoryIds, fetchItems, normalizeItem } from "@/lib/sources/hacker-news";
import { scoreRelevance, FILTER_VERSION, type TrackedTopic } from "@/lib/relevance/score";
import { analyzeEvent } from "@/lib/ai/analyze";
import { buildPayload, sendToN8n } from "@/lib/delivery/n8n";

export async function runIngestion(
  supabase: SupabaseClient,
  env: Env,
  trigger: "schedule" | "manual"
) {
  const { data: existingRun } = await supabase
    .from("ingestion_runs")
    .select("id")
    .eq("status", "running")
    .maybeSingle();

  if (existingRun) {
    console.log("[SignalWatch] Another ingestion is already running, exiting.");
    return;
  }

  const { data: run, error: runError } = await supabase
    .from("ingestion_runs")
    .insert({ trigger, status: "running" })
    .select("id")
    .single();

  if (runError || !run) {
    if (runError?.code === "23505") {
      console.log("[SignalWatch] Concurrent run detected (unique constraint), exiting.");
      return;
    }
    throw new Error(`Failed to create ingestion run: ${runError?.message}`);
  }

  const runId = run.id;
  const metrics = {
    fetched_count: 0,
    candidate_count: 0,
    analyzed_count: 0,
    notified_count: 0,
    error_count: 0,
  };

  try {
    const { data: topicRows } = await supabase
      .from("tracked_topics")
      .select("name, keywords, excluded_keywords")
      .eq("enabled", true);

    const topics: TrackedTopic[] = (topicRows ?? []).map((t) => ({
      name: t.name,
      keywords: t.keywords,
      excludedKeywords: t.excluded_keywords,
    }));

    console.log(`[SignalWatch] Loaded ${topics.length} tracked topics`);

    const storyIds = await fetchNewStoryIds(env.MAX_ITEMS_PER_RUN);
    const items = await fetchItems(storyIds);
    metrics.fetched_count = items.length;
    console.log(`[SignalWatch] Fetched ${items.length} stories`);

    let aiCalls = 0;

    for (const item of items) {
      const event = normalizeItem(item);

      const { error: insertError } = await supabase.from("events").insert({
        source: event.source,
        external_id: event.externalId,
        title: event.title,
        url: event.url,
        author: event.author,
        published_at: event.publishedAt?.toISOString(),
        raw_payload: event.rawPayload,
        filter_score: 0,
        filter_version: FILTER_VERSION,
        status: "new",
      });

      if (insertError?.code === "23505") {
        continue;
      }
      if (insertError) {
        console.error(`[SignalWatch] Insert error for ${event.externalId}:`, insertError.message);
        metrics.error_count++;
        continue;
      }

      const { data: eventRow } = await supabase
        .from("events")
        .select("id")
        .eq("source", event.source)
        .eq("external_id", event.externalId)
        .single();

      if (!eventRow) continue;

      const { score, matchedTopics } = scoreRelevance(
        event.title,
        event.url,
        event.rawPayload.text ?? null,
        topics
      );

      await supabase
        .from("events")
        .update({
          filter_score: score,
          matched_topics: matchedTopics,
          status: score >= env.RELEVANCE_THRESHOLD ? "new" : "ignored",
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventRow.id);

      if (score < env.RELEVANCE_THRESHOLD) continue;

      metrics.candidate_count++;

      if (aiCalls >= env.MAX_AI_CALLS_PER_RUN) continue;
      aiCalls++;

      const analysisResult = await analyzeEvent(event, env.OPENAI_API_KEY, env.OPENAI_MODEL);

      if (!analysisResult.ok) {
        const err = analysisResult.error;
        const failureCode = err.kind;
        const isDead = err.kind === "model_refusal";

        const { data: currentEvent } = await supabase
          .from("events")
          .select("attempt_count")
          .eq("id", eventRow.id)
          .single();

        const attempts = (currentEvent?.attempt_count ?? 0) + 1;

        await supabase
          .from("events")
          .update({
            status: isDead || attempts >= 3 ? "dead" : "failed",
            failure_code: failureCode,
            attempt_count: attempts,
            next_retry_at: isDead ? null : new Date(Date.now() + attempts * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", eventRow.id);

        metrics.error_count++;
        console.error(`[SignalWatch] Analysis failed for ${event.externalId}: ${failureCode}`);
        continue;
      }

      const { analysis, model, promptVersion, providerMetadata } = analysisResult.result;
      metrics.analyzed_count++;

      await supabase.from("analyses").insert({
        event_id: eventRow.id,
        relevant: analysis.relevant,
        category: analysis.category,
        urgency: analysis.urgency,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        summary: analysis.summary,
        why_it_matters: analysis.whyItMatters,
        suggested_action: analysis.suggestedAction,
        model,
        prompt_version: promptVersion,
        provider_metadata: providerMetadata,
      });

      await supabase
        .from("events")
        .update({ status: "analyzed", updated_at: new Date().toISOString() })
        .eq("id", eventRow.id);

      const shouldNotify =
        analysis.relevant &&
        analysis.confidence >= 70 &&
        (analysis.urgency === "medium" || analysis.urgency === "high");

      if (!shouldNotify) continue;

      for (const channel of ["telegram", "discord"] as const) {
        const { data: delivery } = await supabase
          .from("deliveries")
          .insert({
            event_id: eventRow.id,
            channel,
            status: "pending",
          })
          .select("id")
          .single();

        if (!delivery) continue;

        await supabase
          .from("deliveries")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", delivery.id);

        const payload = buildPayload(
          delivery.id,
          channel,
          event.title,
          event.url,
          analysis
        );

        const outcome = await sendToN8n(
          env.N8N_WEBHOOK_URL,
          env.N8N_HEADER_AUTH_VALUE,
          payload
        );

        const deliveryUpdate: Record<string, unknown> = {
          status: outcome.status,
          attempt_count: 1,
          updated_at: new Date().toISOString(),
        };

        if (outcome.status === "sent") {
          deliveryUpdate.external_message_id = outcome.externalMessageId ?? null;
          metrics.notified_count++;
        } else {
          deliveryUpdate.last_error = outcome.error;
        }

        await supabase.from("deliveries").update(deliveryUpdate).eq("id", delivery.id);
      }
    }

    await supabase
      .from("ingestion_runs")
      .update({
        status: "succeeded",
        ...metrics,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    console.log("[SignalWatch] Ingestion complete:", metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[SignalWatch] Fatal ingestion error:", message);

    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        ...metrics,
        error_summary: message.slice(0, 500),
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    throw err;
  }
}
