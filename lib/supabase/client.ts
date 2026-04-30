"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client (browser) — utilisé dans les Client Components
 * Auth state synchronisé avec les cookies via @supabase/ssr
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton export for convenience
export const supabase = createClient();
