/**
 * Server queries pour le dashboard Chauffeur (/driver)
 */
import { createClient } from "@/lib/supabase/server";
import type { DriverRow, RideRow } from "@/types/database";

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
