import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

export function createServerClient() {
  const env = getEnv();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require("ws");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    realtime: { transport: ws },
  });
}
