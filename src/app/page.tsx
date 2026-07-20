import { getDashboardSignals, getDashboardStats } from "@/lib/supabase/dashboard";
import { SignalCard } from "@/components/signal-card";
import { StatsBar } from "@/components/stats-bar";

export const dynamic = "force-dynamic";

export default async function Home() {
  let signals;
  let stats;
  let error = false;

  try {
    [signals, stats] = await Promise.all([
      getDashboardSignals(),
      getDashboardStats(),
    ]);
  } catch {
    error = true;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          SignalWatch
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          AI-powered tech signal monitoring from Hacker News
        </p>
        {stats?.lastRunAt && (
          <p className="mt-1 text-xs text-zinc-400">
            Last run:{" "}
            {new Date(stats.lastRunAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            — {stats.lastRunStatus}
          </p>
        )}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-300">
            Unable to load signals. Check server configuration.
          </p>
        </div>
      ) : (
        <>
          {stats && <StatsBar stats={stats} />}

          <div className="mt-6 space-y-3">
            {signals && signals.length > 0 ? (
              signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-500 dark:text-zinc-400">
                  No signals yet. Run an ingestion to start monitoring.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <footer className="mt-12 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
        SignalWatch — portfolio project by Georgy Pevchikh
      </footer>
    </div>
  );
}
