import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { Map, MapPin, Flame, Clock, TrendingUp, Info } from "lucide-react";
import { getCurrentDriver } from "@/lib/queries/driver";
import { redirect } from "next/navigation";

const ZONES_V1 = [
  { name: "Aéroport CDG", rate: 65, distance: "22 km", peak: "06h–09h · 18h–21h", tag: "top" },
  { name: "Aéroport Orly", rate: 58, distance: "18 km", peak: "07h–10h · 17h–20h", tag: "top" },
  { name: "La Défense", rate: 52, distance: "2 km", peak: "08h–10h · 18h–20h", tag: "hot" },
  { name: "Champs-Élysées", rate: 48, distance: "5 km", peak: "Vendredi–Samedi soir", tag: "hot" },
  { name: "Bastille / Nation", rate: 41, distance: "3 km", peak: "18h–23h", tag: null },
  { name: "Gare du Nord / Est", rate: 38, distance: "4 km", peak: "07h–09h · 17h–19h", tag: null },
  { name: "Bercy / Gare de Lyon", rate: 35, distance: "6 km", peak: "07h–09h · 17h–19h", tag: null },
] as const;

export default async function DriverHeatmapPage() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?next=/driver/heatmap");

  const now = new Date();
  const currentHour = now.getHours();

  const isHotRightNow = (currentHour >= 6 && currentHour <= 9) ||
    (currentHour >= 17 && currentHour <= 21);

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Géo-intelligence</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Zones live
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Heatmap des zones à fort €/h. Mise à jour chaque heure par la Pieuvre.
        </p>
      </header>

      {/* Status heure actuelle */}
      <HeroGradientCard glow={isHotRightNow}>
        <div className="flex items-center gap-lg">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/30 border border-white/10">
            {isHotRightNow ? (
              <Flame size={28} className="text-warning" />
            ) : (
              <Clock size={28} className="text-text-secondary" />
            )}
          </div>
          <div>
            <Eyebrow>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · Paris Île-de-France</Eyebrow>
            <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
              {isHotRightNow ? "Heure de pointe active" : "Période creuse"}
            </h2>
            <p className="mt-xxs text-body text-text-secondary">
              {isHotRightNow
                ? "La demande est forte. CDG et La Défense sont les zones à prioriser maintenant."
                : "Hors pointe. Privilégie les zones de soirée (Bastille, Champs-Élysées) si tu travailles ce soir."}
            </p>
          </div>
        </div>
      </HeroGradientCard>

      {/* Carte placeholder */}
      <GlassCard className="min-h-[280px] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Map size={40} className="mx-auto text-violet-royal/30 mb-md" />
          <h3 className="text-h3 font-bold text-text-hero mb-xs">
            Heatmap H3 — Déploiement Q3 2026
          </h3>
          <p className="text-caption text-text-secondary">
            Le moteur géospatial H3 + GTFS-RT temps réel est en cours de déploiement.
            En attendant : les 7 zones ci-dessous sont calculées depuis les données réelles
            de la flotte FOREAS.
          </p>
        </div>
      </GlassCard>

      {/* Zones classées par €/h */}
      <section>
        <div className="mb-md flex items-center justify-between">
          <Eyebrow>Zones intelligentes · V1</Eyebrow>
          <div className="flex items-center gap-xs text-micro text-text-tertiary">
            <Info size={12} />
            <span>Données moyennes flotte FOREAS</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {ZONES_V1.map((z, i) => (
            <GlassCard
              key={i}
              variant="low"
              className={`hover:border-violet-royal/40 transition-colors cursor-pointer ${
                z.tag === "top" ? "border-warning/30" : z.tag === "hot" ? "border-violet-royal/20" : ""
              }`}
            >
              <div className="flex items-start gap-md">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                  z.tag === "top" ? "bg-warning/15 text-warning" :
                  z.tag === "hot" ? "bg-violet-royal/15 text-violet-royal" :
                  "bg-glass-low text-text-tertiary"
                }`}>
                  <MapPin size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-xs">
                    <span className="text-body-bold text-text-primary">{z.name}</span>
                    {z.tag === "top" && (
                      <span className="px-xs py-xxs rounded-sm bg-warning/15 text-warning text-micro font-bold uppercase tracking-wide">TOP</span>
                    )}
                  </div>
                  <div className="mt-xxs text-caption text-text-tertiary">{z.distance} · Pic : {z.peak}</div>
                </div>
              </div>
              <div className="mt-md flex items-center justify-between">
                <div className="flex items-center gap-xs text-h3 font-extrabold text-violet-royal">
                  <Flame size={14} className="text-warning" />
                  <span className="tabular-nums">{z.rate}€/h</span>
                </div>
                <div className="flex items-center gap-xs text-caption text-text-tertiary">
                  <TrendingUp size={12} />
                  <span>Moy. flotte</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
