import "dotenv/config";
import { getEnv } from "@/lib/env";
import { createServerClient } from "@/lib/supabase/server";
import { runIngestion } from "@/lib/ingestion/run";

async function main() {
  const env = getEnv();
  console.log(
    `[SignalWatch] Starting ingestion (model=${env.OPENAI_MODEL}, max_items=${env.MAX_ITEMS_PER_RUN}, max_ai=${env.MAX_AI_CALLS_PER_RUN})`
  );

  const supabase = createServerClient();
  const trigger = process.env.GITHUB_ACTIONS ? "schedule" : "manual";

  await runIngestion(supabase, env, trigger);
}

main().catch((err) => {
  console.error("[SignalWatch] Fatal error:", err);
  process.exit(1);
});
