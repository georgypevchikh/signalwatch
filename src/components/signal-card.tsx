"use client";

import { useState } from "react";
import type { DashboardSignal } from "@/lib/supabase/dashboard";

const urgencyColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const categoryLabels: Record<string, string> = {
  ai: "AI",
  automation: "Automation",
  developer_tools: "Dev Tools",
  security: "Security",
  other: "Other",
};

function DeliveryBadge({
  channel,
  status,
}: {
  channel: string;
  status: string | null;
}) {
  if (!status) return null;
  const colors: Record<string, string> = {
    sent: "text-green-600 dark:text-green-400",
    failed: "text-red-600 dark:text-red-400",
    unknown: "text-yellow-600 dark:text-yellow-400",
    pending: "text-zinc-400",
    processing: "text-blue-500",
  };
  const icons: Record<string, string> = {
    telegram: "TG",
    discord: "DC",
  };
  return (
    <span className={`text-xs font-medium ${colors[status] ?? "text-zinc-400"}`}>
      {icons[channel] ?? channel} {status}
    </span>
  );
}

export function SignalCard({ signal }: { signal: DashboardSignal }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${urgencyColors[signal.urgency as keyof typeof urgencyColors] ?? urgencyColors.low}`}
            >
              {signal.urgency}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {categoryLabels[signal.category] ?? signal.category}
            </span>
            <span className="text-xs text-zinc-400">
              {signal.confidence}% confidence
            </span>
          </div>
          {signal.url ? (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400 line-clamp-2"
            >
              {signal.title}
            </a>
          ) : (
            <p className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
              {signal.title}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {signal.summary}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
              Why it matters
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {signal.whyItMatters}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
              Suggested action
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {signal.suggestedAction}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-3">
          <DeliveryBadge channel="telegram" status={signal.telegramStatus} />
          <DeliveryBadge channel="discord" status={signal.discordStatus} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {new Date(signal.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {expanded ? "Less" : "More"}
          </button>
        </div>
      </div>
    </div>
  );
}
