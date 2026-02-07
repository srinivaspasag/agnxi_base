# agnxi

Production-grade, multi-tenant agent hosting platform. **Fully externalized**: external customers sign up without manual provisioning, create agents, upload code/configs, invoke via public REST APIs, and access logs and status programmatically.

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for rules: no business logic in components, no agent execution in Next.js, no Express, no long-lived server memory, no blocking execution, no mixing tenant data, no skipping RLS. Prefer explicit, boring, scalable designs.

## Constraints

- **Public, customer-accessible**: All APIs are safe for external use. No internal-only trust.
- **Multi-tenant by default**: Every request is scoped by `tenant_id`; no cross-tenant access. No single-organization assumption.
- **No hardcoded secrets or tenants**: All configuration via environment variables or database. Limits (timeouts, concurrency, file size) are configurable per tenant and enforced at runtime.

## Tech stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **shadcn/ui**
- **Supabase**: Postgres, Auth, Realtime, Storage
- **Cloudflare Workers / Fly.io**: Agent execution (not Vercel serverless)
- **Upstash Redis / QStash**: Queues and optional cache
- **Zod**: Validation
- **tRPC**: Type-safe internal APIs
- **OpenTelemetry-compatible**: Structured logging

## Architecture

- **Web UI**: Next.js Server Actions + tRPC; Supabase Auth (JWT).
- **Agent execution**: Async, non-blocking; invocations are queued (QStash), then processed by a worker that calls your agent runtime (Cloudflare Workers or Fly.io).
- **Public API**: REST at `/api/v1/*`; auth via API key or JWT; all scoped by tenant.

## Database

1. Create a Supabase project and run migrations:

```bash
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npx supabase link --project-ref YOUR_REF
npm run db:push
```

2. Optional: generate TypeScript types from DB:

```bash
npm run db:generate
```

## Deploy on Vercel

Configuration is fully externalized; no hardcoded secrets or URLs.

1. **Verify build locally**: Run `npm run build` and fix any errors before connecting to Vercel.
2. **Connect** the repo in [Vercel](https://vercel.com) and deploy.
3. **Set environment variables** in Vercel → Project → Settings → Environment Variables:
   - **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - **Optional:** `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `AGENT_WORKER_URL`, `AGENT_WORKER_SECRET`, `LIMITS_*`, `LOG_LEVEL`
4. **Supabase:** Run migrations, set Auth redirect URLs to your Vercel URL (e.g. `https://your-app.vercel.app/auth/callback`).

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for step-by-step deployment and all env vars.

**Note:** Vercel sets `VERCEL_URL` automatically. The app uses it for the worker callback URL when enqueueing invocations; you do not need to set `NEXT_PUBLIC_APP_URL` in production.

## Running locally

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard (requires auth)
- API docs: http://localhost:3000/api-docs

## Public API (external customers)

**Auth**: Supabase Auth (JWT) for browser; `Authorization: Bearer agnxi_key_<key>` for programmatic access. No internal-only auth.

**Self-service (no manual provisioning)**  
- **Create workspace**: `POST /api/v1/workspaces` with `{ "name": "...", "slug": "..." }` — allowed only when the user has no tenant (first signup).

**Agents**  
- **List**: `GET /api/v1/agents?status=active&limit=20`
- **Create**: `POST /api/v1/agents` with `{ "name", "slug", "description?", "runtime?", "config?" }`
- **Upload code/config**: `POST /api/v1/agents/:slug/artifacts` (body = file). Download: `GET /api/v1/agents/:slug/artifacts?file=filename` (or `Accept: application/json` for signed URL).
- **Invoke**: `POST /api/v1/agents/:slug/invoke` with `{ "input": { ... }, "metadata": {} }`. Returns `invocation_id`.

**Execution status & logs**  
- **Get result**: `GET /api/v1/invocations/:id` (id = external id, e.g. `agnxi_inv_...`).
- **Get logs**: `GET /api/v1/invocations/:id/logs`

**API keys (programmatic)**  
- **List**: `GET /api/v1/api-keys`
- **Create**: `POST /api/v1/api-keys` with `{ "name": "..." }` — returns `key` once; store securely.

**Limits**  
- **Get limits**: `GET /api/v1/limits` — returns current tenant limits (from DB + env). All limits (timeouts, concurrency, body size, storage) are configurable per tenant and enforced at runtime.

All responses are tenant-scoped. No cross-tenant data is ever returned.

## Agent lifecycle

1. **Register**: Create agent via tRPC `agents.create` or Dashboard; set `status` to `active`.
2. **Invoke**: Client calls `POST /api/v1/agents/:slug/invoke`; server creates row in `agent_invocations` (status `queued`), enqueues to QStash, returns `invocation_id`.
3. **Run**: Worker endpoint `POST /api/worker/invoke` is called by QStash; server sets status `running`, calls `AGENT_WORKER_URL` with payload; on response, sets `succeeded`/`failed` and stores `output_payload`/`error_message`.
4. **Logs**: Agent runtime can POST logs to an internal endpoint (or worker appends to `agent_invocation_logs`); clients read via `GET /api/v1/invocations/:id/logs`.
5. **Result**: Clients poll `GET /api/v1/invocations/:id` or use Supabase Realtime on `agent_invocations` for live status.

## Limits (configurable, enforced)

Stored in DB (`tenants.settings.limits`) with platform defaults from env. Enforced at runtime.

| Env default | Description |
|------------|-------------|
| `LIMITS_MAX_AGENTS` | Max agents per tenant |
| `LIMITS_MAX_CONCURRENT_INVOCATIONS` | Max queued+running invocations |
| `LIMITS_INVOCATION_TIMEOUT_SEC` | Worker timeout per invocation |
| `LIMITS_MAX_REQUEST_BODY_BYTES` | Max request body (invoke, upload) |
| `LIMITS_MAX_STORAGE_MB` | Max storage per tenant (artifacts) |
| `LIMITS_MAX_API_KEYS` | Max API keys per tenant |

Per-tenant overrides: update `tenants.settings` JSON with a `limits` object. No hardcoded limits in code.

## Security

- **RLS**: All Supabase tables and storage use Row Level Security; access scoped by tenant. No cross-tenant access.
- **Service role**: Used only server-side after validating API key or JWT; never exposed to the client. No embedded secrets.
- **API keys**: Stored as SHA-256 hash; only prefix shown in UI.

## Internal vs external

- **External**: REST `/api/v1/*` and optional public discovery; auth = API key or JWT.
- **Internal**: tRPC `/api/trpc` for Dashboard and Server Actions; same tenant context, no separate “admin” backdoor.
