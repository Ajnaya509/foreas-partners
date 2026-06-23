"use server";

import { railwayPatch } from "@/lib/api/railway";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { revalidatePath } from "next/cache";

export async function updatePartnerDiscount(
  partnerId: string,
  data: {
    discount_percent_for_recruits: number;
    discount_duration_months: number;
    landing_message: string;
    landing_hero_url: string;
    is_promo_active: boolean;
  }
) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  await railwayPatch(`/api/admin/partners/${partnerId}/discount`, data);
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
