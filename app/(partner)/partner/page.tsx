import { Eyebrow } from "@/components/foreas/Eyebrow";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { ActionChip } from "@/components/foreas/ActionChip";
import { StatCard } from "@/components/foreas/StatCard";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatusPill } from "@/components/foreas/StatusPill";
import { Users, TrendingUp, Wallet, Activity, Phone, MessageSquare, Star, Search } from "lucide-react";
import { FleetTable } from "@/components/foreas/FleetTable";
import { CARevenueChart } from "@/components/foreas/CARevenueChart";
import { PriorityList } from "@/components/foreas/PriorityList";

export default function PartnerDashboardPage() {
  // TODO Phase 2 : remplacer par vraies queries Supabase
  // Stub data pour MVP design
  const heroActions = [
    {
      status: "critical" as const,
      driverName: "Driss J.",
      context: "Inactif depuis 4 semaines",
      cta: "Appeler",
      icon: <Phone size={18} />,
      pulsing: true,
    },
    {
      status: "warning" as const,
      driverName: "Karim B.",
      context: "Score churn 87 — coaching proposé",
      cta: "Coacher",
      icon: <MessageSquare size={18} />,
    },
    {
      status: "info" as const,
      driverName: "Hôtel Ritz",
      context: "Nouveau contrat à distribuer",
      cta: "Distribuer",
      icon: <Star size={18} />,
    },
  ];

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Hero — Bonjour + 3 actions urgentes */}
      <section>
        <HeroGradientCard glow={false} className="!p-xl">
          <div className="mb-lg">
            <Eyebrow>Aujourd'hui · 30 avril 2026</Eyebrow>
            <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
              Bonjour Driss.
            </h1>
            <p className="mt-xs text-body-lg text-text-secondary">
              Tu as <span className="text-violet-royal font-bold">3 actions urgentes</span> aujourd'hui.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-md">
            {heroActions.map((action, i) => (
              <ActionChip
                key={i}
                status={action.status}
                driverName={action.driverName}
                context={action.context}
                cta={action.cta}
                icon={action.icon}
                pulsing={action.pulsing}
              />
            ))}
          </div>
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
            value="28/30"
            trend={3.2}
            trendLabel="vs semaine dernière"
            status="success"
            icon={<Users size={18} />}
            sparkline={[15, 18, 22, 24, 25, 26, 28]}
          />
          <StatCard
            label="Rétention 30 jours"
            value="92.3"
            format="percent"
            trend={1.8}
            trendLabel="vs mois dernier"
            status="success"
            icon={<Activity size={18} />}
            sparkline={[88, 89, 90, 91, 91, 92, 92.3]}
          />
          <StatCard
            label="Churn mensuel"
            value="4.2"
            format="percent"
            trend={-0.8}
            trendLabel="vs mois dernier"
            status="success"
            icon={<TrendingUp size={18} />}
            sparkline={[6.5, 6.0, 5.5, 5.2, 4.8, 4.5, 4.2]}
          />
          <StatCard
            label="Paie estimée ce mois"
            value={3150}
            format="eur"
            trend={12}
            trendLabel="vs mois dernier"
            status="success"
            icon={<Wallet size={18} />}
            sparkline={[1800, 2100, 2400, 2600, 2800, 3000, 3150]}
          />
        </div>
      </section>

      {/* Graph + Priorities (2 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-lg">
        <div className="lg:col-span-3">
          <CARevenueChart />
        </div>
        <div className="lg:col-span-2">
          <PriorityList />
        </div>
      </section>

      {/* Ma flotte */}
      <section>
        <div className="flex items-center justify-between mb-md">
          <div>
            <Eyebrow>Ma flotte</Eyebrow>
            <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
              30 chauffeurs sous gestion
            </h2>
          </div>
        </div>
        <FleetTable />
      </section>
    </div>
  );
}
