import type { SignalAnalysis } from "@/lib/ai/schema";

export interface DeliveryPayload {
  deliveryId: string;
  channel: "telegram" | "discord";
  message: {
    title: string;
    url: string | null;
    summary: string;
    whyItMatters: string;
    suggestedAction: string;
    urgency: string;
    category: string;
    confidence: number;
  };
}

export interface DeliveryResult {
  deliveryId: string;
  delivered: boolean;
  externalMessageId?: string;
  errorCode?: string;
}

export type DeliveryOutcome =
  | { status: "sent"; externalMessageId?: string }
  | { status: "failed"; error: string }
  | { status: "unknown"; error: string };

const DELIVERY_TIMEOUT_MS = 15_000;

export function buildPayload(
  deliveryId: string,
  channel: "telegram" | "discord",
  title: string,
  url: string | null,
  analysis: SignalAnalysis
): DeliveryPayload {
  return {
    deliveryId,
    channel,
    message: {
      title,
      url,
      summary: analysis.summary,
      whyItMatters: analysis.whyItMatters,
      suggestedAction: analysis.suggestedAction,
      urgency: analysis.urgency,
      category: analysis.category,
      confidence: analysis.confidence,
    },
  };
}

export async function sendToN8n(
  webhookUrl: string,
  headerAuthValue: string,
  payload: DeliveryPayload
): Promise<DeliveryOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: headerAuthValue,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        status: "failed",
        error: `HTTP ${res.status}`,
      };
    }

    let result: DeliveryResult;
    try {
      result = await res.json();
    } catch {
      return {
        status: "unknown",
        error: "Invalid JSON response from n8n",
      };
    }

    if (result.deliveryId !== payload.deliveryId) {
      return {
        status: "unknown",
        error: `Mismatched deliveryId: expected ${payload.deliveryId}, got ${result.deliveryId}`,
      };
    }

    if (result.delivered) {
      return {
        status: "sent",
        externalMessageId: result.externalMessageId,
      };
    }

    return {
      status: "failed",
      error: result.errorCode ?? "Delivery rejected by n8n",
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        status: "unknown",
        error: "Request timed out — side effect may have occurred",
      };
    }
    return {
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown transport error",
    };
  } finally {
    clearTimeout(timeout);
  }
}
