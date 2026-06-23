import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { StatCard } from "@/components/foreas/StatCard";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle2,
  Minus,
} from "lucide-react";
import {
  getCurrentDriver,
  getDriverKPIs,
  getDriverChurnScore,
  getDriverSignupWeekTrend,
} from "@/lib/queries/driver";
import { redirect } from "next/navigation";
import { formatEUR } from "@/lib/utils";

export default async function DriverCoachPage() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?next=/driver/coach");

  const [kpis, churn, trend] = await Promise.all([
    getDriverKPIs(driver.id),
    getDriverChurnScore(driver.id),
    getDriverSignupWeekTrend(driver.id),
  ]);

  // Score coach calculé depuis données réelles
  // 100 = top performer, 0 = inactif/churn critique
  let coachScore = 75; // base
  if (churn) {
    coachScore = Math.max(0, Math.min(100, 100 - churn.score));
  } else if (kpis.dayEurH >= 40) {
    coachScore = 90;
  } else if (kpis.dayEurH >= 28) {
    coachScore = 75;
  } else if (kpis.dayEurH >= 15) {
    coachScore = 55;
  } else if (kpis.dayEurH > 0) {
    coachScore = 35;
  }

  const riskLevel = churn?.risk_level ?? (coachScore >= 70 ? "low" : coachScore >= 45 ? "medium" : "high");
  const caTrend = churn?.ca_trend ?? (trend.length >= 2 && trend[trend.length - 1].ca > trend[trend.length - 2].ca ? "up" : "stable");

  const scoreColor =
    coachScore >= 70 ? "text-success" : coachScore >= 45 ? "text-warning" : "text-danger";
  const scoreBarColor =
    coachScore >= 70 ? "bg-success" : coachScore >= 45 ? "bg-warning" : "bg-danger";

  const insights: { label: string; value: string; type: "good" | "warn" | "info" }[] = [];

  if (kpis.dayEurH >= 35) {
    insights.push({ label: "Efficacité horaire excellente", value: `${kpis.dayEurH.toFixed(0)}€/h aujourd'hui`, type: "good" });
  } else if (kpis.dayEurH > 0) {
    insights.push({ label: "Marge horaire à optimiser", value: `${kpis.dayEurH.toFixed(0)}€/h — cible 35€+`, type: "warn" });
  }

  if (kpis.dayCount >= 6) {
    insights.push({ label: "Volume de courses fort", value: `${kpis.dayCount} courses aujourd'hui`, type: "good" });
  } else if (kpis.dayCount > 0) {
    insights.push({ label: "Volume en dessous de la cible", value: `${kpis.dayCount} courses — cible 6+`, type: "warn" });
  }

  if (caTrend === "up") {
    insights.push({ label: "Tendance CA à la hausse", value: "Ton CA monte semaine/semaine", type: "good" });
  } else if (caTrend === "down") {
    insights.push({ label: "CA en baisse détecté", value: "Ajnaya recommande d'ajuster tes créneaux", type: "warn" });
  } else {
    insights.push({ label: "CA stable sur la période", value: "Pas de dégradation — maintenir le rythme", type: "info" });
  }

  if (churn?.intervention_recommended) {
    insights.push({ label: "Recommandation Ajnaya", value: churn.intervention_recommended, type: "warn" });
  }

  const lastWeek = trend[trend.length - 1];
  const prevWeek = trend[trend.length - 2];
  const caEvol = lastWeek && prevWeek && prevWeek.ca > 0
    ? ((lastWeek.ca - prevWeek.ca) / prevWeek.ca) * 100
    : null;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Intelligence artificielle</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Coach Ajnaya
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Tes verdicts personnalisés. Basés sur tes vraies données, pas des moyennes génériques.
        </p>
      </header>

      {/* Score hero */}
      <HeroGradientCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-xl">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-black/30 border border-white/10">
            <Sparkles size={36} className="text-white" />
          </div>
          <div className="flex-1">
            <Eyebrow>Score Coach Ajnaya</Eyebrow>
            <div className="mt-xs flex items-baseline gap-md">
              <span className={`text-display-xxl font-extrabold tabular-nums ${scoreColor}`}>
                {coachScore}
              </span>
              <span className="text-h2 text-text-secondary font-bold">/100</span>
            </div>
            <div className="mt-md h-2 rounded-full bg-black/30 overflow-hidden w-full max-w-xs">
              <div
                className={`h-full rounded-full transition-all ${scoreBarColor}`}
                style={{ width: `${coachScore}%` }}
              />
            </div>
          </div>
          <div className="sm:text-right">
            <span className={`inline-flex px-md py-xs rounded-pill text-caption font-bold border ${
              riskLevel === "low" ? "bg-success/10 text-success border-success/30" :
              riskLevel === "medium" ? "bg-warning/10 text-warning border-warning/30" :
              "bg-danger/10 text-danger border-danger/30"
            }`}>
              Risque {riskLevel === "low" ? "faible" : riskLevel === "medium" ? "moyen" : "élevé"}
            </span>
            {churn?.scored_at && (
              <p className="mt-xs text-micro text-text-tertiary">
                Analysé {new Date(churn.scored_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </HeroGradientCard>

      {/* KPI stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="€/h aujourd'hui"
          value={`${kpis.dayEurH.toFixed(0)}€`}
          icon={<Zap size={18} />}
          status={kpis.dayEurH >= 35 ? "success" : kpis.dayEurH >= 20 ? "warning" : kpis.dayEurH > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="CA semaine"
          value={kpis.weekCA}
          format="eur"
          icon={<TrendingUp size={18} />}
          status="neutral"
        />
        <StatCard
          label="Courses ce mois"
          value={kpis.totalRides}
          icon={<Brain size={18} />}
          status="neutral"
        />
        {caEvol !== null ? (
          <StatCard
            label="Évolution CA sem."
            value={`${caEvol >= 0 ? "+" : ""}${caEvol.toFixed(1)}%`}
            icon={caEvol >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            status={caEvol >= 5 ? "success" : caEvol >= -5 ? "neutral" : "warning"}
          />
        ) : (
          <StatCard
            label="Données semaine"
            value="—"
            icon={<Brain size={18} />}
            status="neutral"
          />
        )}
      </section>

      {/* Insights Ajnaya */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow>Analyse Ajnaya</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            {insights.length} verdict{insights.length !== 1 ? "s" : ""} sur ton activité
          </h2>
        </div>
        <div className="space-y-sm">
          {insights.length > 0 ? insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-md p-md rounded-lg border ${
                ins.type === "good"
                  ? "bg-success/5 border-success/20"
                  : ins.type === "warn"
                  ? "bg-warning/5 border-warning/20"
                  : "bg-glass-low border-glass-border"
              }`}
            >
              <div className={`mt-xxs shrink-0 ${
                ins.type === "good" ? "text-success" : ins.type === "warn" ? "text-warning" : "text-text-tertiary"
              }`}>
                {ins.type === "good" ? <CheckCircle2 size={16} /> : ins.type === "warn" ? <AlertCircle size={16} /> : <Minus size={16} />}
              </div>
              <div>
                <div className="text-body-bold text-text-primary">{ins.label}</div>
                <div className="text-caption text-text-secondary mt-xxs">{ins.value}</div>
              </div>
            </div>
          )) : (
            <div className="py-huge text-center">
              <Brain size={36} className="mx-auto text-text-tertiary mb-md" />
              <p className="text-body text-text-tertiary">
                Ajnaya analyse tes courses. Reviens après ta première journée active.
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Tendance CA par semaine */}
      {trend.length > 0 && (
        <GlassCard>
          <div className="mb-lg">
            <Eyebrow variant="cyan">Tendance 4 semaines</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">CA par semaine</h2>
          </div>
          <div className="space-y-sm">
            {trend.map((w, i) => {
              const maxCa = Math.max(...trend.map((t) => t.ca), 1);
              const pct = (w.ca / maxCa) * 100;
              return (
                <div key={i} className="flex items-center gap-md">
                  <div className="text-caption text-text-tertiary w-20 shrink-0 tabular-nums">{w.weekLabel}</div>
                  <div className="flex-1 h-7 rounded-md bg-obsidian-deep border border-glass-border overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-royal transition-all"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-md">
                      <span className="text-caption font-bold text-text-primary tabular-nums">
                        {formatEUR(w.ca)}
                      </span>
                      <span className="ml-xs text-micro text-text-tertiary">
                        · {w.rides} courses · {w.eurPerHour.toFixed(0)}€/h
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Module connexion Pieuvre */}
      <GlassCard variant="low">
        <div className="flex items-start gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal">
            <Sparkles size={18} />
          </div>
          <div>
            <Eyebrow>Coaching temps réel</Eyebrow>
            <h3 className="mt-xxs text-h3 font-bold text-text-hero">
              Coach Réflexe IA — connexion tentacule en cours
            </h3>
            <p className="mt-xs text-caption text-text-secondary">
              Les verdicts ci-dessus sont calculés depuis tes vraies données. La connexion
              temps réel avec le tentacule COACH de la Pieuvre (notifications push pendant
              la conduite) sera active prochainement. Retrouve-les dès maintenant dans l&apos;app mobile.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
