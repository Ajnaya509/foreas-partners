import { Eyebrow } from "@/components/foreas/Eyebrow";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { ActionChip } from "@/components/foreas/ActionChip";
import { StatCard } from "@/components/foreas/StatCard";
import { GlassCard } from "@/components/foreas/GlassCard";
import { TierBadge } from "@/components/foreas/TierBadge";
import { UpgradeGate } from "@/components/foreas/UpgradeGate";
import {
  Euro,
  Zap,
  Sparkles,
  Flame,
  MapPin,
  Star,
  Users,
  Briefcase,
  FileText,
  Map,
} from "lucide-react";
import {
  getCurrentDriver,
  getDriverKPIs,
  getDriverChurnScore,
  getDriverTier,
  getDriverUrgentActions,
} from "@/lib/queries/driver";
import { redirect } from "next/navigation";
import { formatEUR } from "@/lib/utils";
import Link from "next/link";

// Mapping iconKey → JSX (évite de sérialiser JSX depuis Server vers Client)
const ICON_MAP = {
  star: <Star size={18} />,
  mapPin: <MapPin size={18} />,
  sparkles: <Sparkles size={18} />,
  alertTriangle: <Flame size={18} />,
} as const;

export default async function DriverDashboardPage() {
  const driver = await getCurrentDriver();
  if (!driver) {
    redirect("/login?role=driver&next=/driver");
  }

  // Sous-titre hero dynamique selon tier
  const TIER_SUBTITLE: Record<string, string> = {
    free: "3 insights Ajnaya disponibles aujourd'hui.",
    pro: "Ajnaya prête. Toutes tes zones en temps réel.",
    elite: "Priorité courses FOREAS activée. Tu passes avant tout le monde.",
  };

  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const greetingName = driver.first_name ?? "Chauffeur";

  // Toutes les data en parallèle
  const [kpis, churnScore, driverTier, urgentActions] = await Promise.all([
    getDriverKPIs(driver.id),
    getDriverChurnScore(driver.id),
    getDriverTier(driver.id),
    getDriverUrgentActions(driver.id),
  ]);

  // Score coach : 100 - churnScore.score (score churn inversé = performance)
  const coachScore = churnScore ? 100 - churnScore.score : null;
  const coachStatus =
    coachScore === null ? "neutral" :
    coachScore >= 70 ? "success" :
    coachScore >= 50 ? "warning" : "danger";

  const tierSubtitle = TIER_SUBTITLE[driverTier] ?? TIER_SUBTITLE.free;

  return (
    <div className="space-y-xl animate-fade-in-down">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section>
        <HeroGradientCard glow={false}>
          <div className="mb-lg">
            <div className="flex items-center gap-sm mb-xs">
              <Eyebrow>{today}</Eyebrow>
              <TierBadge tier={driverTier} size="sm" />
            </div>
            <h1 className="text-display-l font-extrabold text-text-hero">
              Bonjour {greetingName}.
            </h1>
            <p className="mt-xs text-body-lg text-text-secondary">
              {urgentActions.length > 0 ? (
                <>
                  Tu as{" "}
                  <span className="text-violet-royal font-bold">
                    {urgentActions.length} action{urgentActions.length > 1 ? "s" : ""}
                  </span>{" "}
                  qui peuvent te rapporter aujourd&apos;hui.
                </>
              ) : (
                tierSubtitle
              )}
            </p>
          </div>

          {urgentActions.length > 0 && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-md">
              {urgentActions.map((action, i) => (
                <ActionChip
                  key={i}
                  status={action.status}
                  context={action.context}
                  cta={action.cta}
                  icon={ICON_MAP[action.iconKey]}
                  pulsing={action.pulsing}
                />
              ))}
            </div>
          )}
        </HeroGradientCard>
      </section>

      {/* ── KPI Row ───────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-md">
          <Eyebrow>Aujourd&apos;hui</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
          <StatCard
            label="€ aujourd'hui"
            value={kpis.dayCA}
            format="eur"
            icon={<Euro size={18} />}
            status="success"
          />
          <StatCard
            label="€ par heure"
            value={`${kpis.dayEurH.toFixed(1)}€`}
            icon={<Zap size={18} />}
            status={kpis.dayEurH >= 30 ? "success" : kpis.dayEurH >= 20 ? "warning" : "danger"}
          />
          <StatCard
            label="Coach Ajnaya"
            value={coachScore !== null ? String(coachScore) : "—"}
            icon={<Sparkles size={18} />}
            status={coachStatus}
          />
          <StatCard
            label="Streak"
            value={`${kpis.dayCount > 0 ? "🔥" : ""} ${kpis.dayCount} courses`}
            icon={<Flame size={18} />}
            status={kpis.dayCount >= 5 ? "success" : "neutral"}
          />
        </div>
      </section>

      {/* ── Sections 2×2 ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">

        {/* Coach Ajnaya — Pro requis */}
        <UpgradeGate
          feature="coach"
          currentTier={driverTier}
          requiredTier="pro"
          upgradeText="Cette course Uber rapporte 28€/h. Pro te le dit en 0.3 sec."
        >
          <Link href="/driver/coach">
            <GlassCard className="h-full hover:border-violet-royal/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-md mb-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-royal/15 text-violet-royal">
                  <Sparkles size={18} />
                </div>
                <div>
                  <Eyebrow>Coach Ajnaya</Eyebrow>
                  <h3 className="text-h2 font-bold text-text-hero">Mes verdicts</h3>
                </div>
              </div>
              <p className="text-body text-text-secondary">
                Recommandations IA temps réel sur tes zones, tes courses, ton enchaînement.
                Score performance + insights cachés.
              </p>
              <div className="mt-md text-caption text-violet-royal font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-xs">
                Voir mes recommandations →
              </div>
            </GlassCard>
          </Link>
        </UpgradeGate>

        {/* Heatmap — Pro requis */}
        <UpgradeGate
          feature="heatmap"
          currentTier={driverTier}
          requiredTier="pro"
          upgradeText="Concerts, grèves, aéroports. Pro te dit où aller AVANT tout le monde."
        >
          <Link href="/driver/heatmap">
            <GlassCard className="h-full hover:border-cyan-electric/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-md mb-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-electric/15 text-cyan-electric">
                  <Map size={18} />
                </div>
                <div>
                  <Eyebrow variant="cyan">Zones live</Eyebrow>
                  <h3 className="text-h2 font-bold text-text-hero">Heatmap</h3>
                </div>
              </div>
              <p className="text-body text-text-secondary">
                PredictHQ + SNCF + météo + Bolt + IDFM. Zones chaudes en temps réel.
                Multi-source, mis à jour toutes les 15 min.
              </p>
              <div className="mt-md text-caption text-cyan-electric font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-xs">
                Voir les zones →
              </div>
            </GlassCard>
          </Link>
        </UpgradeGate>

        {/* Clients privés — Pro requis */}
        <UpgradeGate
          feature="clients-prives"
          currentTier={driverTier}
          requiredTier="pro"
          upgradeText="Maître Jeantet a cliqué sur ton site hier. Tu peux lui répondre maintenant."
        >
          <Link href="/driver/clients-prives">
            <GlassCard className="h-full hover:border-violet-royal/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-md mb-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-electric/15 text-cyan-electric">
                  <Briefcase size={18} />
                </div>
                <div>
                  <Eyebrow variant="cyan">Clients privés</Eyebrow>
                  <h3 className="text-h2 font-bold text-text-hero">Pipeline VIP</h3>
                </div>
              </div>
              <p className="text-body text-text-secondary">
                Hôtels, conciergeries, entreprises. Courses 80-200€ hors Uber/Bolt,
                direct sur ton compte.
              </p>
              <div className="mt-md text-caption text-cyan-electric font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-xs">
                Voir le pipeline →
              </div>
            </GlassCard>
          </Link>
        </UpgradeGate>

        {/* Parrainage MLM — toujours accessible */}
        <Link href="/driver/parrainage">
          <GlassCard className="h-full hover:border-violet-royal/30 transition-colors group cursor-pointer">
            <div className="flex items-center gap-md mb-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-radiant/15 text-gold-radiant">
                <Users size={18} />
              </div>
              <div>
                <Eyebrow variant="gold">MLM 3 niveaux</Eyebrow>
                <h3 className="text-h2 font-bold text-text-hero">Parrainage</h3>
              </div>
            </div>
            <p className="text-body text-text-secondary">
              Recrute des chauffeurs FOREAS, gagne des commissions à vie.
              N1 = 10€, N2 = 4€, N3 = 2€/mois par filleul actif.
            </p>
            <div className="mt-md text-caption text-gold-radiant font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-xs">
              Mon arbre →
            </div>
          </GlassCard>
        </Link>

      </section>

      {/* ── Compta / Paie ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">

        {/* Paie CAE — toujours accessible */}
        <Link href="/driver/paie">
          <GlassCard className="h-full hover:border-violet-royal/30 transition-colors group cursor-pointer">
            <div className="flex items-center gap-md mb-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
                <FileText size={18} />
              </div>
              <div>
                <Eyebrow variant="muted">CAE FOREAS</Eyebrow>
                <h3 className="text-h2 font-bold text-text-hero">Ma fiche de paie</h3>
              </div>
            </div>
            <p className="text-body text-text-secondary">
              CDI entrepreneur-salarié. Cotisations payées chaque vendredi.
              Prochaine fiche : début du mois suivant.
            </p>
            <div className="mt-md text-caption text-success font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-xs">
              Télécharger →
            </div>
          </GlassCard>
        </Link>

        {/* Compta IA OCR — Pro requis */}
        <UpgradeGate
          feature="compta-ocr"
          currentTier={driverTier}
          requiredTier="pro"
          upgradeText="Photographie ton ticket Uber, l'OCR fait le reste. 0 saisie manuelle."
        >
          <Link href="/driver/paie">
            <GlassCard className="h-full hover:border-cyan-electric/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-md mb-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-electric/15 text-cyan-electric">
                  <Zap size={18} />
                </div>
                <div>
                  <Eyebrow variant="cyan">Compta IA</Eyebrow>
                  <h3 className="text-h2 font-bold text-text-hero">OCR automatique</h3>
                </div>
              </div>
              <p className="text-body text-text-secondary">
                Tirelire URSSAF auto. OCR tickets Uber/Bolt. 0 saisie.
                Guardrail M18 inclus pour les pros aguerris.
              </p>
              <div className="mt-md text-caption text-cyan-electric font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-xs">
                Ma compta →
              </div>
            </GlassCard>
          </Link>
        </UpgradeGate>

      </section>

      {/* ── Récap période ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-md">
          <Eyebrow>Récap période</Eyebrow>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-lg">
          <StatCard
            label="CA cette semaine"
            value={kpis.weekCA}
            format="eur"
            icon={<Euro size={18} />}
            status="neutral"
          />
          <StatCard
            label="CA ce mois"
            value={kpis.monthCA}
            format="eur"
            icon={<Euro size={18} />}
            status="neutral"
          />
          <StatCard
            label="Total courses ce mois"
            value={kpis.totalRides}
            icon={<Flame size={18} />}
            status="neutral"
          />
        </div>
      </section>

    </div>
  );
}
