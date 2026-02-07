# agnxi Architecture Rules

**Prefer explicit, boring, scalable designs over clever ones.**

## DO NOT

### 1. Put business logic in React components
- Components: presentation only. No validation, no data transformation, no direct DB/API calls beyond tRPC hooks or simple fetch for UI state.
- Business logic lives in: **tRPC procedures** (`src/lib/trpc/routers/*`), **API route handlers** (`src/app/api/**`), or **lib modules** (`src/lib/*`).
- Example: auth sign-in → call `lib/auth.ts` from the component; component only wires the button to the function.

### 2. Run agents inside Next.js server actions or API routes
- Agent **execution** happens only in **external runtimes** (Cloudflare Workers, Fly.io) via `AGENT_WORKER_URL`.
- Next.js: **enqueue** invocations (write to DB, publish to QStash); **never** execute agent code in Vercel/serverless or in server actions.
- Worker route `POST /api/worker/invoke`: updates status and **calls** `AGENT_WORKER_URL`; it does not run user code.

### 3. Use Express.js
- Use **Next.js App Router** and **Route Handlers** only. No Express server or middleware.

### 4. Assume long-lived server memory
- No in-memory caches, no module-level mutable state that assumes the process lives forever.
- State: **database** (Supabase) or **external** (Upstash Redis/QStash). Each request is stateless.

### 5. Use blocking execution models
- Agent invocations: **async, non-blocking**. Create row → enqueue → return. No `await` on agent completion in the request path.
- Worker: call external agent URL with timeout; do not block on long-running work inside Next.js.

### 6. Mix tenant data in queries
- **Every** query that reads or writes tenant-scoped data must be scoped by `tenant_id` (or equivalent) in the same request.
- Resolve tenant from: JWT (user → tenant_members) or API key (api_keys.tenant_id). Never join across tenants or omit tenant filter.

### 7. Skip RLS policies
- All tenant-scoped tables have **RLS enabled** and policies that restrict by `current_user_tenant_ids()` (or equivalent).
- **Service role** is used only server-side, after auth; every operation still **scopes by tenant_id** in application code. RLS is a second layer for direct client access.

## Where things live

| Concern            | Location |
|--------------------|----------|
| API (REST)         | `src/app/api/v1/**` |
| tRPC (internal API)| `src/lib/trpc/routers/*` |
| Auth / tenant      | `src/lib/get-tenant.ts`, `src/lib/api-key.ts`, `src/lib/supabase/*` |
| Limits             | `src/lib/limits.ts` |
| Queue              | `src/lib/queue.ts` (enqueue only) |
| Agent execution    | External: `AGENT_WORKER_URL` (not in repo) |
| UI only            | `src/app/**/page.tsx`, `src/components/*` |
