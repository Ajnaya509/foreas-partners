import { Eyebrow } from "@/components/foreas/Eyebrow";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { ActionChip } from "@/components/foreas/ActionChip";
import { StatCard } from "@/components/foreas/StatCard";
import { Users, TrendingUp, Wallet, Activity, Phone, MessageSquare, Star } from "lucide-react";
import { FleetTable, type FleetDriver } from "@/components/foreas/FleetTable";
import { CARevenueChart } from "@/components/foreas/CARevenueChart";
import { PriorityList } from "@/components/foreas/PriorityList";
import { StripeConnectBanner } from "./StripeConnectBanner";
import {
  getCurrentPartner,
  getPartnerKPIs,
  getPartnerUrgentActions,
  getPartnerPriorities,
  getPartnerRevenueChart,
  getPartnerDrivers,
} from "@/lib/queries/partner";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { DriverStatus } from "@/lib/utils";

const iconMap = {
  phone: <Phone size={18} />,
  message: <MessageSquare size={18} />,
  star: <Star size={18} />,
};

export default async function PartnerDashboardPage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login?next=/partner");
  }

  // Récupère le prénom du user pour le greeting (pas le nom de la société)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fullName = (user?.user_metadata?.full_name as string | undefined)
    ?? (user?.user_metadata?.name as string | undefined)
    ?? null;
  const firstName =
    fullName?.split(" ")[0]
    ?? user?.email?.split("@")[0]?.split(".")[0]
    ?? "Directeur";
  const greetingName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  // Charger toutes les data en parallèle
  const [kpis, urgentActions, priorities, chartData, drivers] = await Promise.all([
    getPartnerKPIs(partner.id),
    getPartnerUrgentActions(partner.id),
    getPartnerPriorities(partner.id),
    getPartnerRevenueChart(partner.id),
    getPartnerDrivers(partner.id),
  ]);

  // Mapper drivers pour la FleetTable
  const fleetDrivers: FleetDriver[] = drivers.map((d) => ({
    id: d.id,
    name: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Chauffeur",
    status: d.computed_status as DriverStatus,
    weeklyCA: d.weekly_ca,
    monthlyCA: d.monthly_ca,
    lastRideAt: d.last_active ? new Date(d.last_active) : null,
    referralCode: d.referral_code ?? undefined,
  }));

  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Paiement — bandeau Stripe Connect (masqué si déjà connecté) */}
      <StripeConnectBanner
        connected={!!partner.stripe_account_id}
        pendingCommission={Number(partner.pending_commission ?? 0)}
      />

      {/* Hero — Bonjour + 3 actions urgentes */}
      <section>
        <HeroGradientCard glow={false} className="!p-xl">
          <div className="mb-lg">
            <Eyebrow>Aujourd&apos;hui · {today}</Eyebrow>
            <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
              Bonjour {greetingName}.
            </h1>
            <p className="mt-xs text-body-lg text-text-secondary">
              {urgentActions.length > 0 ? (
                <>
                  Tu as <span className="text-violet-royal font-bold">{urgentActions.length} action{urgentActions.length > 1 ? "s" : ""} urgente{urgentActions.length > 1 ? "s" : ""}</span> aujourd&apos;hui.
                </>
              ) : (
                <>Aucune action urgente. Profite-en pour préparer la suite.</>
              )}
            </p>
          </div>

          {urgentActions.length > 0 && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-md">
              {urgentActions.map((action, i) => (
                <ActionChip
                  key={i}
                  status={action.status}
                  driverName={action.driverName}
                  context={action.context}
                  cta={action.cta}
                  icon={iconMap[action.iconKey]}
                  pulsing={action.pulsing}
                />
              ))}
            </div>
          )}
        </HeroGradientCard>
      </section>

      {/* KPI Row */}
      <section>
        <div className="mb-md">
          <Eyebrow>Indicateurs clés</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
          <StatCard
            label="Chauffeurs actifs"
            value={`${kpis.activeDrivers}/${kpis.totalDrivers}`}
            status="success"
            icon={<Users size={18} />}
          />
          <StatCard
            label="Rétention 30 jours"
            value={kpis.retention30.toFixed(1)}
            format="percent"
            status={kpis.retention30 >= 85 ? "success" : kpis.retention30 >= 70 ? "warning" : "danger"}
            icon={<Activity size={18} />}
          />
          <StatCard
            label="Churn mensuel"
            value={kpis.churnRate.toFixed(1)}
            format="percent"
            status={kpis.churnRate < 5 ? "success" : kpis.churnRate < 10 ? "warning" : "danger"}
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            label="Paie estimée ce mois"
            value={kpis.paieEstimee}
            format="eur"
            status="success"
            icon={<Wallet size={18} />}
          />
        </div>
      </section>

      {/* Graph + Priorities (2 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-lg">
        <div className="lg:col-span-3">
          <CARevenueChart data={chartData} />
        </div>
        <div className="lg:col-span-2">
          <PriorityList priorities={priorities} />
        </div>
      </section>

      {/* Ma flotte */}
      <section>
        <div className="flex items-center justify-between mb-md">
          <div>
            <Eyebrow>Ma flotte</Eyebrow>
            <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
              {kpis.totalDrivers} chauffeur{kpis.totalDrivers > 1 ? "s" : ""} sous gestion
            </h2>
          </div>
        </div>
        <FleetTable drivers={fleetDrivers} />
      </section>
    </div>
  );
}
