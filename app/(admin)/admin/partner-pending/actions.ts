"use server";

import { railwayPatch, railwayPost } from "@/lib/api/railway";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function validatePartner(partnerId: string): Promise<{ ok: boolean; onboardingUrl?: string }> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const res = await railwayPatch<{ ok: boolean; onboarding_url?: string }>(
    `/api/admin/partners/${partnerId}/status`,
    { status: "active" }
  );
  revalidatePath("/admin/partner-pending");
  revalidatePath("/admin/partners");
  return { ok: res.ok, onboardingUrl: res.onboarding_url };
}

export async function refusePartner(partnerId: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  await railwayPatch(`/api/admin/partners/${partnerId}/status`, { status: "paused" });
  revalidatePath("/admin/partner-pending");
  revalidatePath("/admin/partners");
}

// ─── Candidatures site (table partner_applications) ─────────────────────────────

export type ApproveApplicationResult = {
  ok: boolean;
  referralCode?: string;
  onboardingUrl?: string;
  /** true si le backend Railway d'approbation n'est pas encore livré (404). */
  backendPending?: boolean;
  error?: string;
};

/**
 * Approuver une candidature du site.
 * Railway crée la ligne `partners` (+ referral_code unique + defaults), envoie
 * l'invitation mot de passe (service-role), et renvoie le lien Stripe Connect.
 * Le dashboard n'a pas le service-role → l'approbation DOIT passer par Railway.
 */
export async function approveApplication(applicationId: string): Promise<ApproveApplicationResult> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  try {
    const res = await railwayPost<{
      ok: boolean;
      referral_code?: string;
      onboarding_url?: string;
    }>(`/api/admin/partner-applications/${applicationId}/approve`);

    revalidatePath("/admin/partner-pending");
    revalidatePath("/admin/partners");
    return { ok: res.ok, referralCode: res.referral_code, onboardingUrl: res.onboarding_url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    // Endpoint pas encore livré côté Railway → message clair, pas de crash.
    if (msg.includes("→ 404") || msg.includes("→ 501")) {
      return { ok: false, backendPending: true };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Refuser une candidature. Simple update Supabase (RLS admin) — aucune
 * création, donc pas besoin de Railway : ça marche immédiatement.
 */
export async function rejectApplication(applicationId: string): Promise<{ ok: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("partner_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/partner-pending");
  return { ok: true };
}
