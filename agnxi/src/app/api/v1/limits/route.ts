/**
 * Public API: Get current tenant limits (configurable per tenant, from DB + env).
 * GET /api/v1/limits — returns limits for the authenticated tenant.
 */

import { NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/get-tenant";
import { getTenantLimits } from "@/lib/limits";

export async function GET(req: Request) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limits = await getTenantLimits(tenantId);
  return NextResponse.json({
    max_agents: limits.max_agents,
    max_concurrent_invocations: limits.max_concurrent_invocations,
    invocation_timeout_sec: limits.invocation_timeout_sec,
    max_request_body_bytes: limits.max_request_body_bytes,
    max_storage_mb: limits.max_storage_mb,
    max_api_keys: limits.max_api_keys,
  });
}
