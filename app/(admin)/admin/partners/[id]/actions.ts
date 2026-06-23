"use server";

import { railwayPatch } from "@/lib/api/railway";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePartnerDiscount(
  partnerId: string,
  data: {
    discount_percent_for_recruits: number;
    discount_duration_months: number;
    landing_message: string;
    landing_hero_url: string;
    is_promo_active: boolean;
    /** Override commission €/mois par filleul (admin force une valeur précise). */
    commission_rate?: number;
  }
) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const { commission_rate, ...discountData } = data;

  // Remise + config promo → Railway (comportement existant inchangé).
  await railwayPatch(`/api/admin/partners/${partnerId}/discount`, discountData);

  // Commission → override admin écrit en direct via Supabase (RLS partners_admin_all).
  // Se répercute sur le payout (cf. TROU #4). L'auto-palier (NULL) est géré côté base
  // une fois APP_BRIEF_PARTNER_DISCOUNT_TIERS livré.
  if (typeof commission_rate === "number" && Number.isFinite(commission_rate)) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("partners")
      .update({ commission_rate })
      .eq("id", partnerId);
    if (error) throw new Error(`Commission : ${error.message}`);
  }

  revalidatePath(`/admin/partners/${partnerId}`);
  revalidatePath("/admin/partners");
}

export async function updatePartnerStatus(
  partnerId: string,
  status: "active" | "paused"
) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  await railwayPatch(`/api/admin/partners/${partnerId}/status`, { status });
  revalidatePath(`/admin/partners/${partnerId}`);
  revalidatePath("/admin/partners");
  revalidatePath("/admin/partner-pending");
}
