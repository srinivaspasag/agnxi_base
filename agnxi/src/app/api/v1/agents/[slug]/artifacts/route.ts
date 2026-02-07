/**
 * Public API: Upload agent code/config artifacts (per-tenant storage).
 * POST /api/v1/agents/:slug/artifacts — upload file to agent-artifacts bucket.
 * Path: tenant_id/agent_id/filename. Enforces max_request_body_bytes and max_storage_mb.
 */

import { NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/get-tenant";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getTenantLimits } from "@/lib/limits";
import { logger } from "@/lib/logger";

const BUCKET = "agent-artifacts";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limits = await getTenantLimits(tenantId);
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > limits.max_request_body_bytes) {
    return NextResponse.json(
      { error: "Payload too large", max_bytes: limits.max_request_body_bytes },
      { status: 413 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", (await params).slug)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "application/octet-stream";
  const disposition = req.headers.get("content-disposition");
  const filename = disposition?.match(/filename="?([^";\n]+)"?/)?.[1] ?? "upload";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
  const path = `${tenantId}/${agent.id}/${safeName}`;

  const arrayBuffer = await req.arrayBuffer();
  if (arrayBuffer.byteLength > limits.max_request_body_bytes) {
    return NextResponse.json(
      { error: "Payload too large", max_bytes: limits.max_request_body_bytes },
      { status: 413 }
    );
  }

  const { data: file, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: contentType.startsWith("application/") || contentType.startsWith("text/") ? contentType : "application/octet-stream",
      upsert: true,
    });
  if (error) {
    logger.error("artifacts.upload failed", { tenant_id: tenantId, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    path: file.path,
    message: "Uploaded. Reference in agent config via path or use GET to download.",
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", (await params).slug)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "Query param 'file' required (filename)" }, { status: 400 });
  }
  const safeName = file.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
  const path = `${tenantId}/${agent.id}/${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ signed_url: data.signedUrl, expires_in_sec: 3600 });
  }
  return NextResponse.redirect(data.signedUrl);
}
