"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AgnxiLogo } from "@/components/brand/logo";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-baseline transition-opacity hover:opacity-90 md:mr-16"
          aria-label="Agnxi home"
        >
          <AgnxiLogo className="text-[1.5rem] leading-none" iconSize={26} />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/api-docs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileFocus={{ scale: 1.02 }}>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
