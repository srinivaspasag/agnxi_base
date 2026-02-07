-- agnxi: Multi-tenant agent hosting platform
-- All tables are tenant-scoped. RLS enforces isolation.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TENANTS & MEMBERSHIP
-- =============================================================================

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settings JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);

CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);

-- =============================================================================
-- API KEYS (for programmatic access; scoped by tenant)
-- =============================================================================

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,  -- first 8 chars of key for display (e.g. "agnxi_xx")
  key_hash TEXT NOT NULL,   -- hashed full key; never store plain key
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id);

-- =============================================================================
-- AGENTS (customer-registered agents; one per tenant)
-- =============================================================================

CREATE TYPE public.agent_status AS ENUM (
  'draft',
  'active',
  'paused',
  'archived'
);

CREATE TYPE public.agent_runtime AS ENUM (
  'cloudflare_worker',
  'fly_io'
);

CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status public.agent_status NOT NULL DEFAULT 'draft',
  runtime public.agent_runtime NOT NULL DEFAULT 'cloudflare_worker',
  config JSONB NOT NULL DEFAULT '{}',  -- endpoint URL, env, secrets refs, etc.
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_agents_tenant ON public.agents(tenant_id);
CREATE INDEX idx_agents_tenant_slug ON public.agents(tenant_id, slug);
CREATE INDEX idx_agents_status ON public.agents(tenant_id, status) WHERE status = 'active';

-- =============================================================================
-- INVOCATIONS (async execution; queued → running → completed/failed)
-- =============================================================================

CREATE TYPE public.invocation_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
  'timeout'
);

CREATE TABLE public.agent_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL UNIQUE,  -- public id for API (e.g. agnxi_inv_xxx)
  status public.invocation_status NOT NULL DEFAULT 'queued',
  input_payload JSONB NOT NULL DEFAULT '{}',
  output_payload JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('user', 'api_key')),
  created_by_id UUID,  -- user_id or api_key_id
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_invocations_tenant ON public.agent_invocations(tenant_id);
CREATE INDEX idx_invocations_agent ON public.agent_invocations(agent_id);
CREATE INDEX idx_invocations_external_id ON public.agent_invocations(external_id);
CREATE INDEX idx_invocations_tenant_created ON public.agent_invocations(tenant_id, created_at DESC);
CREATE INDEX idx_invocations_status ON public.agent_invocations(tenant_id, status);

-- =============================================================================
-- INVOCATION LOGS (realtime / streaming; optional high volume)
-- =============================================================================

CREATE TABLE public.agent_invocation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invocation_id UUID NOT NULL REFERENCES public.agent_invocations(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invocation_id, seq)
);

CREATE INDEX idx_invocation_logs_invocation ON public.agent_invocation_logs(invocation_id);
CREATE INDEX idx_invocation_logs_tenant ON public.agent_invocation_logs(tenant_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Do not skip or disable RLS on tenant-scoped tables. Policies enforce tenant
-- isolation for direct client access; service role bypasses RLS but app code
-- must still scope every query by tenant_id.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_invocation_logs ENABLE ROW LEVEL SECURITY;

-- Helper: current user's tenant IDs (via tenant_members)
CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

-- Helper: current request tenant from JWT (set by app for API key or user context)
-- We use app-specific claim or header; for RLS we rely on tenant_members for users.
-- API key requests set tenant in JWT by backend after validating key.

-- Tenants: user can see tenants they are a member of
CREATE POLICY tenants_select_member ON public.tenants
  FOR SELECT USING (id IN (SELECT public.current_user_tenant_ids()));

CREATE POLICY tenants_insert_owner ON public.tenants
  FOR INSERT WITH CHECK (true);  -- first tenant creation; app creates member in same tx

CREATE POLICY tenants_update_member ON public.tenants
  FOR UPDATE USING (id IN (SELECT public.current_user_tenant_ids()));

-- Tenant members: only see members of own tenants
CREATE POLICY tenant_members_select ON public.tenant_members
  FOR SELECT USING (
    tenant_id IN (SELECT public.current_user_tenant_ids())
    OR user_id = auth.uid()
  );

CREATE POLICY tenant_members_insert ON public.tenant_members
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT public.current_user_tenant_ids())
  );

CREATE POLICY tenant_members_update ON public.tenant_members
  FOR UPDATE USING (tenant_id IN (SELECT public.current_user_tenant_ids()));

CREATE POLICY tenant_members_delete ON public.tenant_members
  FOR DELETE USING (tenant_id IN (SELECT public.current_user_tenant_ids()));

-- API keys: only own tenant's keys
CREATE POLICY api_keys_all ON public.api_keys
  FOR ALL USING (tenant_id IN (SELECT public.current_user_tenant_ids()));

-- Agents: only own tenant's agents
CREATE POLICY agents_all ON public.agents
  FOR ALL USING (tenant_id IN (SELECT public.current_user_tenant_ids()));

-- Invocations: only own tenant's invocations
CREATE POLICY invocations_all ON public.agent_invocations
  FOR ALL USING (tenant_id IN (SELECT public.current_user_tenant_ids()));

-- Invocation logs: only own tenant's logs
CREATE POLICY invocation_logs_all ON public.agent_invocation_logs
  FOR ALL USING (tenant_id IN (SELECT public.current_user_tenant_ids()));

-- =============================================================================
-- SERVICE ROLE / INTERNAL (bypass RLS for queue worker and backend)
-- =============================================================================
-- Workers and server-side code use Supabase service_role key and bypass RLS.
-- External API uses anon/key with JWT that includes tenant_id (set after API key
-- or user auth). So we need a way for authenticated API to pass tenant context.
-- We'll use custom JWT claims: app_metadata.tenant_id or similar set by our API
-- after validating API key. For now RLS is user-based; API key auth is handled
-- in app layer and then we use service role for DB or we add a separate
-- "api_key_tenant" policy that checks a custom claim. Simplest: external API
-- uses service role with tenant_id in context (server-side only), or we create
-- a short-lived JWT with tenant_id for Supabase client. Document: external
-- calls hit our Next.js API; we validate API key, then use service role client
-- scoped to that tenant_id for all DB operations. So RLS remains for direct
-- Supabase client from browser (user JWT). Done.

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================================================
-- REALTIME (broadcast invocation status for live monitoring)
-- =============================================================================

ALTER TABLE public.agent_invocations REPLICA IDENTITY FULL;
ALTER TABLE public.agent_invocation_logs REPLICA IDENTITY FULL;
