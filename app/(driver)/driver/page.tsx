import { Eyebrow } from "@/components/foreas/Eyebrow";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { ActionChip } from "@/components/foreas/ActionChip";
import { StatCard } from "@/components/foreas/StatCard";
import { GlassCard } from "@/components/foreas/GlassCard";
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
} from "lucide-react";
import { getCurrentDriver, getDriverKPIs } from "@/lib/queries/driver";
import { redirect } from "next/navigation";
import { formatEUR } from "@/lib/utils";
import Link from "next/link";

export default async function DriverDashboardPage() {
  const driver = await getCurrentDriver();
  if (!driver) {
    redirect("/login?next=/driver");
  }

  const kpis = await getDriverKPIs(driver.id);

  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const greetingName = driver.first_name ?? "Chauffeur";

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Hero — Bonjour + actions */}
      <section>
        <HeroGradientCard glow={false}>
          <div className="mb-lg">
            <Eyebrow>{today}</Eyebrow>
            <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
              Bonjour {greetingName}.
            </h1>
            <p className="mt-xs text-body-lg text-text-secondary">
              Tu as <span className="text-violet-royal font-bold">2 actions</span> qui peuvent te rapporter aujourd&apos;hui.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-md">
            <ActionChip
              status="info"
              driverName="Hôtel Le Marais"
              context="Course privée vers CDG · 75€"
              cta="Accepter"
              icon={<Star size={18} />}
              pulsing
            />
            <ActionChip
              status="warning"
              driverName="La Défense"
              context="Zone live · ~52€/h · 2 km"
              cta="Y aller"
              icon={<MapPin size={18} />}
            />
          </div>
        </HeroGradientCard>
      </section>

      {/* KPI Row */}
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
            value="87"
            icon={<Sparkles size={18} />}
            status="success"
          />
          <StatCard
            label="Streak"
            value={`${kpis.dayCount > 0 ? "🔥" : ""} ${kpis.dayCount} courses`}
            icon={<Flame size={18} />}
            status={kpis.dayCount >= 5 ? "success" : "neutral"}
          />
        </div>
      </section>

      {/* Sections preview */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
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
              Voir mes économies →
            </div>
          </GlassCard>
        </Link>

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

      {/* Récap mois */}
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
