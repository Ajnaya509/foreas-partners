"use server";

import { railwayPost, type CronResult } from "@/lib/api/railway";
import { isCurrentUserAdmin } from "@/lib/queries/admin";

export async function runCronNow(): Promise<CronResult> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");
  return await railwayPost<CronResult>("/api/admin/payouts/run-cron-now");
}
