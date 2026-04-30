/**
 * Server queries pour le dashboard Directeur de groupe (/partner)
 * Toutes utilisent createClient() côté server (RLS scope automatiquement les données).
 */
import { createClient } from "@/lib/supabase/server";
import type {
  DriverRow,
  PartnerRow,
  RideRow,
  PartnerCommissionRow,
  ChurnScoreRow,
  B2BProspectRow,
} from "@/types/database";
import type { DriverStatus } from "@/lib/utils";

/**
 * Récupère la fiche du partenaire connecté (NULL si pas partner)
 */
export async function getCurrentPartner(): Promise<PartnerRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as PartnerRow | null) ?? null;
}

/**
 * Récupère les chauffeurs du partenaire avec status calculé.
 *
 * Status calculé :
 *  - active : last_active < 7 jours et status='active'
 *  - warning : last_active 7-14 jours OU CA semaine < 300€
 *  - alert : last_active 14-28 jours OU 0€ depuis 4+ sem
 *  - inactive : last_active > 28 jours
 *  - churned : status='churned' OR status='inactive'
 */
export async function getPartnerDrivers(partnerId: string) {
  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .eq("partner_id", partnerId)
    .order("last_active", { ascending: false, nullsFirst: false });

  if (!drivers) return [];

  // Récupérer les CA semaine + mois pour chaque driver via une seule query rides
  const driverIds = drivers.map((d) => d.id);
  if (driverIds.length === 0) return [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: rides } = await supabase
    .from("rides")
    .select("driver_id, fare_amount, driver_earnings, created_at")
    .in("driver_id", driverIds)
    .gte("created_at", startOfMonth.toISOString());

  // Aggreger par driver
  const caMap = new Map<string, { week: number; month: number }>();
  rides?.forEach((r) => {
    const id = r.driver_id;
    const amount = (r.driver_earnings ?? r.fare_amount ?? 0) as number;
    const isWeek = r.created_at && r.created_at >= sevenDaysAgo;
    const cur = caMap.get(id) ?? { week: 0, month: 0 };
    cur.month += amount;
    if (isWeek) cur.week += amount;
    caMap.set(id, cur);
  });

  const now = Date.now();
  return drivers.map((d) => {
    const ca = caMap.get(d.id) ?? { week: 0, month: 0 };
    const lastActiveMs = d.last_active ? new Date(d.last_active).getTime() : 0;
    const daysSinceActive = lastActiveMs ? (now - lastActiveMs) / (1000 * 60 * 60 * 24) : 999;

    let status: DriverStatus;
    if (d.status === "churned" || d.status === "removed") status = "churned";
    else if (daysSinceActive > 28) status = "alert";
    else if (daysSinceActive > 14 || ca.week < 100) status = "warning";
    else if (daysSinceActive > 60) status = "inactive";
    else status = "active";

    return {
      ...d,
      computed_status: status,
      weekly_ca: ca.week,
      monthly_ca: ca.month,
    };
  });
}

/**
 * KPI consolidés pour le partner.
 */
export async function getPartnerKPIs(partnerId: string) {
  const drivers = await getPartnerDrivers(partnerId);
  const total = drivers.length;
  const active = drivers.filter((d) => d.computed_status === "active").length;
  const churned = drivers.filter((d) => d.computed_status === "churned").length;
  const inAlert = drivers.filter((d) => d.computed_status === "alert" || d.computed_status === "warning").length;

  // Rétention 30 jours = drivers actifs récemment / total
  const retention30 = total > 0 ? (active / total) * 100 : 0;

  // Churn mensuel = churned / total
  const churnRate = total > 0 ? (churned / total) * 100 : 0;

  // Paie ce mois (commissions partner_commissions du mois courant)
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: commissions } = await supabase
    .from("partner_commissions")
    .select("commission_amount")
    .eq("partner_id", partnerId)
    .gte("created_at", startOfMonth.toISOString());

  const paieEstimee = (commissions ?? []).reduce(
    (acc: number, c: { commission_amount: number | null }) =>
      acc + (Number(c.commission_amount) || 0),
    0
  );

  return {
    activeDrivers: active,
    totalDrivers: total,
    retention30,
    churnRate,
    paieEstimee,
    inAlert,
  };
}

/**
 * 3 actions urgentes :
 *  1. Driver inactif >28j (top 1)
 *  2. Driver avec churn score élevé (top 1)
 *  3. Nouveau B2B prospect à distribuer (top 1)
 */
export type UrgentAction = {
  status: "critical" | "warning" | "info";
  driverName?: string;
  context: string;
  cta: string;
  iconKey: "phone" | "message" | "star";
  pulsing?: boolean;
};

