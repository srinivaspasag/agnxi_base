/**
 * Auth helpers for UI. Business logic lives here; components only call these.
 * No business logic in React components.
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function getSignInWithOAuthRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithOAuth(provider: "github" | "google" = "github") {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getSignInWithOAuthRedirectUrl() },
  });
}
