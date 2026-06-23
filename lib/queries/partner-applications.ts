/**
 * Candidatures partenaires (table `partner_applications`).
 *
 * Le SITE (foreas.xyz/devenir-partenaire) écrit ici via la clé anon
 * (RLS "anyone can apply"). L'ADMIN lit + met à jour via RLS is_admin().
 *
 * ⚠️ Jonction : avant ce module, l'admin ne lisait que `partners`. Un candidat
 * arrivé par le formulaire du site était donc INVISIBLE. Ce module recolle le flux.
 *
 * Cycle de vie : pending → approved (crée la ligne `partners` + code + invite,
 * fait côté Railway) | rejected (simple update ici).
 */
import { createClient } from "@/lib/supabase/server";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface PartnerApplication {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  siret: string | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

/** Candidatures en attente (les plus récentes d'abord). */
export async function getPendingApplications(): Promise<PartnerApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_applications")
    .select(
      "id, company_name, contact_name, email, phone, siret, message, status, created_at, reviewed_at, reviewed_by"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    // RLS / réseau : on ne casse pas la page admin, on log et on renvoie vide.
    console.error("[partner-applications] getPendingApplications:", error.message);
    return [];
  }
  return (data ?? []) as PartnerApplication[];
}

/** Compteurs par statut (pour la vue globale). */
export async function getApplicationCounts(): Promise<Record<ApplicationStatus, number>> {
  const supabase = await createClient();
  const empty = { pending: 0, approved: 0, rejected: 0 };
  const { data, error } = await supabase
    .from("partner_applications")
    .select("status");
  if (error || !data) return empty;
  return (data as { status: ApplicationStatus }[]).reduce(
    (acc, r) => {
      if (r.status in acc) acc[r.status] += 1;
      return acc;
    },
    { ...empty }
  );
}
