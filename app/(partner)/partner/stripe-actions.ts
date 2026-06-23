"use server";

import { railwayPost } from "@/lib/api/railway";
import { getCurrentPartner } from "@/lib/queries/partner";

export type ConnectLinkResult = {
  ok: boolean;
  url?: string;
  /** true si l'endpoint Railway Connect n'est pas encore livré (404/501). */
  backendPending?: boolean;
  error?: string;
};

/**
 * Génère le lien d'onboarding Stripe Connect Express pour le partenaire connecté.
 * Railway crée (ou réutilise) le compte Express, stocke `stripe_account_id`, et
 * renvoie l'URL d'onboarding. Le partenaire est redirigé dessus, puis revient
 * sur le dashboard (return_url géré côté Railway).
 *
 * Le service-role (création compte Stripe) vit côté Railway → on passe par lui.
 */
export async function getPartnerConnectLink(): Promise<ConnectLinkResult> {
  const partner = await getCurrentPartner();
  if (!partner) return { ok: false, error: "Session expirée — reconnecte-toi." };

  try {
    const res = await railwayPost<{ ok?: boolean; url?: string; onboarding_url?: string }>(
      `/api/partner/stripe/connect-link`,
      { return_path: "/partner" }
    );
    const url = res.url ?? res.onboarding_url;
    if (!url) return { ok: false, error: "Lien Stripe indisponible pour le moment." };
    return { ok: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (msg.includes("→ 404") || msg.includes("→ 501")) return { ok: false, backendPending: true };
    return { ok: false, error: msg };
  }
}