export async function getPartnerUrgentActions(partnerId: string): Promise<UrgentAction[]> {
  const supabase = await createClient();
  const drivers = await getPartnerDrivers(partnerId);
  const actions: UrgentAction[] = [];

  // 1. Driver inactif depuis 4 sem+
  const inactiveDriver = drivers
    .filter((d) => d.computed_status === "alert")
    .sort((a, b) => {
      const aDate = a.last_active ? new Date(a.last_active).getTime() : 0;
      const bDate = b.last_active ? new Date(b.last_active).getTime() : 0;
      return aDate - bDate;
    })[0];

  if (inactiveDriver) {
    const fullName = `${inactiveDriver.first_name ?? ""} ${inactiveDriver.last_name ?? ""}`.trim() || "Chauffeur";
    actions.push({
      status: "critical",
      driverName: fullName,
      context: "Inactif depuis 4 semaines",
      cta: "Appeler",
      iconKey: "phone",
      pulsing: true,
    });
  }

  // 2. Driver avec churn score élevé
  const driverIds = drivers.map((d) => d.id);
  if (driverIds.length > 0) {
    const { data: churnData } = await supabase
      .from("pieuvre_churn_scores")
      .select("*")
      .in("driver_id", driverIds)
      .gte("score", 70)
      .eq("intervention_executed", false)
      .order("score", { ascending: false })
      .limit(1);

    const churnHit = (churnData as ChurnScoreRow[] | null)?.[0];
    if (churnHit) {
      const driver = drivers.find((d) => d.id === churnHit.driver_id);
      const fullName = driver
        ? `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim()
        : "Chauffeur";
      actions.push({
        status: "warning",
        driverName: fullName,
        context: `Score churn ${churnHit.score} — coaching proposé`,
        cta: "Coacher",
        iconKey: "message",
      });
    }
  }

  // 3. Nouveau prospect B2B à distribuer
  const { data: b2bData } = await supabase
    .from("pieuvre_b2b_prospects")
    .select("*")
    .eq("pipeline_stage", "qualified")
    .order("qualification_score", { ascending: false })
    .limit(1);

  const b2bHit = (b2bData as B2BProspectRow[] | null)?.[0];
  if (b2bHit && b2bHit.company_name) {
    actions.push({
      status: "info",
      driverName: b2bHit.company_name,
      context: `${b2bHit.industry ?? "Nouveau contrat"} — à distribuer`,
      cta: "Distribuer",
      iconKey: "star",
    });
  }

  return actions;
}

/**
 * Données pour graphe CA flotte 12 dernières semaines.
 */
export async function getPartnerRevenueChart(partnerId: string) {
  const supabase = await createClient();
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);

  const drivers = await getPartnerDrivers(partnerId);
  const driverIds = drivers.map((d) => d.id);
  if (driverIds.length === 0) return [];

  const { data: rides } = await supabase
    .from("rides")
    .select("fare_amount, driver_earnings, created_at")
    .in("driver_id", driverIds)
    .gte("created_at", twelveWeeksAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!rides) return [];

  // Agréger par semaine
  const weekMap = new Map<string, number>();
  rides.forEach((r) => {
    if (!r.created_at) return;
    const d = new Date(r.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split("T")[0];
    const amount = ((r.driver_earnings ?? r.fare_amount ?? 0) as number) / 1000; // k€
    weekMap.set(key, (weekMap.get(key) ?? 0) + amount);
  });

  // Construire 12 dernières semaines même si vides
  const result: { week: string; revenue: number; weekKey: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const monday = new Date(d);
    monday.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split("T")[0];
    result.push({
      week: `S-${i}`,
      weekKey: key,
      revenue: Math.round((weekMap.get(key) ?? 0) * 10) / 10,
    });
  }

  return result;
}

/**
 * Top 3 priorités du jour (drivers à risque ou à féliciter).
 */
export type Priority = {
  id: string;
  driverName: string;
  context: string;
  cta: string;
  estimatedTime: string;
  severity: "high" | "medium" | "low";
};

export async function getPartnerPriorities(partnerId: string): Promise<Priority[]> {
  const supabase = await createClient();
  const drivers = await getPartnerDrivers(partnerId);
  const driverIds = drivers.map((d) => d.id);
  if (driverIds.length === 0) return [];

  const { data: scores } = await supabase
    .from("pieuvre_churn_scores")
    .select("*")
    .in("driver_id", driverIds)
    .order("score", { ascending: false })
    .limit(3);

  return ((scores as ChurnScoreRow[] | null) ?? []).map((s) => {
    const driver = drivers.find((d) => d.id === s.driver_id);
    const fullName = driver
      ? `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() || "Chauffeur"
      : "Chauffeur";
    const severity: Priority["severity"] = s.score >= 80 ? "high" : s.score >= 50 ? "medium" : "low";
    return {
      id: s.id,
      driverName: fullName,
      context: s.intervention_recommended ?? `Score churn ${s.score} · ${s.ca_trend ?? "trend stable"}`,
      cta: severity === "high" ? "Contacter" : severity === "medium" ? "Coacher" : "Message",
      estimatedTime: severity === "high" ? "~5 min" : severity === "medium" ? "~10 min" : "~2 min",
      severity,
    };
  });
}
