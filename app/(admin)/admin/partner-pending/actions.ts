"use server";

import { railwayPost } from "@/lib/api/railway";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Changer le statut d'un partner déjà en base — update Supabase DIRECT.
 * Pourquoi pas Railway : la route PATCH /api/admin/partners/:id/status
 * n'a jamais existé côté backend, les boutons appelaient du vide.
 * Le pattern du repo (cf. rejectApplication) est l'update direct sous RLS admin.
 * Truthful UX : on exige la ligne modifiée en retour (.select) — un update qui
 * ne touche aucune ligne (RLS, id inconnu) est un échec, pas un succès.
 */
async function setPartnerStatus(
  partnerId: string,
  status: "active" | "paused"
): Promise<{ ok: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const supabase = await createClient();
  const patch: { status: string; approved_at?: string } = { status };
  // approved_at trace la date de validation humaine — uniquement à l'activation.
  if (status === "active") patch.approved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("partners")
    .update(patch)
    .eq("id", partnerId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Aucune ligne modifiée (partenaire introuvable ou droits insuffisants)." };
  }

  revalidatePath("/admin/partner-pending");
  revalidatePath("/admin/partners");
  revalidatePath("/admin/partenaires");
  return { ok: true };
}

/**
 * Passer un partner 'pending' en 'active'. Nécessaire pour que le cron MLM
 * le considère comme sponsor (findSponsor exige status 'active').
 * Le lien Stripe Connect n'est PAS créé ici : le partenaire le génère
 * depuis son espace (StripeConnectBanner → Railway) — on ne promet donc rien.
 */
export async function validatePartner(partnerId: string): Promise<{ ok: boolean; error?: string }> {
  return setPartnerStatus(partnerId, "active");
}

/**
 * Mettre un partner en pause. Le statut réellement écrit est 'paused'
 * (seuls pending/active/paused existent dans ce repo) — le libellé UI
 * dit la même chose, plus de bouton « Refuser » qui écrit autre chose.
 */
export async function pausePartner(partnerId: string): Promise<{ ok: boolean; error?: string }> {
  return setPartnerStatus(partnerId, "paused");
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
