import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Euro,
  Activity,
  Calendar,
  Handshake,
  ArrowUpRight,
} from "lucide-react";
import { getAdminGlobalKPIs, getAcquisitionFunnelData } from "@/lib/queries/admin";
import { formatEUR } from "@/lib/utils";

export default async function AdminReportsPage() {
  const [kpis, funnel] = await Promise.all([
    getAdminGlobalKPIs(),
    getAcquisitionFunnelData(),
  ]);

  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());

  const totalDriversLast8w = funnel.reduce((a, w) => a + w.drivers, 0);
  const totalPartnersLast8w = funnel.reduce((a, w) => a + w.partners, 0);

  const lastWeek = funnel[funnel.length - 1];
  const prevWeek = funnel[funnel.length - 2];
  const driverGrowth = prevWeek && prevWeek.drivers > 0
    ? ((lastWeek.drivers - prevWeek.drivers) / prevWeek.drivers) * 100
    : null;

  const conversionRate = kpis.totalDrivers > 0
    ? ((kpis.activeSubs / kpis.totalDrivers) * 100).toFixed(1)
    : "—";

  const EXPORT_ROWS = [
    { label: "KPIs chauffeurs complets", desc: `${kpis.totalDrivers} lignes · drivers table`, size: "~${Math.max(kpis.totalDrivers * 0.3, 1).toFixed(0)} Ko" },
    { label: "KPIs partenaires complets", desc: `${kpis.totalPartners} lignes · partners table`, size: "~${Math.max(kpis.totalPartners * 0.3, 1).toFixed(0)} Ko" },
    { label: "Courses du mois", desc: `${kpis.ridesToday > 0 ? kpis.ridesToday + " aujourd'hui" : "rides table"}`, size: "CSV" },
    { label: "Revenus & MRR", desc: `Subscriptions + fare_amounts`, size: "CSV" },
    { label: "Acquisition funnel 8 sem.", desc: "Signups par semaine par type", size: "CSV" },
  ];

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Analytics & Exports</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Reports
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Synthèse {month} · {today}
        </p>
      </header>

      {/* KPIs synthèse */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Chauffeurs totaux"
          value={kpis.totalDrivers}
          icon={<Users size={18} />}
          status="neutral"
        />
        <StatCard
          label="Partenaires"
          value={kpis.totalPartners}
          icon={<Handshake size={18} />}
          status="neutral"
        />
        <StatCard
          label="MRR estimé"
          value={kpis.mrrEstimated}
          format="eur"
          icon={<Euro size={18} />}
          status="success"
        />
        <StatCard
          label="Conversion inscription→sub"
          value={`${conversionRate}%`}
          icon={<TrendingUp size={18} />}
          status="neutral"
        />
      </section>

      {/* Rapport mensuel synthétique */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow variant="cyan">Bilan mensuel</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            Synthèse {month}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="space-y-md">
            <div className="p-md rounded-lg bg-glass-low border border-glass-border">
              <div className="text-eyebrow text-text-tertiary uppercase tracking-widest text-micro mb-xs">Revenus</div>
              <div className="text-display-l font-extrabold text-text-hero tabular-nums">
                {formatEUR(kpis.revenueToday)}
              </div>
              <div className="text-caption text-text-secondary mt-xxs">Aujourd&apos;hui · base fare_amount + driver_earnings</div>
            </div>
            <div className="p-md rounded-lg bg-glass-low border border-glass-border">
              <div className="text-eyebrow text-text-tertiary uppercase tracking-widest text-micro mb-xs">Courses</div>
              <div className="text-display-l font-extrabold text-text-hero tabular-nums">{kpis.ridesToday}</div>
              <div className="text-caption text-text-secondary mt-xxs">Aujourd&apos;hui</div>
            </div>
          </div>
          <div className="space-y-md">
            <div className="p-md rounded-lg bg-glass-low border border-glass-border">
              <div className="text-eyebrow text-text-tertiary uppercase tracking-widest text-micro mb-xs">Abonnés actifs</div>
              <div className="text-display-l font-extrabold text-text-hero tabular-nums">{kpis.activeSubs}</div>
              <div className="text-caption text-text-secondary mt-xxs">Subscriptions status = active</div>
            </div>
            <div className="p-md rounded-lg bg-glass-low border border-glass-border">
              <div className="text-eyebrow text-text-tertiary uppercase tracking-widest text-micro mb-xs">Chauffeurs actifs</div>
              <div className="text-display-l font-extrabold text-text-hero tabular-nums">{kpis.activeDrivers}</div>
              <div className="text-caption text-text-secondary mt-xxs">drivers status = active</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tendance acquisition 8 semaines */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow variant="violet">Acquisition</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            8 semaines · {totalDriversLast8w} drivers · {totalPartnersLast8w} partenaires
          </h2>
          {driverGrowth !== null && (
            <div className={`mt-xs flex items-center gap-xs text-caption font-semibold ${driverGrowth >= 0 ? "text-success" : "text-danger"}`}>
              <ArrowUpRight size={14} className={driverGrowth < 0 ? "rotate-90" : ""} />
              {driverGrowth >= 0 ? "+" : ""}{driverGrowth.toFixed(0)}% drivers semaine dernière vs précédente
            </div>
          )}
        </div>
        <div className="space-y-sm">
          {funnel.map((w, i) => {
            const maxD = Math.max(...funnel.map((f) => f.drivers + f.partners), 1);
            const total = w.drivers + w.partners;
            const pct = (total / maxD) * 100;
            return (
              <div key={i} className="flex items-center gap-md">
                <div className="text-caption text-text-tertiary w-16 shrink-0 tabular-nums">{w.weekLabel}</div>
                <div className="flex-1 h-7 rounded-md bg-obsidian-deep border border-glass-border overflow-hidden relative">
                  <div className="h-full flex">
                    <div className="h-full bg-violet-royal/50" style={{ width: `${(w.drivers / maxD) * 100}%` }} />
                    <div className="h-full bg-cyan-electric/40" style={{ width: `${(w.partners / maxD) * 100}%` }} />
                  </div>
                  <div className="absolute inset-0 flex items-center px-md gap-sm">
                    <span className="text-caption font-bold text-text-primary tabular-nums">{total}</span>
                    <span className="text-micro text-text-tertiary">
                      <span className="text-violet-royal font-semibold">{w.drivers}d</span>
                      {" + "}
                      <span className="text-cyan-electric font-semibold">{w.partners}p</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-md flex items-center gap-lg text-micro text-text-tertiary">
          <span className="flex items-center gap-xs"><span className="w-2 h-2 rounded-full bg-violet-royal/50 inline-block" /> Chauffeurs</span>
          <span className="flex items-center gap-xs"><span className="w-2 h-2 rounded-full bg-cyan-electric/40 inline-block" /> Partenaires</span>
        </div>
      </GlassCard>

      {/* Exports CSV — placeholder */}
      <GlassCard variant="low">
        <div className="mb-md">
          <Eyebrow>Exports & CSV</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            Rapports exportables — Q3 2026
          </h2>
        </div>
        <div className="space-y-sm">
          {EXPORT_ROWS.map((row, i) => (
            <div key={i} className="flex items-center gap-md p-md rounded-lg bg-glass-low border border-glass-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal shrink-0">
                <Activity size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-body-bold text-text-primary">{row.label}</div>
                <div className="text-caption text-text-secondary">{row.desc}</div>
              </div>
              <button
                disabled
                className="flex items-center gap-xs px-md py-xs rounded-lg bg-glass-low border border-glass-border text-text-muted text-caption font-semibold cursor-not-allowed"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          ))}
        </div>
        <div className="mt-md flex items-start gap-md p-md rounded-lg bg-violet-royal/5 border border-violet-royal/20">
          <Calendar size={16} className="text-violet-royal shrink-0 mt-xxs" />
          <p className="text-caption text-text-secondary">
            Exports CSV/Excel + rapport mensuel auto envoyé par Telegram (M10 brief) câblés via la Pieuvre Q3 2026.
            DuckDB pour les analytics avancées et les vues custom par segment.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
