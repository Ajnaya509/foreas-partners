import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { StatCard } from "@/components/foreas/StatCard";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Car,
  FileCheck,
  Eye,
} from "lucide-react";
import { getRecentDriversAdmin } from "@/lib/queries/admin";

type Driver = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  vtc_card_verified: boolean | null;
  created_at: string | null;
};

export default async function AdminModerationPage() {
  const driversRaw = await getRecentDriversAdmin(50);
  const drivers = (driversRaw as Driver[]) ?? [];

  const pendingVerif = drivers.filter((d) => !d.vtc_card_verified);
  const suspended = drivers.filter((d) => d.status === "suspended" || d.status === "banned");
  const newSignups = drivers.filter((d) => {
    if (!d.created_at) return false;
    const age = Date.now() - new Date(d.created_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  });
  const verified = drivers.filter((d) => d.vtc_card_verified);

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/30";
      case "suspended": return "bg-danger/10 text-danger border-danger/30";
      case "banned": return "bg-danger/15 text-danger border-danger/40";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-glass-low text-text-secondary border-glass-border";
    }
  };

  const statusLabel = (status: string | null) => {
    switch (status) {
      case "active": return "Actif";
      case "suspended": return "Suspendu";
      case "banned": return "Banni";
      case "pending": return "En attente";
      default: return status ?? "Inconnu";
    }
  };

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Sécurité & Conformité</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Modération
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Vérification cartes VTC · signalements · suspensions chauffeurs.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Cartes VTC à vérifier"
          value={pendingVerif.length}
          icon={<FileCheck size={18} />}
          status={pendingVerif.length > 5 ? "warning" : pendingVerif.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Comptes suspendus"
          value={suspended.length}
          icon={<AlertTriangle size={18} />}
          status={suspended.length > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Inscrits cette semaine"
          value={newSignups.length}
          icon={<User size={18} />}
          status="neutral"
        />
        <StatCard
          label="Cartes VTC validées"
          value={verified.length}
          icon={<CheckCircle2 size={18} />}
          status="success"
        />
      </section>

      {/* File de vérification */}
      {pendingVerif.length > 0 ? (
        <HeroGradientCard glow>
          <div className="flex items-start gap-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/30 border border-white/10">
              <FileCheck size={24} className="text-warning" />
            </div>
            <div>
              <Eyebrow>Action requise</Eyebrow>
              <h2 className="mt-xxs text-h1 font-bold text-text-hero">
                {pendingVerif.length} carte{pendingVerif.length > 1 ? "s" : ""} VTC en attente de validation
              </h2>
              <p className="mt-xs text-body text-text-secondary">
                Ces chauffeurs ont soumis leur dossier mais la carte VTC n&apos;est pas encore marquée vérifiée.
                Valide dans le profil chauffeur pour débloquer leur accès complet.
              </p>
            </div>
          </div>
        </HeroGradientCard>
      ) : (
        <div className="flex items-center gap-md p-md rounded-lg bg-success/5 border border-success/20">
          <CheckCircle2 size={18} className="text-success shrink-0" />
          <div className="text-body-bold text-success">
            Toutes les cartes VTC sont vérifiées — file de modération vide.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Cartes à vérifier */}
        <GlassCard>
          <div className="mb-md">
            <Eyebrow variant="violet">File de vérification</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              Cartes VTC non vérifiées
            </h2>
          </div>
          <div className="space-y-xs max-h-80 overflow-y-auto">
            {pendingVerif.slice(0, 15).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-md p-sm rounded-md hover:bg-glass-low transition-colors border border-warning/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning shrink-0">
                  <Car size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-bold text-text-primary truncate">{d.full_name ?? d.email ?? d.id.slice(0, 8)}</div>
                  {d.created_at && (
                    <div className="flex items-center gap-xs mt-xxs text-micro text-text-tertiary">
                      <Clock size={10} />
                      Inscrit le {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </div>
                  )}
                </div>
                <span className={`px-sm py-xxs rounded-pill border text-micro font-bold shrink-0 ${statusBadge(d.status)}`}>
                  {statusLabel(d.status)}
                </span>
              </div>
            ))}
            {pendingVerif.length === 0 && (
              <div className="py-lg text-center">
                <CheckCircle2 size={28} className="mx-auto text-success mb-sm" />
                <p className="text-body text-success font-semibold">File vide — tout est validé</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Comptes suspendus */}
        <GlassCard>
          <div className="mb-md">
            <Eyebrow>Suspensions actives</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {suspended.length > 0
                ? `${suspended.length} compte${suspended.length > 1 ? "s" : ""} bloqué${suspended.length > 1 ? "s" : ""}`
                : "Aucun compte bloqué"}
            </h2>
          </div>
          <div className="space-y-xs">
            {suspended.map((d) => (
              <div key={d.id} className="flex items-center gap-md p-sm rounded-md bg-danger/5 border border-danger/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger shrink-0">
                  <AlertTriangle size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-bold text-text-primary truncate">
                    {d.full_name ?? d.email ?? d.id.slice(0, 8)}
                  </div>
                  <div className="text-micro text-danger mt-xxs font-semibold uppercase tracking-wide">
                    {statusLabel(d.status)}
                  </div>
                </div>
              </div>
            ))}
            {suspended.length === 0 && (
              <div className="py-lg text-center">
                <Shield size={28} className="mx-auto text-success mb-sm" />
                <p className="text-body text-success font-semibold">Aucune suspension active</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Inscrits récents */}
      {newSignups.length > 0 && (
        <GlassCard>
          <div className="mb-md">
            <Eyebrow variant="cyan">Nouveaux inscrits à surveiller</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {newSignups.length} inscription{newSignups.length > 1 ? "s" : ""} cette semaine
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {newSignups.map((d) => (
              <div key={d.id} className="flex items-center gap-md p-sm rounded-md bg-glass-low border border-glass-border">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-electric/10 text-cyan-electric shrink-0">
                  <Eye size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-bold text-text-primary truncate">
                    {d.full_name ?? d.email ?? d.id.slice(0, 12)}
                  </div>
                  <div className="flex items-center gap-md mt-xxs">
                    {d.created_at && (
                      <span className="text-micro text-text-tertiary">
                        {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    <span className={`px-xs py-xxs rounded text-micro font-bold ${d.vtc_card_verified ? "text-success" : "text-warning"}`}>
                      {d.vtc_card_verified ? "✓ VTC" : "VTC ?"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Roadmap modération IA */}
      <GlassCard variant="low">
        <div className="flex items-start gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal">
            <Shield size={18} />
          </div>
          <div>
            <Eyebrow>Modération IA — Q3 2026</Eyebrow>
            <h3 className="mt-xxs text-h3 font-bold text-text-hero">
              Décisions assistées par Claude · signalements automatiques
            </h3>
            <p className="mt-xs text-caption text-text-secondary">
              File de modération des messages signalés, scoring comportemental automatique,
              décisions suspensions assistées par Claude Sonnet, alertes croisées fraud_signals.
              Tentacule MODERATOR en cours de câblage dans la Pieuvre.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
