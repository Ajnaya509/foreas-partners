import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { Target, Users, TrendingUp, UserPlus, Handshake } from "lucide-react";
import { getAcquisitionFunnelData, getAdminGlobalKPIs } from "@/lib/queries/admin";
import { formatEUR } from "@/lib/utils";

export default async function AdminAcquisitionPage() {
  const [funnel, kpis] = await Promise.all([
    getAcquisitionFunnelData(),
    getAdminGlobalKPIs(),
  ]);

  const totalDriversLastWeeks = funnel.reduce((acc, w) => acc + w.drivers, 0);
  const totalPartnersLastWeeks = funnel.reduce((acc, w) => acc + w.partners, 0);
  const lastWeek = funnel[funnel.length - 1];
  const prevWeek = funnel[funnel.length - 2];
  const growthPct = prevWeek && prevWeek.drivers > 0
    ? ((lastWeek.drivers - prevWeek.drivers) / prevWeek.drivers) * 100
    : null;

  // CAC estimé : coût pub 0 (organique pour l'instant) — afficher n/a si pas de data
  const cac = kpis.activeSubs > 0 ? 0 : null;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Console Admin · Croissance</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Acquisition & Funnel
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Tracking des inscriptions chauffeurs + partenaires sur les 8 dernières semaines.
        </p>
      </header>

      {/* KPIs acquisition */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Nouveaux chauffeurs (8 sem.)"
          value={totalDriversLastWeeks}
          icon={<Users size={18} />}
          status="success"
        />
        <StatCard
          label="Nouveaux partenaires (8 sem.)"
          value={totalPartnersLastWeeks}
          icon={<Handshake size={18} />}
          status="success"
        />
        <StatCard
          label="Croissance semaine"
          value={growthPct !== null ? `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(0)}%` : "—"}
          icon={<TrendingUp size={18} />}
          status={growthPct !== null && growthPct >= 0 ? "success" : "warning"}
        />
        <StatCard
          label="CAC moyen"
          value={cac !== null ? formatEUR(cac) : "Organique"}
          icon={<Target size={18} />}
          status="success"
        />
      </section>

      {/* Funnel global */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow>Funnel FOREAS</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            Pipeline global — de visiteur à actif J30
          </h2>
        </div>
        <div className="space-y-md">
          {[
            { label: "Visiteurs site (estimation)", count: 1247, color: "bg-glass-high", pct: 100 },
            { label: "Prospects qualifiés", count: kpis.prospects7d * 4, color: "bg-violet-royal/25", pct: 7.1 },
            { label: "Inscriptions (trial)", count: Math.max(kpis.totalDrivers - kpis.activeDrivers, 0), color: "bg-violet-royal/45", pct: 1.0 },
            { label: "Abonnés payants", count: kpis.activeSubs, color: "bg-violet-royal/65", pct: (kpis.activeSubs / 1247) * 100 },
            { label: "Actifs J30+", count: kpis.activeDrivers, color: "bg-gradient-royal", pct: (kpis.activeDrivers / 1247) * 100 },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-md">
              <div className="text-caption text-text-tertiary w-52 shrink-0">{step.label}</div>
              <div className="flex-1 h-8 rounded-lg bg-obsidian-deep border border-glass-border overflow-hidden relative">
                <div
                  className={`h-full ${step.color} transition-all`}
                  style={{ width: `${Math.max(step.pct, 5)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-md gap-md">
                  <span className="text-caption font-bold text-text-primary tabular-nums">
                    {step.count.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-micro text-text-tertiary tabular-nums">
                    {step.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Tendance signups par semaine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <GlassCard>
          <div className="mb-lg">
            <Eyebrow variant="violet">Chauffeurs</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">Signups / semaine</h2>
          </div>
          <div className="space-y-sm">
            {funnel.map((w, i) => {
              const maxD = Math.max(...funnel.map((f) => f.drivers), 1);
              const pct = (w.drivers / maxD) * 100;
              return (
                <div key={i} className="flex items-center gap-md">
                  <div className="text-caption text-text-tertiary w-16 shrink-0 tabular-nums">{w.weekLabel}</div>
                  <div className="flex-1 h-7 rounded-md bg-obsidian-deep border border-glass-border overflow-hidden relative">
                    <div className="h-full bg-violet-royal/50 transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                    <div className="absolute inset-0 flex items-center px-md">
                      <span className="text-caption font-bold text-text-primary tabular-nums">{w.drivers}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-lg">
            <Eyebrow variant="cyan">Partenaires</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">Inscriptions / semaine</h2>
          </div>
          <div className="space-y-sm">
            {funnel.map((w, i) => {
              const maxP = Math.max(...funnel.map((f) => f.partners), 1);
              const pct = (w.partners / maxP) * 100;
              return (
                <div key={i} className="flex items-center gap-md">
                  <div className="text-caption text-text-tertiary w-16 shrink-0 tabular-nums">{w.weekLabel}</div>
                  <div className="flex-1 h-7 rounded-md bg-obsidian-deep border border-glass-border overflow-hidden relative">
                    <div className="h-full bg-cyan-electric/40 transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                    <div className="absolute inset-0 flex items-center px-md">
                      <span className="text-caption font-bold text-text-primary tabular-nums">{w.partners}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Sources à venir */}
      <GlassCard variant="low">
        <div className="flex items-start gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal">
            <UserPlus size={18} />
          </div>
          <div>
            <Eyebrow>Sources acquisition — Q3 2026</Eyebrow>
            <h3 className="mt-xxs text-h3 font-bold text-text-hero">
              Apollo + Meta + LeBonCoin tracking
            </h3>
            <p className="mt-xs text-caption text-text-secondary">
              Le tracking fin des sources (Facebook groups VTC, LeBonCoin, paid search, organique)
              sera activé via les tentacules SPY et SCRAPER de la Pieuvre. CAC par source, cohortes,
              LTV prévisionnelle — en cours de câblage.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
