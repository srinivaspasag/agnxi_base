/**
 * Public API: List or create agents.
 * GET /api/v1/agents — list agents for the tenant.
 * POST /api/v1/agents — create agent (external customers, no manual provisioning).
 */

import { NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/get-tenant";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkMaxAgents } from "@/lib/limits";
import { logger } from "@/lib/logger";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["draft", "active", "paused", "archived"]).optional().default("active"),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const createBodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
  description: z.string().optional(),
  runtime: z.enum(["cloudflare_worker", "fly_io"]).default("cloudflare_worker"),
  config: z.record(z.unknown()).default({}),
});

export async function GET(req: Request) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get("status") ?? "active",
    limit: searchParams.get("limit") ?? 20,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, slug, description, status, runtime, version, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", parsed.data.status)
    .order("updated_at", { ascending: false })
    .limit(parsed.data.limit);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ agents: data });
}

export async function POST(req: Request) {
  const tenantId = await getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limitCheck = await checkMaxAgents(tenantId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Agent limit reached", current: limitCheck.current, limit: limitCheck.limit },
      { status: 429 }
    );
  }
  let body: z.infer<typeof createBodySchema>;
  try {
    body = createBodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid body", details: (e as z.ZodError).flatten() }, { status: 400 });
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      tenant_id: tenantId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      runtime: body.runtime,
      config: body.config,
      status: "draft",
    })
    .select("id, name, slug, status, runtime, created_at")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Agent slug already exists" }, { status: 409 });
    logger.error("agents.create failed", { tenant_id: tenantId, error: error.message });
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
  return NextResponse.json(data);
}
