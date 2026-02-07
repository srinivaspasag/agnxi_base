/**
 * Public API: Get invocation status and result.
 * GET /api/v1/invocations/:id — id is external_id (e.g. agnxi_inv_xxx).
 */

import { NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/get-tenant";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: externalId } = await params;
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("agent_invocations")
    .select("external_id, status, input_payload, output_payload, error_message, started_at, completed_at, created_at")
    .eq("tenant_id", tenantId)
    .eq("external_id", externalId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    invocation_id: data.external_id,
    status: data.status,
    input: data.input_payload,
    output: data.output_payload,
    error: data.error_message,
    started_at: data.started_at,
    completed_at: data.completed_at,
    created_at: data.created_at,
  });
}
