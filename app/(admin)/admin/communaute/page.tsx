import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { StatCard } from "@/components/foreas/StatCard";
import { createClient } from "@/lib/supabase/server";
import {
  MessageCircle,
  Users,
  Star,
  Globe,
  Bell,
  Trophy,
  Zap,
  Hash,
} from "lucide-react";
import { getAdminGlobalKPIs } from "@/lib/queries/admin";

const CITIES = [
  { name: "Paris IDF", drivers: null, color: "bg-violet-royal/50" },
  { name: "Lyon", drivers: null, color: "bg-cyan-electric/40" },
  { name: "Marseille", drivers: null, color: "bg-success/40" },
  { name: "Bordeaux", drivers: null, color: "bg-warning/40" },
];

const UPCOMING_FEATURES = [
  {
    icon: MessageCircle,
    title: "Feed communauté chauffeurs",
    desc: "Messages, questions, partage d'expériences entre les membres de la flotte FOREAS.",
    color: "bg-violet-royal/10 text-violet-royal",
  },
  {
    icon: Trophy,
    title: "Classements & badges",
    desc: "Top chauffeurs €/h · Meilleures semaines · Badges milestone (100 courses, 1 an, etc.).",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: Bell,
    title: "Alertes communautaires",
    desc: "Notifications de zone (accident autoroute, contrôle police, rush aéroport) remontées par la flotte.",
    color: "bg-cyan-electric/10 text-cyan-electric",
  },
  {
    icon: Globe,
    title: "Groupes par ville",
    desc: "Sous-communautés Paris, Lyon, Marseille, Bordeaux avec coordinateur de zone.",
    color: "bg-success/10 text-success",
  },
];

export default async function AdminCommunautePage() {
  const supabase = await createClient();
  const kpis = await getAdminGlobalKPIs();

  // Try community_alerts table if it exists
  const { data: alerts, error: alertsError } = await supabase
    .from("community_alerts")
    .select("id, type, message, created_at, city")
    .order("created_at", { ascending: false })
    .limit(10);

  const hasAlerts = !alertsError && alerts && alerts.length > 0;

  // Try community_badges table
  const { data: badges } = await supabase
    .from("community_badges")
    .select("id")
    .limit(1);
  const hasBadges = badges !== null;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow variant="violet">Communauté FOREAS</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Communauté
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Le lien entre les {kpis.totalDrivers} chauffeurs de la flotte FOREAS.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Membres (chauffeurs)"
          value={kpis.totalDrivers}
          icon={<Users size={18} />}
          status="success"
        />
        <StatCard
          label="Actifs J30+"
          value={kpis.activeDrivers}
          icon={<Zap size={18} />}
          status="success"
        />
        <StatCard
          label="Partenaires réseau"
          value={kpis.totalPartners}
          icon={<Star size={18} />}
          status="neutral"
        />
        <StatCard
          label="Alertes actives"
          value={hasAlerts ? alerts.length : 0}
          icon={<Bell size={18} />}
          status={hasAlerts && alerts.length > 0 ? "warning" : "neutral"}
        />
      </section>

      {/* Hero état du réseau */}
      <HeroGradientCard glow={kpis.activeDrivers > 0}>
        <div className="flex items-start gap-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/30 border border-white/10">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <Eyebrow>Réseau FOREAS</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {kpis.activeDrivers} chauffeur{kpis.activeDrivers !== 1 ? "s" : ""} actif{kpis.activeDrivers !== 1 ? "s" : ""} en ce moment
            </h2>
            <p className="mt-xs text-body text-text-secondary">
              La communauté grandit chaque semaine. Le module d&apos;échange entre chauffeurs
              est en cours de déploiement — les connexions humaines font la force du réseau FOREAS.
            </p>
          </div>
        </div>
      </HeroGradientCard>

      {/* Alertes communautaires si disponibles */}
      {hasAlerts && (
        <GlassCard>
          <div className="mb-md">
            <Eyebrow variant="cyan">Alertes communautaires</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {alerts.length} alerte{alerts.length !== 1 ? "s" : ""} récente{alerts.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="space-y-xs">
            {alerts.map((a: { id: string; type: string | null; message: string | null; created_at: string | null; city: string | null }) => (
              <div key={a.id} className="flex items-start gap-md p-md rounded-lg bg-warning/5 border border-warning/20">
                <Bell size={14} className="text-warning mt-xxs shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-bold text-text-primary">{a.city ?? "IDF"}</div>
                  <div className="text-caption text-text-secondary mt-xxs">{a.message ?? a.type}</div>
                </div>
                {a.created_at && (
                  <span className="text-micro text-text-tertiary shrink-0 tabular-nums">
                    {new Date(a.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Villes */}
      <section>
        <div className="mb-md">
          <Eyebrow>Géographie du réseau</Eyebrow>
          <p className="mt-xxs text-caption text-text-secondary">Répartition géographique estimée · granularité ville câblée Q3 2026</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
          {CITIES.map((c) => (
            <div key={c.name} className="p-md rounded-lg bg-glass-low border border-glass-border text-center">
              <div className={`w-10 h-10 rounded-full ${c.color} mx-auto mb-sm`} />
              <div className="text-body-bold text-text-primary">{c.name}</div>
              <div className="text-caption text-text-tertiary mt-xxs">En cours de mappage</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features à venir */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow variant="gold">Roadmap communauté — Q3 2026</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            4 modules en construction
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {UPCOMING_FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="p-md rounded-lg bg-glass-low border border-glass-border">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.color} mb-md`}>
                  <Icon size={18} />
                </div>
                <div className="text-body-bold text-text-primary">{f.title}</div>
                <div className="mt-xxs text-caption text-text-secondary">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Vision */}
      <GlassCard variant="low">
        <div className="flex items-start gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal">
            <Hash size={18} />
          </div>
          <div>
            <Eyebrow>Vision FOREAS · Réseau humain</Eyebrow>
            <h3 className="mt-xxs text-h3 font-bold text-text-hero">
              La communauté comme avantage concurrentiel
            </h3>
            <p className="mt-xs text-caption text-text-secondary">
              Uber isole les chauffeurs. FOREAS les connecte. Les meilleurs €/h se partagent entre membres —
              zones chaudes, astuces Ajnaya, alertes trafic temps réel. Le chauffeur FOREAS est informé,
              connecté, et imbattable sur son territoire. C&apos;est ça qui crée le LTV et l&apos;attachement.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
