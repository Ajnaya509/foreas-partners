import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { FleetTable, type FleetDriver } from "@/components/foreas/FleetTable";
import { getCurrentPartner, getPartnerDrivers, getPartnerKPIs } from "@/lib/queries/partner";
import { redirect } from "next/navigation";
import type { DriverStatus } from "@/lib/utils";
import { Users, UserCheck, AlertTriangle, UserMinus } from "lucide-react";
import { StatCard } from "@/components/foreas/StatCard";

export default async function PartnerChauffeursPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/login?next=/partner/chauffeurs");

  const [drivers, kpis] = await Promise.all([
    getPartnerDrivers(partner.id),
    getPartnerKPIs(partner.id),
  ]);

  const fleetDrivers: FleetDriver[] = drivers.map((d) => ({
    id: d.id,
    name: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Chauffeur",
    status: d.computed_status as DriverStatus,
    weeklyCA: d.weekly_ca,
    monthlyCA: d.monthly_ca,
    lastRideAt: d.last_active ? new Date(d.last_active) : null,
    referralCode: d.referral_code ?? undefined,
  }));

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Gestion d&apos;équipe</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Mes chauffeurs
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Vue détaillée de tous tes chauffeurs sous gestion CAE FOREAS.
        </p>
      </header>

      {/* KPI breakdown */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Total flotte"
          value={kpis.totalDrivers}
          icon={<Users size={18} />}
          status="neutral"
        />
        <StatCard
          label="Actifs"
          value={kpis.activeDrivers}
          icon={<UserCheck size={18} />}
          status="success"
        />
        <StatCard
          label="En alerte"
          value={kpis.inAlert}
          icon={<AlertTriangle size={18} />}
          status={kpis.inAlert > 3 ? "danger" : "warning"}
        />
        <StatCard
          label="Churn ce mois"
          value={kpis.churnRate.toFixed(1)}
          format="percent"
          icon={<UserMinus size={18} />}
          status={kpis.churnRate < 5 ? "success" : "warning"}
        />
      </section>

      {/* Table principale */}
      <FleetTable drivers={fleetDrivers} />
    </div>
  );
}
