import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { hashApiKey, apiKeyPrefix } from "@/lib/ids";
import { logger } from "@/lib/logger";

const BEARER_PREFIX = "Bearer ";

export interface ApiKeyAuth {
  tenantId: string;
  apiKeyId: string;
}

/**
 * Resolve tenant + api_key id from Authorization header.
 * Header: Authorization: Bearer agnxi_key_<hex>
 * Returns null if missing or invalid.
 */
export async function resolveApiKey(authHeader: string | null): Promise<ApiKeyAuth | null> {
  if (!authHeader?.startsWith(BEARER_PREFIX)) return null;
  const raw = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!raw.startsWith("agnxi_key_")) return null;
  const hash = hashApiKey(raw);
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, tenant_id")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .single();
  if (error || !data) {
    logger.warn("API key resolution failed", { prefix: apiKeyPrefix(raw) });
    return null;
  }
  return { tenantId: data.tenant_id, apiKeyId: data.id };
}

/**
 * Update last_used_at for the API key (fire-and-forget).
 */
export async function touchApiKey(apiKeyId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyId);
}
