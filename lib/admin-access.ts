import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAccess = {
  status: "allowed" | "mfa_required" | "forbidden" | "unauthenticated" | "unavailable";
  userId: string | null;
  email: string | null;
};

/** Aucune confiance dans les cookies décodés seuls ni dans un rôle envoyé par le navigateur. */
export async function readAdminAccess(supabase: SupabaseClient, timeoutMs = 15000): Promise<AdminAccess> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([readAccess(supabase, abort.signal), new Promise<AdminAccess>(resolve => {
      timer = setTimeout(() => { abort.abort(); resolve({ status: "unavailable", userId: null, email: null }); }, timeoutMs);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function readAccess(supabase: SupabaseClient, signal: AbortSignal): Promise<AdminAccess> {
  const refus = (status: AdminAccess["status"], userId: string | null = null): AdminAccess => ({ status, userId, email: null });
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    signal.throwIfAborted();
    const token = sessionData?.session?.access_token;
    if (sessionError || !token) return refus("unauthenticated");

    // Le même jeton fournit l'identité et le niveau signé. getUser reste une
    // vérification distante du compte, même si getClaims valide localement.
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    signal.throwIfAborted();
    const user = userData?.user;
    if (userError || !user?.id) return refus("unauthenticated");
    const { data: signed, error: claimsError } = await supabase.auth.getClaims(token);
    signal.throwIfAborted();
    if (claimsError || !signed?.claims || signed.claims.sub !== user.id) return refus("unauthenticated");

    // La politique de lecture de sa propre ligne reste disponible à aal1.
    // L'ambiguïté, la révocation et toute erreur ferment la demande.
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id, role, is_active, revoked_at")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .eq("is_active", true)
      .is("revoked_at", null)
      .abortSignal(signal)
      .maybeSingle();
    if (roleError) return refus("unavailable", user.id);
    if (!role || role.user_id !== user.id || !["admin", "super_admin"].includes(role.role) || role.is_active !== true || role.revoked_at !== null) {
      return refus("forbidden", user.id);
    }
    return { status: signed.claims.aal === "aal2" ? "allowed" : "mfa_required", userId: user.id, email: user.email ?? null };
  } catch {
    return refus("unavailable");
  }
}
