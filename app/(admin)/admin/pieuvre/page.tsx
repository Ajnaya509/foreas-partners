import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { Octagon, Activity, AlertTriangle, CheckCircle2, Brain } from "lucide-react";
import { getActiveFeatureFlags, getPieuvreWorkflowHealth } from "@/lib/queries/admin";

export default async function AdminPieuvrePage() {
  const [flags, workflows] = await Promise.all([
    getActiveFeatureFlags(),
    getPieuvreWorkflowHealth(),
  ]);

  // Active vs inactive tentacules
  const tentaclesEnabled = flags.filter((f) => f.key.startsWith("pieuvre_") && f.enabled).length;
  const tentaclesDisabled = flags.filter((f) => f.key.startsWith("pieuvre_") && !f.enabled).length;

  // Workflow stats
  type Wf = { workflow_id: string; status: string; executed_at: string; error_message: string | null };
  const wfList = (workflows as Wf[] | undefined) ?? [];
  const wfOk = wfList.filter((w) => w.status === "success" || w.status === "ok").length;
  const wfErrors = wfList.filter((w) => w.status === "error" || w.status === "failed").length;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow variant="violet">Cerveau IA FOREAS</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Pieuvre Ajnaya
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Monitoring temps réel des 18 tentacules + workflows N8N + coût LLM.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="Tentacules actifs" value={tentaclesEnabled} icon={<Octagon size={18} />} status="success" />
        <StatCard label="Bloqués (KVM4)" value={tentaclesDisabled} icon={<AlertTriangle size={18} />} status="warning" />
        <StatCard label="Workflows OK (100 derniers)" value={wfOk} icon={<CheckCircle2 size={18} />} status="success" />
        <StatCard label="Workflows en erreur" value={wfErrors} icon={<AlertTriangle size={18} />} status={wfErrors > 0 ? "danger" : "success"} />
      </section>

      <section>
        <div className="mb-md">
          <Eyebrow>Tentacules de la Pieuvre</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {flags
            .filter((f) => f.key.startsWith("pieuvre_") && !f.key.includes("learning"))
            .slice(0, 21)
            .map((f) => {
              const name = f.key
                .replace("pieuvre_", "")
                .replace("_active", "")
                .replace("_n8n", "")
                .replace(/_/g, " ")
                .toUpperCase();
              return (
                <div
                  key={f.key}
                  className={`p-md rounded-lg border transition-colors ${
                    f.enabled
                      ? "bg-success/5 border-success/20"
                      : "bg-warning/5 border-warning/20"
                  }`}
                >
                  <div className="flex items-center gap-xs">
                    <span className={`w-2 h-2 rounded-full ${f.enabled ? "bg-success animate-pulse-soft" : "bg-warning"}`} />
                    <span className="text-body-bold text-text-primary">{name}</span>
                  </div>
                  <p className="mt-xxs text-caption text-text-tertiary line-clamp-2">{f.description}</p>
                </div>
              );
            })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <GlassCard>
          <Eyebrow variant="cyan">LLM Routing</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">Multi-modèle</h2>
          <div className="mt-md space-y-sm">
            {[
              { name: "Claude Haiku", usage: "Réponses temps réel", color: "bg-cyan-electric" },
              { name: "Claude Sonnet", usage: "Analyse comportement", color: "bg-violet-royal" },
              { name: "Claude Opus", usage: "Décisions DG Telegram", color: "bg-gold-radiant" },
              { name: "Groq Whisper", usage: "Transcription voix", color: "bg-success" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-md p-md rounded-lg bg-glass-low border border-glass-border">
                <div className={`w-2 h-8 rounded-full ${m.color}`} />
                <div className="flex-1">
                  <div className="text-body-bold text-text-primary">{m.name}</div>
                  <div className="text-caption text-text-tertiary">{m.usage}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <Eyebrow variant="gold">Workflows récents</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">Activité 100 derniers</h2>
          <div className="mt-md max-h-80 overflow-y-auto scrollbar-thin space-y-xs">
            {wfList.slice(0, 15).map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-sm p-xs rounded-md hover:bg-glass-low transition-colors"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    w.status === "success" || w.status === "ok"
                      ? "bg-success"
                      : w.status === "error" || w.status === "failed"
                      ? "bg-danger"
                      : "bg-warning"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-caption text-text-primary truncate font-mono">
                    {w.workflow_id ?? "unknown"}
                  </div>
                </div>
                <div className="text-micro text-text-tertiary shrink-0">
                  {w.executed_at && new Date(w.executed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            {wfList.length === 0 && (
              <p className="text-caption text-text-tertiary text-center py-md">
                Aucun workflow récent.
              </p>
            )}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
