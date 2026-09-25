
import {safePortalNext} from '@/lib/partner/navigation';
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { authPath, callbackFailure, destinationForRole } from "@/lib/auth-navigation";

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
  const next = safePortalNext(searchParams.get("next"));
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Auth error from Supabase (e.g. expired link)
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}${authPath("/login", next, { error: callbackFailure({ code: searchParams.get("error_code") ?? errorParam, message: errorDescription ?? "" }) })}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${authPath("/login", next, { error: "no_code" })}`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}${authPath("/login", next, { error: callbackFailure(exchangeError) })}`
    );
  }

  // Smart routing by role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}${authPath("/login", next, { error: "auth_failed" })}`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}${authPath("/auth/update", next)}`);
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
    return NextResponse.redirect(`${origin}${destinationForRole(next, "admin")}`);
  }

  // A confirmed existing driver can complete a prepared partner admission.
  // The destination layout still verifies admission and creates no access from the URL.
  if (searchParams.has('next') && /^\/partner(\/|$)/.test(next)) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 2. Partner check
  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (partner) {
    return NextResponse.redirect(`${origin}${destinationForRole(next, "partner")}`);
  }

  // 3. Driver check
  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (driverError) {
    return NextResponse.redirect(`${origin}${authPath("/login", next, { error: "auth_failed" })}`);
  }
  if (driver) {
    return NextResponse.redirect(`${origin}${destinationForRole(next, "driver")}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
