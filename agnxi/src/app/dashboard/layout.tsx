import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="font-semibold text-foreground">
            Agnxi
          </Link>
          <nav className="flex gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Agents
            </Link>
            <Link
              href="/dashboard/invocations"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Invocations
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
