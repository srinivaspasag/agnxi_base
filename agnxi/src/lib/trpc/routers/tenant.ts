import { z } from "zod";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateApiKey } from "@/lib/ids";
import { checkMaxApiKeys } from "@/lib/limits";

export const tenantRouter = router({
  get: tenantProcedure.query(async ({ ctx }) => {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", ctx.tenantId)
      .single();
    if (error || !data) {
      logger.error("tenant.get failed", { tenant_id: ctx.tenantId, error: error?.message });
      throw new Error(error?.message ?? "Tenant not found");
    }
    return data;
  }),

  listApiKeys: tenantProcedure.query(async ({ ctx }) => {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false });
    if (error) {
      logger.error("tenant.listApiKeys failed", { tenant_id: ctx.tenantId, error: error.message });
      throw new Error(error.message);
    }
    return data;
  }),

  createApiKey: tenantProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const limitCheck = await checkMaxApiKeys(ctx.tenantId);
      if (!limitCheck.allowed) {
        throw new Error(`API key limit reached (${limitCheck.current}/${limitCheck.limit}).`);
      }
      const supabase = createSupabaseServiceClient();
      const { raw, prefix, hash } = generateApiKey();
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          tenant_id: ctx.tenantId,
          name: input.name,
          key_prefix: prefix,
          key_hash: hash,
        })
        .select("id, name, key_prefix, created_at")
        .single();
      if (error) {
        logger.error("tenant.createApiKey failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      return { ...data, rawKey: raw };
    }),

  revokeApiKey: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createSupabaseServiceClient();
      const { error } = await supabase
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("tenant_id", ctx.tenantId);
      if (error) {
        logger.error("tenant.revokeApiKey failed", { tenant_id: ctx.tenantId, error: error.message });
        throw new Error(error.message);
      }
      return { ok: true };
    }),
});
