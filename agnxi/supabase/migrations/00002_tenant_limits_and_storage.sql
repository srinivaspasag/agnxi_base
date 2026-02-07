-- Tenant limits: stored in DB (tenant.settings.limits), enforced at runtime.
-- Platform defaults come from environment; per-tenant overrides in settings.
-- No hardcoded tenant IDs or limits in application code.

-- settings.limits schema (documented; enforced in app):
-- {
--   "max_agents": number,
--   "max_concurrent_invocations": number,
--   "invocation_timeout_sec": number,
--   "max_request_body_bytes": number,
--   "max_storage_mb": number,
--   "max_api_keys": number
-- }

-- Storage: create bucket "agent-artifacts" in Supabase Dashboard (Storage)
-- with private access. Path format: {tenant_id}/{agent_id}/{filename}.
-- App uses service role for uploads and validates tenant from auth; no RLS required for server-side uploads.
-- Optional: add RLS on storage.objects for direct client uploads scoped by tenant_id in path.
