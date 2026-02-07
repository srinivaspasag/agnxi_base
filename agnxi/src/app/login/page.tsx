"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithOAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">Sign in to Agnxi</CardTitle>
          <CardDescription>
            Use your provider to sign in. For API-only access, create an API key from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => signInWithOAuth("github")}
          >
            Sign in with GitHub
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            ← Back to home
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
