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

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
