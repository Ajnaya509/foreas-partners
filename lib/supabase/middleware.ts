import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase middleware client — utilisé dans middleware.ts
 * Refresh la session côté serveur et synchronise les cookies de réponse.
 *
 * Cross-domain auth sync (7.4.4) :
 * En production, NEXT_PUBLIC_COOKIE_DOMAIN=.foreas.xyz permet de partager
 * la session entre foreas.xyz et partners.foreas.xyz (même projet Supabase).
 * En dev local, laisser vide → cookies scoped à localhost uniquement.
 */

/** ".foreas.xyz" en prod, undefined en local → cookies cross-subdomain */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Partage cross-subdomain en prod (foreas.xyz ↔ partners.foreas.xyz)
              ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
            })
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/handoff") ||
    pathname === "/";
  const isApiRoute = pathname.startsWith("/api");

  // Si pas d'utilisateur et route protégée → redirect /login
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
