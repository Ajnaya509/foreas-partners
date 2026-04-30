import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Map, MapPin, Flame } from "lucide-react";

export default function DriverHeatmapPage() {
  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Géo-intelligence</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Zones live
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Heatmap temps réel des zones les plus rentables par heure.
        </p>
      </header>

      <GlassCard className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Map size={48} className="mx-auto text-violet-royal/40 mb-md" />
          <h3 className="text-h2 font-bold text-text-hero mb-xs">
            Heatmap H3 — KVM4 en cours d&apos;activation
          </h3>
          <p className="text-body text-text-secondary max-w-md mx-auto">
            Le moteur géospatial H3 + GTFS-RT + Chronos-2 est en cours de déploiement.
            En attendant, consulte l&apos;app mobile pour les 7 zones intelligentes actives.
          </p>
        </div>
      </GlassCard>

      <section>
        <Eyebrow>Zones intelligentes (V1)</Eyebrow>
        <div className="mt-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {[
            { name: "La Défense", rate: "52€/h", distance: "2 km" },
            { name: "Champs-Élysées", rate: "48€/h", distance: "5 km" },
            { name: "Bastille", rate: "41€/h", distance: "3 km" },
            { name: "Gare du Nord", rate: "38€/h", distance: "4 km" },
            { name: "Aéroport CDG", rate: "65€/h", distance: "22 km" },
            { name: "Aéroport Orly", rate: "58€/h", distance: "18 km" },
            { name: "Bercy / Lyon", rate: "35€/h", distance: "6 km" },
          ].map((z, i) => (
            <GlassCard key={i} variant="low" className="hover:border-violet-royal/40 transition-colors cursor-pointer">
              <div className="flex items-start gap-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-royal/15 text-violet-royal">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-body-bold text-text-primary">{z.name}</div>
                  <div className="text-caption text-text-tertiary">{z.distance}</div>
                </div>
                <div className="text-h3 font-extrabold text-violet-royal flex items-center gap-xxs">
                  <Flame size={14} className="text-warning" />
                  {z.rate}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
