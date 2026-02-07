# Deploy agnxi on Vercel

All configuration is externalized via environment variables. No hardcoded secrets or URLs.

## 1. Connect repository

- Push the agnxi repo to GitHub/GitLab/Bitbucket.
- In [Vercel](https://vercel.com), **Add New Project** and import the repository.
- Vercel will detect Next.js and use the default build command and output directory.

## 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Use the same names; no prefixes.

### Required (app and auth)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | `eyJ...` |

### Optional (queues and worker)

| Variable | Description | When to set |
|----------|-------------|-------------|
| `QSTASH_TOKEN` | Upstash QStash token | When using QStash for invocation queue |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash signing key (verify webhooks) | When using QStash |
| `QSTASH_NEXT_SIGNING_KEY` | QStash next signing key | When using QStash |
| `AGENT_WORKER_URL` | Your agent runtime URL (e.g. Cloudflare Worker) | When running agents externally |
| `AGENT_WORKER_SECRET` | Secret for worker endpoint auth | When `AGENT_WORKER_URL` is set |

### Optional (limits and app URL)

| Variable | Description | Default on Vercel |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL for callbacks/links | Not needed; `VERCEL_URL` is used for worker callback |
| `LIMITS_MAX_AGENTS` | Max agents per tenant | `50` |
| `LIMITS_MAX_CONCURRENT_INVOCATIONS` | Max queued+running invocations | `10` |
| `LIMITS_INVOCATION_TIMEOUT_SEC` | Worker timeout (seconds) | `300` |
| `LIMITS_MAX_REQUEST_BODY_BYTES` | Max request body size | `1048576` |
| `LIMITS_MAX_STORAGE_MB` | Max storage per tenant (MB) | `100` |
| `LIMITS_MAX_API_KEYS` | Max API keys per tenant | `20` |
| `LOG_LEVEL` | Log level | `info` |

**Note:** Vercel sets `VERCEL_URL` automatically. The app uses it for the worker callback URL when enqueueing invocations, so you do not need to set `NEXT_PUBLIC_APP_URL` for deployment.

## 3. Supabase setup

1. Create a [Supabase](https://supabase.com) project.
2. In **SQL Editor**, run the migrations under `supabase/migrations/` in order (`00001_initial_schema.sql`, then `00002_tenant_limits_and_storage.sql`).
3. In **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (e.g. `https://agnxi.vercel.app`) and add the same under **Redirect URLs** (e.g. `https://agnxi.vercel.app/auth/callback`).
4. Create the **agent-artifacts** storage bucket in **Storage** (private) if you use artifact uploads.
5. Copy the project URL and anon/service keys into the Vercel env vars above.

## 4. Deploy

- **Deploy** from the Vercel dashboard, or push to the connected branch to trigger a deploy.
- Build command: `npm run build` (or `next build`).
- Install command: `npm install` (or `pnpm install` / `yarn` if you use a lockfile).

## 5. Post-deploy

- Open the deployed URL and confirm the landing page loads.
- Sign up / sign in (Supabase Auth); create a workspace if prompted.
- Create an API key from the dashboard for programmatic access.
- If you use QStash: in the QStash dashboard, set the destination URL to `https://<your-vercel-url>/api/worker/invoke` and use the same signing key as `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`.

## Checklist

- [ ] All required env vars set in Vercel (Supabase URL + anon + service role).
- [ ] Supabase migrations applied.
- [ ] Supabase Auth redirect URLs include production URL and `/auth/callback`.
- [ ] Optional: QStash token and signing keys if using queues.
- [ ] Optional: `AGENT_WORKER_URL` and `AGENT_WORKER_SECRET` if running agents externally.

No code changes are required for externalizing per environment; configuration is entirely via environment variables and Supabase.

## Vercel production checklist

- **Build**: Run `npm run build` locally or let Vercel run it on deploy. Fix any TypeScript or lint errors before pushing.
- **Required env**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` must be set or the app will fail at runtime (auth/DB).
- **Secrets**: Never commit `.env` or `.env.local`. All secrets are read via Vercel Environment Variables.
- **Agent execution**: Runs outside Vercel (Cloudflare Workers / Fly.io). Set `AGENT_WORKER_URL` and `AGENT_WORKER_SECRET` when using external runners.
- **Worker callback**: Vercel sets `VERCEL_URL`; the app uses it for the QStash callback URL. Do not set `NEXT_PUBLIC_APP_URL` unless you need a custom domain for callbacks.
