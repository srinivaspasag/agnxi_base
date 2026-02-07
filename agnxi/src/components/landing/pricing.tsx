"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const included = [
  "Multi-tenant workspaces",
  "Agent registry & versioning",
  "Public REST API & API keys",
  "Async execution (queues)",
  "Realtime status & logs",
  "Configurable limits per tenant",
  "Row Level Security (RLS)",
  "Structured logging & tracing",
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border/50 bg-background py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent
          </h2>
          <p className="mx-auto max-w-2xl text-foreground/90 leading-relaxed">
            Start with a workspace, register agents, and invoke via API. Limits configurable per tenant.
          </p>
        </div>
        <div className="mx-auto max-w-md">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Platform</CardTitle>
              <CardDescription>
                Everything you need to host and run agents at scale. Self-service signup, no manual provisioning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {included.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full" asChild>
                <Link href="/login">Get started</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
