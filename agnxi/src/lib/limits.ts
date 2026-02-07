/**
 * Tenant limits: from DB (tenant.settings.limits) with env defaults.
 * All limits configurable; no hardcoded values. Enforced at runtime.
 */

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { env } from "@/env";

export interface TenantLimits {
  max_agents: number;
  max_concurrent_invocations: number;
  invocation_timeout_sec: number;
  max_request_body_bytes: number;
  max_storage_mb: number;
  max_api_keys: number;
}

const DEFAULTS: TenantLimits = {
  max_agents: env.LIMITS_MAX_AGENTS ?? 50,
  max_concurrent_invocations: env.LIMITS_MAX_CONCURRENT_INVOCATIONS ?? 10,
  invocation_timeout_sec: env.LIMITS_INVOCATION_TIMEOUT_SEC ?? 300,
  max_request_body_bytes: env.LIMITS_MAX_REQUEST_BODY_BYTES ?? 1_048_576, // 1MB
  max_storage_mb: env.LIMITS_MAX_STORAGE_MB ?? 100,
  max_api_keys: env.LIMITS_MAX_API_KEYS ?? 20,
};

export async function getTenantLimits(tenantId: string): Promise<TenantLimits> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  const limits = (data?.settings as { limits?: Partial<TenantLimits> })?.limits;
  if (!limits || typeof limits !== "object") return { ...DEFAULTS };
  return {
    max_agents: limits.max_agents ?? DEFAULTS.max_agents,
    max_concurrent_invocations: limits.max_concurrent_invocations ?? DEFAULTS.max_concurrent_invocations,
    invocation_timeout_sec: limits.invocation_timeout_sec ?? DEFAULTS.invocation_timeout_sec,
    max_request_body_bytes: limits.max_request_body_bytes ?? DEFAULTS.max_request_body_bytes,
    max_storage_mb: limits.max_storage_mb ?? DEFAULTS.max_storage_mb,
    max_api_keys: limits.max_api_keys ?? DEFAULTS.max_api_keys,
  };
}

export async function checkMaxAgents(tenantId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [limits, { count }] = await Promise.all([
    getTenantLimits(tenantId),
    createSupabaseServiceClient().from("agents").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);
  const current = count ?? 0;
  return { allowed: current < limits.max_agents, current, limit: limits.max_agents };
}

export async function checkMaxConcurrentInvocations(tenantId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [limits, { count }] = await Promise.all([
    getTenantLimits(tenantId),
    createSupabaseServiceClient()
      .from("agent_invocations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["queued", "running"]),
  ]);
  const current = count ?? 0;
  return { allowed: current < limits.max_concurrent_invocations, current, limit: limits.max_concurrent_invocations };
}

export async function checkMaxApiKeys(tenantId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [limits, { count }] = await Promise.all([
    getTenantLimits(tenantId),
    createSupabaseServiceClient()
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("revoked_at", null),
  ]);
  const current = count ?? 0;
  return { allowed: current < limits.max_api_keys, current, limit: limits.max_api_keys };
}
