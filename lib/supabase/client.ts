"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client (browser) — utilisé dans les Client Components
 * Auth state synchronisé avec les cookies via @supabase/ssr
 *
 * NEXT_PUBLIC_COOKIE_DOMAIN=.foreas.xyz en prod → session cookie cross-subdomain
 * → login sur foreas.xyz reconnu sur partners.foreas.xyz et vice-versa.
 */
export function createClient() {
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain
      ? {
          cookieOptions: {
            domain: cookieDomain,
            path: "/",
            sameSite: "lax" as const,
            secure: true,
          },
        }
      : undefined
  );
}

// Singleton export for convenience
export const supabase = createClient();
