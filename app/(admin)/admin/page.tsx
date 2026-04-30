import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { StatCard } from "@/components/foreas/StatCard";
import {
  Users,
  Handshake,
  Activity,
  Euro,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Octagon,
} from "lucide-react";
import { getAdminGlobalKPIs } from "@/lib/queries/admin";
import { RealtimeFeed } from "@/components/foreas/RealtimeFeed";

export default async function AdminOverviewPage() {
  const kpis = await getAdminGlobalKPIs();
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());

  return (
    <div className="space-y-xl animate-fade-in-down">
      <HeroGradientCard glow={false}>
        <Eyebrow>{today} · Console Admin</Eyebrow>
        <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
          Bonjour Chandler.
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Vue consolidée FOREAS Holding · {kpis.totalDrivers} chauffeurs · {kpis.totalPartners} partenaires · MRR {kpis.mrrEstimated.toFixed(0)}€
        </p>
      </HeroGradientCard>

      {/* KPI Hero Bar - 5 cards temps réel */}
      <section>
        <div className="mb-md">
          <Eyebrow>Indicateurs temps réel</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-lg">
          <StatCard label="Revenus jour" value={kpis.revenueToday} format="eur" status="success" icon={<Euro size={18} />} />
          <StatCard label="Courses jour" value={kpis.ridesToday} status="neutral" icon={<Activity size={18} />} />
          <StatCard label="Drivers actifs" value={kpis.activeDrivers} status="success" icon={<Users size={18} />} />
          <StatCard label="Prospects 7j" value={kpis.prospects7d} status="neutral" icon={<TrendingUp size={18} />} />
          <StatCard label="MRR live" value={kpis.mrrEstimated} format="eur" status="success" icon={<TrendingUp size={18} />} />
        </div>
      </section>

      {/* Funnel + Realtime feed (2 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <Eyebrow>Funnel global FOREAS</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">Acquisition pipeline</h2>
            <div className="mt-lg space-y-md">
              {[
                { label: "Visiteurs site (7j)", count: 1247, color: "bg-glass-low", percent: 100 },
                { label: "Prospects qualifiés", count: 89, color: "bg-violet-royal/30", percent: 7.1 },
                { label: "Inscriptions (trial)", count: 12, color: "bg-violet-royal/50", percent: 1.0 },
                { label: "Payants actifs", count: kpis.activeSubs, color: "bg-violet-royal/70", percent: 0.24 },
                { label: "Actifs J30+", count: kpis.activeDrivers, color: "bg-gradient-royal", percent: 0.16 },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-md">
                  <div className="text-caption text-text-tertiary w-44 shrink-0">{step.label}</div>
                  <div className="flex-1 h-8 rounded-md bg-obsidian-deep border border-glass-border overflow-hidden relative">
                    <div
                      className={`h-full ${step.color} transition-all`}
                      style={{ width: `${Math.max(step.percent, 8)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-md">
                      <span className="text-caption font-bold text-text-primary">
                        {step.count.toLocaleString("fr-FR")}
                      </span>
                      <span className="ml-xs text-micro text-text-tertiary">
                        {step.percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <RealtimeFeed maxItems={20} />
      </section>

      {/* Alertes */}
      <section>
        <div className="mb-md">
          <Eyebrow>Alertes système</Eyebrow>
        </div>
        <div className="space-y-sm">
          <div className="flex items-center gap-md p-md rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 size={18} className="text-success shrink-0" />
            <div className="flex-1">
              <div className="text-body-bold text-text-primary">Tous les CRON Pieuvre tournent OK</div>
              <div className="text-caption text-text-tertiary">137 workflows actifs · dernière exec il y a 2 min</div>
            </div>
          </div>
          <div className="flex items-center gap-md p-md rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle size={18} className="text-warning shrink-0" />
            <div className="flex-1">
              <div className="text-body-bold text-text-primary">Coût LLM dépasse budget mensuel à 84%</div>
              <div className="text-caption text-text-tertiary">Tendance : Claude Opus +23% cette semaine — investiguer</div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards IA */}
      <section>
        <div className="mb-md">
          <Eyebrow variant="gold">Suggestions IA</Eyebrow>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <GlassCard className="hover:border-violet-royal/30 transition-colors cursor-pointer">
            <div className="flex items-start gap-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-royal/15 text-violet-royal">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-h3 font-bold text-text-primary">3 drivers Marseille inactifs 5j</h3>
                <p className="mt-xxs text-caption text-text-secondary">
                  Lancer le workflow M17 Sentinel pour relance automatique ?
                </p>
                <button className="mt-sm px-md py-xs rounded-lg bg-violet-royal/15 border border-violet-royal/40 text-violet-royal text-caption font-semibold hover:bg-violet-royal/25 transition-colors">
                  Lancer M17
                </button>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="hover:border-violet-royal/30 transition-colors cursor-pointer">
            <div className="flex items-start gap-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-electric/15 text-cyan-electric">
                <Octagon size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-h3 font-bold text-text-primary">38% conversions mentionnent &quot;compta&quot;</h3>
                <p className="mt-xxs text-caption text-text-secondary">
                  Lancer une campagne CTWA ciblée sur l&apos;argument compta automatique ?
                </p>
                <button className="mt-sm px-md py-xs rounded-lg bg-cyan-electric/15 border border-cyan-electric/40 text-cyan-electric text-caption font-semibold hover:bg-cyan-electric/25 transition-colors">
                  Préparer campagne
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
