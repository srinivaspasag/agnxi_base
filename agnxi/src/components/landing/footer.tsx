import Link from "next/link";
import { AgnxiLogo } from "@/components/brand/logo";

const links = [
  { label: "Docs", href: "/api-docs" },
  { label: "Sign in", href: "/login" },
  { label: "Dashboard", href: "/dashboard" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background py-12 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <AgnxiLogo className="text-base" showIcon={false} />
        <nav className="flex gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-muted-foreground">
        Production-grade · Multi-tenant · Secure by design
      </p>
    </footer>
  );
}
