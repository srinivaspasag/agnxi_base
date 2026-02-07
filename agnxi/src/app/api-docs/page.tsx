import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Agnxi Public API
        </h1>
        <p className="text-muted-foreground mb-8">
          All requests must be authenticated with Supabase JWT (browser) or an API key (programmatic).
          Every response is scoped to the tenant of the authenticated identity.
        </p>

        <Card className="mb-6 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Authentication</CardTitle>
            <CardDescription>Use JWT for the web app or an API key for programmatic access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Browser: Supabase Auth; ensure the user is a member of a tenant.</p>
            <p>API: <code className="rounded bg-surface px-1.5 py-0.5 text-foreground">Authorization: Bearer agnxi_key_&lt;your_key&gt;</code></p>
          </CardContent>
        </Card>

        <Card className="mb-6 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Endpoints</CardTitle>
            <CardDescription>REST API for agents, invocations, and logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-sm">
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <p className="font-medium text-primary">GET /api/v1/agents</p>
              <p className="mt-1 text-muted-foreground">List agents (optional ?status=active&limit=20)</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <p className="font-medium text-primary">POST /api/v1/agents/:slug/invoke</p>
              <p className="mt-1 text-muted-foreground">Body: {`{ "input": { ... }, "metadata": {} }`}. Returns invocation_id (external_id).</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <p className="font-medium text-primary">GET /api/v1/invocations/:id</p>
              <p className="mt-1 text-muted-foreground">Get invocation status and result (id = external_id, e.g. agnxi_inv_xxx).</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <p className="font-medium text-primary">GET /api/v1/invocations/:id/logs</p>
              <p className="mt-1 text-muted-foreground">Get logs for an invocation.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Example: Invoke and poll</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 text-xs text-muted-foreground">
{`# Invoke
curl -X POST https://your-app.com/api/v1/agents/my-agent/invoke \\
  -H "Authorization: Bearer agnxi_key_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"query": "hello"}}'

# Response: {"invocation_id":"agnxi_inv_...","status":"queued",...}

# Poll result
curl -H "Authorization: Bearer agnxi_key_YOUR_KEY" \\
  https://your-app.com/api/v1/invocations/agnxi_inv_...
`}
            </pre>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground mb-6">
          Internal (dashboard) APIs use tRPC at <code className="rounded bg-surface px-1.5 py-0.5 text-foreground">/api/trpc</code> with the same tenant context.
        </p>
        <Button variant="ghost" asChild>
          <Link href="/">← Home</Link>
        </Button>
      </div>
    </main>
  );
}
