/**
 * Public API: Self-service workspace (tenant) creation.
 * POST /api/v1/workspaces — create a tenant and add current user as owner.
 * Only allowed when the user has no tenant yet (first signup). No manual provisioning.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const { data: existingMember } = await service
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingMember?.tenant_id) {
    return NextResponse.json(
      { error: "You already have a workspace. Use your existing workspace or create an API key for programmatic access." },
      { status: 409 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid body", details: (e as z.ZodError).flatten() }, { status: 400 });
  }

  const { data: tenant, error: tenantError } = await service
    .from("tenants")
    .insert({ name: body.name, slug: body.slug })
    .select("id, name, slug")
    .single();
  if (tenantError) {
    if (tenantError.code === "23505") return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    logger.error("workspaces.create tenant failed", { error: tenantError.message });
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  const { error: memberError } = await service
    .from("tenant_members")
    .insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" });
  if (memberError) {
    await service.from("tenants").delete().eq("id", tenant.id);
    logger.error("workspaces.create member failed", { error: memberError.message });
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  logger.info("Workspace created (self-service)", { tenant_id: tenant.id, user_id: user.id });
  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    message: "Workspace created. You can now create agents and API keys.",
  });
}
