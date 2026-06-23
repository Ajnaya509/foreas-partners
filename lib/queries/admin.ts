/**
 * Server queries pour /admin (super-admin only)
 * Bypass RLS via is_admin() helper côté Supabase.
 */
import { createClient } from "@/lib/supabase/server";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("user_roles")
    .select("role, is_active, revoked_at")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  return !!data;
}

export async function getAdminGlobalKPIs() {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Drivers actifs
  const { count: activeDrivers } = await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // Total drivers
  const { count: totalDrivers } = await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true });

  // Total partners
  const { count: totalPartners } = await supabase
    .from("partners")
    .select("id", { count: "exact", head: true });

  // Courses du jour
  const { count: ridesToday } = await supabase
    .from("rides")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString());

  // Revenus du jour (sum fare_amount)
  const { data: ridesData } = await supabase
    .from("rides")
    .select("fare_amount, driver_earnings")
    .gte("created_at", startOfDay.toISOString());

  const revenueToday = ((ridesData ?? []) as { fare_amount: number | null; driver_earnings: number | null }[])
    .reduce((acc, r) => acc + Number(r.fare_amount ?? r.driver_earnings ?? 0), 0);

  // MRR estimé (subscriptions actives × 12.97 × 4)
  const { count: activeSubs } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const mrrEstimated = (activeSubs ?? 0) * 12.97 * 4;

  // Prospects 7j (driver_signals ou b2b prospects)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count: prospects7d } = await supabase
    .from("pieuvre_b2b_prospects")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString());

  return {
    activeDrivers: activeDrivers ?? 0,
    totalDrivers: totalDrivers ?? 0,
    totalPartners: totalPartners ?? 0,
    ridesToday: ridesToday ?? 0,
    revenueToday,
    activeSubs: activeSubs ?? 0,
    mrrEstimated,
    prospects7d: prospects7d ?? 0,
  };
}

export async function getRecentDriversAdmin(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drivers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentPartnersAdmin(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getPieuvreWorkflowHealth() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pieuvre_workflow_logs")
    .select("workflow_id, status, executed_at, error_message")
    .order("executed_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getAcquisitionFunnelData() {
  const supabase = await createClient();
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

  const { data: drivers } = await supabase
    .from("drivers")
    .select("created_at, status")
    .gte("created_at", eightWeeksAgo.toISOString())
    .order("created_at", { ascending: true });

  const { data: partners } = await supabase
    .from("partners")
    .select("created_at, status")
    .gte("created_at", eightWeeksAgo.toISOString())
    .order("created_at", { ascending: true });

  const weekMap = new Map<number, { drivers: number; partners: number }>();
  const toMonday = (d: Date) => {
    const m = new Date(d);
    m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    m.setHours(0, 0, 0, 0);
    return m.getTime();
  };

  (drivers ?? []).forEach((d) => {
    if (!d.created_at) return;
    const key = toMonday(new Date(d.created_at));
    const cur = weekMap.get(key) ?? { drivers: 0, partners: 0 };
    cur.drivers += 1;
    weekMap.set(key, cur);
  });

  (partners ?? []).forEach((p) => {
    if (!p.created_at) return;
    const key = toMonday(new Date(p.created_at));
    const cur = weekMap.get(key) ?? { drivers: 0, partners: 0 };
    cur.partners += 1;
    weekMap.set(key, cur);
  });

  const result = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = toMonday(d);
    const v = weekMap.get(key) ?? { drivers: 0, partners: 0 };
    result.push({
      weekLabel: new Date(key).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      drivers: v.drivers,
      partners: v.partners,
    });
  }

  return result;
}

export async function getUserRolesList(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("id, user_id, role, is_active, granted_at, revoked_at")
    .order("granted_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getActiveFeatureFlags() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("key, enabled, description")
    .order("key");
  return data ?? [];
}
