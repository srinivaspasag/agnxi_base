/**
 * Public API: List or create API keys (programmatic access).
 * GET /api/v1/api-keys — list (prefix only). POST /api/v1/api-keys — create (returns raw key once).
 */

import { NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/get-tenant";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkMaxApiKeys } from "@/lib/limits";
import { generateApiKey } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(req: Request) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ api_keys: data });
}

const createBodySchema = z.object({
  name: z.string().min(1).max(255),
});

export async function POST(req: Request) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limitCheck = await checkMaxApiKeys(tenantId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "API key limit reached", current: limitCheck.current, limit: limitCheck.limit },
      { status: 429 }
    );
  }
  let body: z.infer<typeof createBodySchema>;
  try {
    body = createBodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid body", details: (e as z.ZodError).flatten() }, { status: 400 });
  }
  const { raw, prefix, hash } = generateApiKey();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ tenant_id: tenantId, name: body.name, key_prefix: prefix, key_hash: hash })
    .select("id, name, key_prefix, created_at")
    .single();
  if (error) {
    logger.error("api-keys.create failed", { tenant_id: tenantId, error: error.message });
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
  return NextResponse.json({
    ...data,
    key: raw,
    message: "Store the key securely; it will not be shown again.",
  });
}
