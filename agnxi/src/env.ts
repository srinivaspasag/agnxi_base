import { z } from "zod";

/**
 * Server-side and build-time env. Never expose secrets to client.
 * All config externalized; no hardcoded tenants or secrets.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.union([z.string().url(), z.literal("")]).optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  AGENT_WORKER_URL: z.string().url().optional(),
  AGENT_WORKER_SECRET: z.string().optional(),
  // Default tenant limits (overridable per tenant in DB settings.limits)
  LIMITS_MAX_AGENTS: z.coerce.number().int().min(1).optional(),
  LIMITS_MAX_CONCURRENT_INVOCATIONS: z.coerce.number().int().min(1).optional(),
  LIMITS_INVOCATION_TIMEOUT_SEC: z.coerce.number().int().min(1).optional(),
  LIMITS_MAX_REQUEST_BODY_BYTES: z.coerce.number().int().min(1).optional(),
  LIMITS_MAX_STORAGE_MB: z.coerce.number().int().min(1).optional(),
  LIMITS_MAX_API_KEYS: z.coerce.number().int().min(1).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type Env = z.infer<typeof serverSchema>;

function validateEnv() {
  const server = serverSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AGENT_WORKER_URL: process.env.AGENT_WORKER_URL,
    AGENT_WORKER_SECRET: process.env.AGENT_WORKER_SECRET,
    LIMITS_MAX_AGENTS: process.env.LIMITS_MAX_AGENTS,
    LIMITS_MAX_CONCURRENT_INVOCATIONS: process.env.LIMITS_MAX_CONCURRENT_INVOCATIONS,
    LIMITS_INVOCATION_TIMEOUT_SEC: process.env.LIMITS_INVOCATION_TIMEOUT_SEC,
    LIMITS_MAX_REQUEST_BODY_BYTES: process.env.LIMITS_MAX_REQUEST_BODY_BYTES,
    LIMITS_MAX_STORAGE_MB: process.env.LIMITS_MAX_STORAGE_MB,
    LIMITS_MAX_API_KEYS: process.env.LIMITS_MAX_API_KEYS,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
  if (!server.success && process.env.NODE_ENV === "production") {
    throw new Error(`Invalid server env: ${JSON.stringify(server.error.flatten().fieldErrors)}`);
  }
  return server.data as Env;
}

export const env = validateEnv();

export function validateClientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
