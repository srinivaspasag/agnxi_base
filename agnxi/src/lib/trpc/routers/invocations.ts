import { z } from "zod";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const invocationsRouter = router({
  list: tenantProcedure
    .input(
      z
        .object({
          agentId: z.string().uuid().optional(),
          status: z.enum(["queued", "running", "succeeded", "failed", "canceled", "timeout"]).optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().datetime().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const limit = input?.limit ?? 20;
      let q = supabase
        .from("agent_invocations")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (input?.agentId) q = q.eq("agent_id", input.agentId);
      if (input?.status) q = q.eq("status", input.status);
      if (input?.cursor) q = q.lt("created_at", input.cursor);
      const { data, error } = await q;
      if (error) {
        logger.error("invocations.list failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      const nextCursor = data.length > limit ? data[limit - 1]?.created_at : undefined;
      const items = data.slice(0, limit);
      return { items, nextCursor };
    }),

  getByExternalId: tenantProcedure
    .input(z.object({ externalId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const { data, error } = await supabase
        .from("agent_invocations")
        .select("*, agent:agents(id, name, slug)")
        .eq("tenant_id", ctx.tenantId)
        .eq("external_id", input.externalId)
        .single();
      if (error || !data) {
        if (error?.code === "PGRST116") return null;
        throw new Error(error?.message ?? "Not found");
      }
      return data;
    }),

  getLogs: tenantProcedure
    .input(z.object({ invocationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const { data: inv } = await supabase
        .from("agent_invocations")
        .select("id")
        .eq("id", input.invocationId)
        .eq("tenant_id", ctx.tenantId)
        .single();
      if (!inv) return null;
      const { data, error } = await supabase
        .from("agent_invocation_logs")
        .select("*")
        .eq("invocation_id", input.invocationId)
        .order("seq", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    }),
});
