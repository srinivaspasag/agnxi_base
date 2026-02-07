import { z } from "zod";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { checkMaxAgents } from "@/lib/limits";

const agentRuntimeEnum = z.enum(["cloudflare_worker", "fly_io"]);
const agentStatusEnum = z.enum(["draft", "active", "paused", "archived"]);

export const agentsRouter = router({
  list: tenantProcedure
    .input(z.object({ status: agentStatusEnum.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      let q = supabase
        .from("agents")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .order("updated_at", { ascending: false });
      if (input?.status) q = q.eq("status", input.status);
      const { data, error } = await q;
      if (error) {
        logger.error("agents.list failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      return data;
    }),

  getBySlug: tenantProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .eq("slug", input.slug)
        .single();
      if (error || !data) {
        if (error?.code === "PGRST116") return null;
        logger.error("agents.getBySlug failed", { tenant_id: ctx.tenantId, error: error?.message });
        throw new Error(error?.message ?? "Not found");
      }
      return data;
    }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
        description: z.string().optional(),
        runtime: agentRuntimeEnum.default("cloudflare_worker"),
        config: z.record(z.unknown()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const limitCheck = await checkMaxAgents(ctx.tenantId);
      if (!limitCheck.allowed) {
        throw new Error(`Agent limit reached (${limitCheck.current}/${limitCheck.limit}). Contact support or upgrade.`);
      }
      const supabase = createSupabaseServiceClient();
      const { data, error } = await supabase
        .from("agents")
        .insert({
          tenant_id: ctx.tenantId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          runtime: input.runtime,
          config: input.config,
          status: "draft",
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Agent slug already exists");
        logger.error("agents.create failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      logger.info("Agent created", { tenant_id: ctx.tenantId, agent_id: data.id });
      return data;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: agentStatusEnum.optional(),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("agents")
        .update(updates as Record<string, unknown>)
        .eq("id", id)
        .eq("tenant_id", ctx.tenantId)
        .select()
        .single();
      if (error) {
        logger.error("agents.update failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      return data;
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", input.id)
        .eq("tenant_id", ctx.tenantId);
      if (error) {
        logger.error("agents.delete failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      return { ok: true };
    }),
});
