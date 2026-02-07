/**
 * Public API: Invoke an agent (async).
 * POST /api/v1/agents/:slug/invoke — enqueue invocation, return external_id.
 */

import { NextResponse } from "next/server";
import { resolveApiKey, touchApiKey } from "@/lib/api-key";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { generateExternalId } from "@/lib/ids";
import { enqueueInvocation } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { getTenantLimits, checkMaxConcurrentInvocations } from "@/lib/limits";

const bodySchema = z.object({
  input: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const authResult = await getAuth(req);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId, apiKeyId } = authResult;
  if (apiKeyId) touchApiKey(apiKeyId).catch(() => {});

  const supabase = createSupabaseServiceClient();
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent not found or not active" }, { status: 404 });
  }

  const limits = await getTenantLimits(tenantId);
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > limits.max_request_body_bytes) {
    return NextResponse.json(
      { error: "Request body too large", max_bytes: limits.max_request_body_bytes },
      { status: 413 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid body", details: (e as z.ZodError).flatten() }, { status: 400 });
  }

  const concurrentCheck = await checkMaxConcurrentInvocations(tenantId);
  if (!concurrentCheck.allowed) {
    return NextResponse.json(
      { error: "Too many concurrent invocations", current: concurrentCheck.current, limit: concurrentCheck.limit },
      { status: 429 }
    );
  }

  const externalId = generateExternalId();
  const { data: invocation, error: invError } = await supabase
    .from("agent_invocations")
    .insert({
      tenant_id: tenantId,
      agent_id: agent.id,
      external_id: externalId,
      status: "queued",
      input_payload: body.input,
      metadata: body.metadata ?? {},
      created_by_type: apiKeyId ? "api_key" : "user",
      created_by_id: apiKeyId ?? authResult.userId ?? null,
    })
    .select("id")
    .single();
  if (invError || !invocation) {
    logger.error("invoke: insert failed", { tenant_id: tenantId, error: invError.message });
    return NextResponse.json({ error: "Failed to create invocation" }, { status: 500 });
  }

  await enqueueInvocation({
    invocationId: invocation.id,
    externalId,
    tenantId,
    agentId: agent.id,
    inputPayload: body.input,
    metadata: body.metadata,
  });

  return NextResponse.json({
    invocation_id: externalId,
    status: "queued",
    message: "Invocation queued; poll GET /api/v1/invocations/:id for status and result.",
  });
}

async function getAuth(req: Request): Promise<{ tenantId: string; userId: string | null; apiKeyId: string | null } | null> {
  const auth = req.headers.get("authorization");
  const apiKeyAuth = await resolveApiKey(auth);
  if (apiKeyAuth) {
    return { tenantId: apiKeyAuth.tenantId, userId: null, apiKeyId: apiKeyAuth.apiKeyId };
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) =>
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options ?? {})),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member) return null;
  return { tenantId: member.tenant_id, userId: user.id, apiKeyId: null };
}
