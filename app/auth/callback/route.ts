import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Supabase Auth callback — gère :
 * - Magic link (signInWithOtp)
 * - Password reset (type=recovery)
 * - OAuth (futur)
 *
 * Après échange du code → smart routing vers le bon portail par rôle.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/partner";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Auth error from Supabase (e.g. expired link)
  if (errorParam) {
    const msg = errorDescription ?? errorParam;
    return NextResponse.redirect(
      `${origin}/login?error=link_expired&message=${encodeURIComponent(msg)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&message=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // Recovery flow → redirect to update password form
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/update`);
  }

  // Smart routing by role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // 1. Admin check
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (adminRole) {
    return NextResponse.redirect(`${origin}/admin`);
  }

  // 2. Partner check
  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (partner) {
    return NextResponse.redirect(`${origin}/partner`);
  }

  // 3. Driver check
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (driver) {
    return NextResponse.redirect(`${origin}/driver`);
  }

  // Fallback — respect `next` param if it starts with /
  const safeNext = next.startsWith("/") ? next : "/partner";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
