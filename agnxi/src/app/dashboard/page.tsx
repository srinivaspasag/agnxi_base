"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: agents, isLoading, error } = trpc.agents.list.useQuery({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading agents…</p>
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register and manage agents. Invoke via API or dashboard.
        </p>
      </div>
      {!agents?.length ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">No agents yet</CardTitle>
            <CardDescription>
              Create an agent from Settings or via the public API. Then activate it to accept invocations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/api-docs">View API docs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {agents.map((a) => (
            <li key={a.id}>
              <Card className="border-border bg-card transition-colors hover:border-border/80">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Link
                      href={`/dashboard/agents/${a.slug}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {a.name}
                    </Link>
                    <span className="ml-2 text-sm text-muted-foreground">/{a.slug}</span>
                  </div>
                  <span className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground">
                    {a.status}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
