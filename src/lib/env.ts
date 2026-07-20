import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  N8N_WEBHOOK_URL: z.string().url(),
  N8N_HEADER_AUTH_VALUE: z.string().min(1),
  MAX_ITEMS_PER_RUN: z.coerce.number().int().positive().default(30),
  MAX_AI_CALLS_PER_RUN: z.coerce.number().int().positive().default(10),
  RELEVANCE_THRESHOLD: z.coerce.number().int().default(2),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Full environment — required by the ingestion worker (HN → AI → delivery).
 * Do NOT call this from the dashboard: it would force the read-only web
 * deployment to hold the OpenAI key and n8n secret it never uses.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

let cachedSupabaseEnv: SupabaseEnv | null = null;

/**
 * Minimal environment for the read-only dashboard: only what the Supabase
 * server client needs. Keeps the public Vercel deployment free of the
 * OpenAI / n8n secrets used exclusively by ingestion.
 */
export function getSupabaseEnv(): SupabaseEnv {
  if (cachedSupabaseEnv) return cachedSupabaseEnv;
  cachedSupabaseEnv = supabaseEnvSchema.parse(process.env);
  return cachedSupabaseEnv;
}
