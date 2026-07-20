import type { DashboardStats } from "@/lib/supabase/dashboard";

export function StatsBar({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Fetched", value: stats.totalFetched },
    { label: "Analyzed", value: stats.totalAnalyzed },
    { label: "Delivered", value: stats.totalDelivered },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {item.value}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
