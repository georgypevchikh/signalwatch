import { createClient } from "@supabase/supabase-js";

export interface DashboardSignal {
  id: string;
  title: string;
  url: string | null;
  source: string;
  category: string;
  urgency: string;
  sentiment: string;
  confidence: number;
  summary: string;
  whyItMatters: string;
  suggestedAction: string;
  telegramStatus: string | null;
  discordStatus: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalFetched: number;
  totalAnalyzed: number;
  totalDelivered: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

function getServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export async function getDashboardSignals(
  limit = 50
): Promise<DashboardSignal[]> {
  const supabase = getServerClient();

  const { data: events } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      url,
      source,
      created_at,
      analyses (
        category,
        urgency,
        sentiment,
        confidence,
        summary,
        why_it_matters,
        suggested_action
      ),
      deliveries (
        channel,
        status
      )
    `
    )
    .eq("status", "analyzed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!events) return [];

  return events.map((e) => {
    const analysis = Array.isArray(e.analyses) ? e.analyses[0] : e.analyses;
    const deliveries = Array.isArray(e.deliveries) ? e.deliveries : [];
    const telegram = deliveries.find(
      (d: { channel: string }) => d.channel === "telegram"
    );
    const discord = deliveries.find(
      (d: { channel: string }) => d.channel === "discord"
    );

    return {
      id: e.id,
      title: e.title,
      url: e.url,
      source: e.source,
      category: analysis?.category ?? "other",
      urgency: analysis?.urgency ?? "low",
      sentiment: analysis?.sentiment ?? "neutral",
      confidence: analysis?.confidence ?? 0,
      summary: analysis?.summary ?? "",
      whyItMatters: analysis?.why_it_matters ?? "",
      suggestedAction: analysis?.suggested_action ?? "",
      telegramStatus: telegram?.status ?? null,
      discordStatus: discord?.status ?? null,
      createdAt: e.created_at,
    };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getServerClient();

  const [eventsResult, analyzedResult, deliveredResult, lastRunResult] =
    await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
      supabase
        .from("ingestion_runs")
        .select("finished_at, status")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    totalFetched: eventsResult.count ?? 0,
    totalAnalyzed: analyzedResult.count ?? 0,
    totalDelivered: deliveredResult.count ?? 0,
    lastRunAt: lastRunResult.data?.finished_at ?? null,
    lastRunStatus: lastRunResult.data?.status ?? null,
  };
}
