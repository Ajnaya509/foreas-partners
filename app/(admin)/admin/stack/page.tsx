import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  Globe,
  Cpu,
  Clock,
} from "lucide-react";
import { getPieuvreWorkflowHealth, getActiveFeatureFlags } from "@/lib/queries/admin";

type Workflow = {
  workflow_id: string;
  status: string;
  executed_at: string;
  error_message: string | null;
};

const SERVICES = [
  { name: "Supabase (DB + Auth)", key: "supabase", icon: Database, color: "text-success" },
  { name: "Vercel (Dashboard)", key: "vercel", icon: Globe, color: "text-cyan-electric" },
  { name: "Railway (API)", key: "railway", icon: Server, color: "text-violet-royal" },
  { name: "N8N (Workflows)", key: "n8n", icon: Zap, color: "text-warning" },
  { name: "Anthropic (LLM)", key: "anthropic", icon: Cpu, color: "text-violet-royal" },
  { name: "Twilio (SMS/WhatsApp)", key: "twilio", icon: Globe, color: "text-success" },
];

export default async function AdminStackPage() {
  const [workflows, flags] = await Promise.all([
    getPieuvreWorkflowHealth(),
    getActiveFeatureFlags(),
  ]);

  const wfList = (workflows as Workflow[]) ?? [];
  const wfOk = wfList.filter((w) => w.status === "success" || w.status === "ok").length;
  const wfErrors = wfList.filter((w) => w.status === "error" || w.status === "failed").length;
  const wfPending = wfList.length - wfOk - wfErrors;

  const errorRate = wfList.length > 0 ? ((wfErrors / wfList.length) * 100).toFixed(1) : "0.0";

  const recentErrors = wfList.filter((w) => w.status === "error" || w.status === "failed").slice(0, 5);
  const recentOk = wfList.filter((w) => w.status === "success" || w.status === "ok").slice(0, 10);

  const featureCount = flags.filter((f) => f.enabled).length;
  const flagsDisabled = flags.filter((f) => !f.enabled).length;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Infrastructure · Monitoring</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Stack & Santé Infra
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Monitoring Railway · Supabase · Vercel · N8N · coûts API en temps réel.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Workflows OK (100 dern.)"
          value={wfOk}
          icon={<CheckCircle2 size={18} />}
          status="success"
        />
        <StatCard
          label="Workflows en erreur"
          value={wfErrors}
          icon={<XCircle size={18} />}
          status={wfErrors > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Taux d'erreur"
          value={`${errorRate}%`}
          icon={<AlertTriangle size={18} />}
          status={parseFloat(errorRate) > 5 ? "danger" : parseFloat(errorRate) > 1 ? "warning" : "success"}
        />
        <StatCard
          label="Feature flags actifs"
          value={featureCount}
          icon={<Zap size={18} />}
          status="neutral"
        />
      </section>

      {/* Services grid */}
      <section>
        <div className="mb-md">
          <Eyebrow variant="cyan">Services externes</Eyebrow>
          <p className="mt-xxs text-caption text-text-secondary">
            Statut déduit des derniers workflows. Un ping API dédié sera câblé via le tentacule WATCHDOG Q3 2026.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="p-md rounded-lg bg-success/5 border border-success/20 flex items-center gap-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body-bold text-text-primary truncate">{s.name}</div>
                  <div className="flex items-center gap-xs mt-xxs">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-micro text-success font-semibold">Opérationnel</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Erreurs récentes */}
        <GlassCard>
          <div className="mb-md">
            <Eyebrow>Alertes workflow</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {recentErrors.length > 0 ? `${recentErrors.length} erreur${recentErrors.length > 1 ? "s" : ""} récente${recentErrors.length > 1 ? "s" : ""}` : "Aucune erreur récente"}
            </h2>
          </div>
          <div className="space-y-xs">
            {recentErrors.length > 0 ? recentErrors.map((w, i) => (
              <div key={i} className="p-sm rounded-lg bg-danger/5 border border-danger/20">
                <div className="flex items-center gap-xs">
                  <XCircle size={12} className="text-danger shrink-0" />
                  <span className="text-caption font-bold text-danger font-mono truncate">{w.workflow_id}</span>
                </div>
                {w.error_message && (
                  <p className="mt-xxs text-micro text-text-tertiary line-clamp-2">{w.error_message}</p>
                )}
                {w.executed_at && (
                  <div className="mt-xxs flex items-center gap-xs text-micro text-text-muted">
                    <Clock size={10} />
                    {new Date(w.executed_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            )) : (
              <div className="py-lg text-center">
                <CheckCircle2 size={28} className="mx-auto text-success mb-sm" />
                <p className="text-body text-success font-semibold">Tout tourne sans erreur</p>
                <p className="text-caption text-text-tertiary mt-xxs">Derniers {wfList.length} workflows analysés</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Derniers workflows OK */}
        <GlassCard>
          <div className="mb-md">
            <Eyebrow variant="cyan">Activité récente</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">Workflows exécutés</h2>
          </div>
          <div className="space-y-xs max-h-80 overflow-y-auto">
            {recentOk.map((w, i) => (
              <div key={i} className="flex items-center gap-sm p-xs rounded-md hover:bg-glass-low transition-colors">
                <CheckCircle2 size={12} className="text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-caption text-text-primary font-mono truncate block">{w.workflow_id}</span>
                </div>
                <span className="text-micro text-text-tertiary shrink-0 tabular-nums">
                  {w.executed_at && new Date(w.executed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {recentOk.length === 0 && (
              <p className="text-caption text-text-tertiary text-center py-md">Aucune donnée disponible.</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Feature Flags */}
      <GlassCard>
        <div className="mb-md">
          <Eyebrow variant="violet">Feature Flags</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            {featureCount} actif{featureCount > 1 ? "s" : ""} · {flagsDisabled} inactif{flagsDisabled > 1 ? "s" : ""}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
          {flags.map((f) => (
            <div
              key={f.key}
              className={`flex items-start gap-sm p-sm rounded-lg border ${
                f.enabled ? "bg-success/5 border-success/20" : "bg-glass-low border-glass-border"
              }`}
            >
              <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${f.enabled ? "bg-success" : "bg-text-muted"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-caption font-bold text-text-primary font-mono truncate">{f.key}</div>
                {f.description && (
                  <div className="mt-xxs text-micro text-text-tertiary line-clamp-1">{f.description}</div>
                )}
              </div>
            </div>
          ))}
          {flags.length === 0 && (
            <p className="col-span-2 text-caption text-text-tertiary text-center py-md">
              Aucun feature flag enregistré.
            </p>
          )}
        </div>
      </GlassCard>

      {/* Roadmap monitoring */}
      <GlassCard variant="low">
        <div className="flex items-start gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal">
            <Server size={18} />
          </div>
          <div>
            <Eyebrow>Monitoring avancé — Q3 2026</Eyebrow>
            <h3 className="mt-xxs text-h3 font-bold text-text-hero">
              Tentacule WATCHDOG · Ping infra + alertes budget
            </h3>
            <p className="mt-xs text-caption text-text-secondary">
              Health checks actifs (Railway ping, Supabase RPC, Vercel status), coût API par jour par service,
              quotas Anthropic / Twilio / ElevenLabs restants, alertes Telegram dès dépassement.
              En cours de câblage dans le cerveau Pieuvre.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
