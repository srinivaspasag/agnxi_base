/**
 * Public API: Get invocation logs (streaming / realtime via Supabase optional).
 * GET /api/v1/invocations/:id/logs — id is external_id.
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
  const { data: inv } = await supabase
    .from("agent_invocations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("external_id", externalId)
    .single();
  if (!inv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: logs, error } = await supabase
    .from("agent_invocation_logs")
    .select("seq, level, message, payload, created_at")
    .eq("invocation_id", inv.id)
    .order("seq", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: logs ?? [] });
}
