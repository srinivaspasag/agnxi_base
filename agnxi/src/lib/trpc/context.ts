import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/api-key";

/**
 * Tenant-scoped context for every request.
 * tenantId is set after validating JWT (user) or API key.
 */
export interface TenantContext {
  tenantId: string | null;
  userId: string | null;
  apiKeyId: string | null;
  isApiKey: boolean;
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<TenantContext> {
  const authHeader = opts.req.headers.get("authorization");
  const apiKeyAuth = await resolveApiKey(authHeader);
  if (apiKeyAuth) {
    return {
      tenantId: apiKeyAuth.tenantId,
      userId: null,
      apiKeyId: apiKeyAuth.apiKeyId,
      isApiKey: true,
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: member } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    return {
      tenantId: member?.tenant_id ?? null,
      userId: user.id,
      apiKeyId: null,
      isApiKey: false,
    };
  }
  return {
    tenantId: null,
    userId: null,
    apiKeyId: null,
    isApiKey: false,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
