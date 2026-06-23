/**
 * Server queries pour le dashboard Chauffeur (/driver)
 */
import { createClient } from "@/lib/supabase/server";
import type { DriverRow, RideRow, ChurnScoreRow } from "@/types/database";

// ─── Tier ────────────────────────────────────────────────────────────────────

/**
 * Récupère le tier du chauffeur depuis user_profiles.tier
 * Clé FK = user_id (pas id — cf. STRIPE_MLM_CROSSFIL_MASTER §3)
 * Valeurs : 'free' | 'pro' | 'elite'
 */
export async function getDriverTier(driverId: string): Promise<"free" | "pro" | "elite"> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("tier")
    .eq("user_id", driverId)
    .maybeSingle();
  const tier = (data as { tier?: string } | null)?.tier;
  if (tier === "pro" || tier === "elite") return tier;
  return "free";
}

// ─── Urgent Actions ───────────────────────────────────────────────────────────

export type DriverUrgentAction = {
  status: "critical" | "warning" | "info";
  context: string;
  cta: string;
  iconKey: "star" | "mapPin" | "sparkles" | "alertTriangle";
  pulsing?: boolean;
  href?: string;
};

/**
 * Actions urgentes pour le Hero du dashboard chauffeur.
 * Sources :
 *   1. bookings en statut 'pending' assignées au chauffeur (courses privées à accepter)
 *   2. Churn score élevé → alerte coach
 */
export async function getDriverUrgentActions(driverId: string): Promise<DriverUrgentAction[]> {
  const supabase = await createClient();
  const actions: DriverUrgentAction[] = [];

  // 1. Bookings en attente
  const { data: pendingBookings } = await supabase
    .from("bookings")
    .select("id, client_name, pickup_address, fare_amount")
    .eq("driver_id", driverId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(2);

  for (const b of (pendingBookings ?? [])) {
    const bTyped = b as { id: string; client_name: string | null; pickup_address: string | null; fare_amount: number | null };
    const amount = bTyped.fare_amount ? `${Number(bTyped.fare_amount).toFixed(0)}€` : "";
    const location = bTyped.pickup_address?.split(",")[0] ?? "Course privée";
    actions.push({
      status: "info",
      context: `${location}${amount ? ` · ${amount}` : ""}`,
      cta: "Accepter",
      iconKey: "star",
      pulsing: true,
      href: "/driver/clients-prives",
    });
  }

  // 2. Churn score — warning si score churn > 40 (= performance FOREAS < 60/100)
  const { data: churnRaw } = await supabase
    .from("pieuvre_churn_scores")
    .select("score")
    .eq("driver_id", driverId)
    .order("scored_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const churnScore = (churnRaw as { score?: number } | null)?.score;
  if (typeof churnScore === "number" && churnScore > 40) {
    const perfScore = 100 - churnScore;
    actions.push({
      status: "warning",
      context: `Ajnaya voit un risque. Score : ${perfScore}/100`,
      cta: "Voir coach",
      iconKey: "sparkles",
      href: "/driver/coach",
    });
  }

  return actions;
}

export async function getCurrentDriver(): Promise<DriverRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as DriverRow | null) ?? null;
}

export async function getDriverKPIs(driverId: string) {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: rides } = await supabase
    .from("rides")
    .select("fare_amount, driver_earnings, duration_minutes, distance_km, created_at, started_at")
    .eq("driver_id", driverId)
    .gte("created_at", startOfMonth.toISOString())
    .order("created_at", { ascending: false });

  const list = (rides as Partial<RideRow>[] | null) ?? [];

  let dayCA = 0;
  let weekCA = 0;
  let monthCA = 0;
  let dayDuration = 0;
  let dayCount = 0;

  for (const r of list) {
    const amount = Number(r.driver_earnings ?? r.fare_amount ?? 0);
    const created = r.created_at ? new Date(r.created_at) : null;
    if (!created) continue;
    monthCA += amount;
    if (created >= startOfWeek) weekCA += amount;
    if (created >= startOfDay) {
      dayCA += amount;
      dayDuration += Number(r.duration_minutes ?? 0);
      dayCount += 1;
    }
  }

  // €/h aujourd'hui
  const dayEurH = dayDuration > 0 ? (dayCA / dayDuration) * 60 : 0;

  return {
    dayCA,
    weekCA,
    monthCA,
    dayEurH,
    dayCount,
    totalRides: list.length,
  };
}

export async function getDriverRecentRides(driverId: string, limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as RideRow[] | null) ?? [];
}

export async function getDriverChurnScore(driverId: string): Promise<ChurnScoreRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pieuvre_churn_scores")
    .select("*")
    .eq("driver_id", driverId)
    .order("scored_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ChurnScoreRow | null) ?? null;
}

export async function getDriverSignupWeekTrend(driverId: string) {
  const supabase = await createClient();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const { data } = await supabase
    .from("rides")
    .select("created_at, fare_amount, driver_earnings, duration_minutes")
    .eq("driver_id", driverId)
    .gte("created_at", fourWeeksAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  const weekMap = new Map<number, { rides: number; ca: number; minutes: number }>();
  data.forEach((r) => {
    const d = new Date(r.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const key = monday.getTime();
    const cur = weekMap.get(key) ?? { rides: 0, ca: 0, minutes: 0 };
    cur.rides += 1;
    cur.ca += Number(r.driver_earnings ?? r.fare_amount ?? 0);
    cur.minutes += Number(r.duration_minutes ?? 0);
    weekMap.set(key, cur);
  });

  return Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, v]) => ({
      weekLabel: new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      rides: v.rides,
      ca: v.ca,
      eurPerHour: v.minutes > 0 ? (v.ca / v.minutes) * 60 : 0,
    }));
}
