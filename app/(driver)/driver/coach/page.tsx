import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Sparkles, TrendingUp, Brain } from "lucide-react";

export default function DriverCoachPage() {
  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Intelligence artificielle</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Coach Ajnaya
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Tes verdicts personnalisés et tes économies cachées.
        </p>
      </header>

      <GlassCard variant="elevated">
        <div className="flex items-center gap-md mb-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-royal shadow-glow">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-h1 font-bold text-text-hero">Score Coach : 87/100</h2>
            <p className="text-caption text-text-secondary">Tu fais mieux que 73% des chauffeurs FOREAS sur ta zone.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div className="p-md rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-xs text-success mb-xs">
              <TrendingUp size={14} />
              <span className="text-micro uppercase font-bold">Économies cette semaine</span>
            </div>
            <div className="text-h2 font-extrabold text-text-hero">+142€</div>
            <div className="text-caption text-text-secondary">vs ton ancien pattern</div>
          </div>
          <div className="p-md rounded-lg bg-violet-royal/10 border border-violet-royal/20">
            <div className="flex items-center gap-xs text-violet-royal mb-xs">
              <Brain size={14} />
              <span className="text-micro uppercase font-bold">Patterns détectés</span>
            </div>
            <div className="text-h2 font-extrabold text-text-hero">12</div>
            <div className="text-caption text-text-secondary">cette semaine</div>
          </div>
          <div className="p-md rounded-lg bg-cyan-electric/10 border border-cyan-electric/20">
            <div className="flex items-center gap-xs text-cyan-electric mb-xs">
              <Sparkles size={14} />
              <span className="text-micro uppercase font-bold">Recommandations</span>
            </div>
            <div className="text-h2 font-extrabold text-text-hero">5</div>
            <div className="text-caption text-text-secondary">à appliquer</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <Eyebrow>Module en cours d&apos;activation</Eyebrow>
        <h2 className="mt-xxs text-h1 font-bold text-text-hero">Coach Réflexe IA</h2>
        <p className="mt-xs text-body text-text-secondary">
          La connexion temps réel avec Ajnaya (tentacule COACH de la Pieuvre) sera
          active dans les prochaines semaines. En attendant, retrouve tes verdicts
          dans l&apos;app mobile FOREAS Driver.
        </p>
      </GlassCard>
    </div>
  );
}
