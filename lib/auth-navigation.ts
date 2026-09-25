export type PortalRole = "admin" | "partner" | "driver";
type AuthFailure = { code?: string; message?: string; status?: number };

/** Only a normalized local destination may survive an authentication round trip. */
export function safeAuthNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/partner";
  try {
    const url = new URL(value, "https://auth.invalid");
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== "https://auth.invalid" || decodedPath.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decodedPath)) return "/partner";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/partner";
  }
}

export function portalRole(next: string): PortalRole | null {
  const pathname = new URL(safeAuthNext(next), "https://auth.invalid").pathname;
  for (const role of ["admin", "partner", "driver"] as const) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) return role;
  }
  return null;
}

export function destinationForRole(next: string, role: PortalRole): string {
  const safeNext = safeAuthNext(next);
  return portalRole(safeNext) === role ? safeNext : `/${role}`;
}

export function authPath(path: "/login" | "/auth/reset" | "/auth/callback" | "/auth/update", next: string, extra: Record<string, string> = {}): string {
  const safeNext = safeAuthNext(next);
  const query = new URLSearchParams({ ...extra, next: safeNext });
  const role = portalRole(safeNext);
  if (role) query.set("role", role);
  return `${path}?${query.toString()}`;
}

export function callbackFailure(error: AuthFailure): "different_browser" | "link_expired" | "auth_failed" {
  if (error.code === "otp_expired" || /expired|already used/i.test(error.message ?? "")) return "link_expired";
  if (["bad_code_verifier", "flow_state_not_found"].includes(error.code ?? "") || /code.?verifier|flow state.*not found/i.test(error.message ?? "")) return "different_browser";
  return "auth_failed";
}

export function loginErrorMessage(code: string | null, legacyMessage: string | null = null): string | null {
  if (!code) return null;
  const kind = code === "auth_failed" ? callbackFailure({ message: legacyMessage ?? "" }) : code;
  if (kind === "different_browser") return "Ce lien ne peut pas terminer la connexion dans ce navigateur. Ouvre le dernier lien dans le navigateur où tu l’as demandé, ou utilise ton mot de passe.";
  if (kind === "link_expired" || kind === "otp_expired") return "Ce lien a expiré ou a déjà été utilisé. Utilise ton mot de passe, ou demande un nouveau lien depuis ce navigateur.";
  if (kind === "access_denied") return "Accès refusé. Ce compte n’a pas les permissions nécessaires pour cette section.";
  if (kind === "no_code") return "Le lien de connexion est incomplet. Ouvre le dernier lien reçu, ou utilise ton mot de passe.";
  return "La connexion n’a pas abouti. Utilise ton mot de passe, ou demande un nouveau lien depuis ce navigateur.";
}

export function emailErrorMessage(error: AuthFailure): string {
  if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code ?? "") || /rate.?limit|too many requests/i.test(error.message ?? "")) {
    return "Trop de demandes de mail. L’envoi est temporairement limité. Utilise ton mot de passe ou réessaie plus tard.";
  }
  return "Le mail n’a pas pu être envoyé. Vérifie ton adresse ou utilise ton mot de passe.";
}
