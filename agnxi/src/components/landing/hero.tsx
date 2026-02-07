"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center pt-24 pb-20 gradient-mesh">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-medium tracking-wide text-primary/90">
          Production-grade agent hosting
        </p>
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Secure, scalable
          <br />
          <span className="text-foreground">AI agent platform</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-foreground">
          Multi-tenant platform for registering agents, invoking via public APIs,
          and monitoring execution in real time. Built for production.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button size="lg" asChild className="min-w-[160px]">
              <Link href="/login">Get started</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button size="lg" variant="outline" asChild className="min-w-[160px]">
              <Link href="/api-docs">View API docs</Link>
            </Button>
          </motion.div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground tracking-wide">
          Production-grade · Multi-tenant · Secure by design
        </p>
        </div>
      </div>
    </section>
  );
}
