"use client";

import {
  Shield,
  Zap,
  GitBranch,
  BarChart3,
  Key,
  Server,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "Multi-tenant by default",
    description:
      "Every entity scoped by tenant. Row Level Security and application-level checks. No cross-tenant access.",
  },
  {
    icon: Zap,
    title: "Async execution",
    description:
      "Agents run in isolated workers (Cloudflare / Fly.io), not in Vercel. Queues for reliability and retries.",
  },
  {
    icon: GitBranch,
    title: "Agent registry",
    description:
      "Register, version, and manage agents. Upload configs and code. Invoke via public REST API.",
  },
  {
    icon: BarChart3,
    title: "Realtime status & logs",
    description:
      "Stream invocation status and logs. Poll or subscribe—built for observability and debugging.",
  },
  {
    icon: Key,
    title: "API keys & JWT",
    description:
      "Programmatic access via API keys. Web UI via Supabase Auth. No embedded secrets.",
  },
  {
    icon: Server,
    title: "Production-ready",
    description:
      "Structured logs, OpenTelemetry-compatible tracing, configurable limits per tenant, safe error responses.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border/50 bg-background py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for production
          </h2>
          <p className="mx-auto max-w-2xl text-foreground/90 leading-relaxed">
            Secure, scalable, and observable. No internal-only assumptions—customer-facing grade.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="h-full border-border/50 bg-card/50 transition-colors hover:border-border hover:bg-card"
            >
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-foreground">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
