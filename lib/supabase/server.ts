import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client (server) — utilisé dans les Server Components,
 * Server Actions, et Route Handlers.
 *
 * Auth state lu depuis les cookies du request, synchronisé via Set-Cookie.
 * NEXT_PUBLIC_COOKIE_DOMAIN=.foreas.xyz en prod → session cross-subdomain.
 */

const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
              })
            );
          } catch {
            // Server Component context — silently ignore.
            // Set-Cookie sera géré par le middleware.
          }
        },
      },
    }
  );
}
