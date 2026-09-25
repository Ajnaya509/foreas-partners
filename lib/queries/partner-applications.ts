/** Lectures administrateur des candidatures. Les admissions passent par le service protégé. */
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { z } from "zod";
const pendingSchema=z.array(z.object({id:z.string().uuid(),company_name:z.string().min(1),contact_name:z.string(),email:z.string().email(),phone:z.string().nullable(),siret:z.string().nullable(),message:z.string().nullable(),status:z.literal("pending"),created_at:z.string().refine(v=>Number.isFinite(Date.parse(v))),reviewed_at:z.string().nullable(),reviewed_by:z.string().nullable()}));

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
  if(!await isCurrentUserAdmin())throw new Error("Accès administrateur vérifié requis.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_applications")
    .select(
      "id, company_name, contact_name, email, phone, siret, message, status, created_at, reviewed_at, reviewed_by"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if(error)throw new Error("La lecture des candidatures n’a pas été confirmée.");
  return pendingSchema.parse(data);

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
