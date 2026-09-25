"use server";

import { createClient } from "@/lib/supabase/server";
import { readAdminAccess } from "@/lib/admin-access";

/** Relecture à chaque étape ; expectedUserId est une concordance, jamais une autorité. */
export async function checkAdminMfaAccess(expectedUserId: string) {
  const access = await readAdminAccess(await createClient());
  if (access.userId !== expectedUserId) return { status: "unauthenticated" as const, userId: null };
  return { status: access.status, userId: access.userId };
}
