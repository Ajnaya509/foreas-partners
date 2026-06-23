import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  User,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getUserRolesList } from "@/lib/queries/admin";

type UserRole = {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  granted_at: string | null;
  revoked_at: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  partner: "Partenaire",
  driver: "Chauffeur",
  moderator: "Modérateur",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-danger/10 text-danger border-danger/30",
  admin: "bg-violet-royal/10 text-violet-royal border-violet-royal/30",
  moderator: "bg-warning/10 text-warning border-warning/30",
  partner: "bg-cyan-electric/10 text-cyan-electric border-cyan-electric/30",
  driver: "bg-success/10 text-success border-success/30",
};

export default async function AdminSecuritePage() {
  const roles = await getUserRolesList(100);
  const roleList = (roles as UserRole[]) ?? [];

  const activeRoles = roleList.filter((r) => r.is_active && !r.revoked_at);
  const revokedRoles = roleList.filter((r) => !r.is_active || r.revoked_at);
  const adminCount = activeRoles.filter((r) => r.role === "admin" || r.role === "super_admin").length;
  const superAdmins = activeRoles.filter((r) => r.role === "super_admin");

  const rolesByType = activeRoles.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Sécurité & Accès</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Rôles & Permissions
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Gestion des accès FOREAS · audit des permissions · détection d&apos;anomalies.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Accès actifs"
          value={activeRoles.length}
          icon={<ShieldCheck size={18} />}
          status="success"
        />
        <StatCard
          label="Admins & Super-admins"
          value={adminCount}
          icon={<Key size={18} />}
          status={adminCount > 3 ? "warning" : "success"}
        />
        <StatCard
          label="Accès révoqués"
          value={revokedRoles.length}
          icon={<XCircle size={18} />}
          status="neutral"
        />
        <StatCard
          label="Rôles distincts"
          value={Object.keys(rolesByType).length}
          icon={<User size={18} />}
          status="neutral"
        />
      </section>

      {/* Alerte super-admins */}
      {superAdmins.length > 0 && (
        <div className="flex items-start gap-md p-md rounded-lg bg-danger/5 border border-danger/20">
          <ShieldAlert size={18} className="text-danger shrink-0 mt-xxs" />
          <div>
            <div className="text-body-bold text-danger">
              {superAdmins.length} compte{superAdmins.length > 1 ? "s" : ""} super_admin actif{superAdmins.length > 1 ? "s" : ""}
            </div>
            <div className="text-caption text-text-secondary mt-xxs">
              Accès total à toutes les tables, bypass RLS. Vérifier régulièrement que seuls les comptes légitimes ont ce rôle.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Répartition rôles */}
        <GlassCard>
          <div className="mb-md">
            <Eyebrow variant="violet">Répartition</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">Par rôle</h2>
          </div>
          <div className="space-y-sm">
            {Object.entries(rolesByType).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between gap-md">
                <span className={`px-sm py-xxs rounded-pill border text-micro font-bold ${ROLE_COLORS[role] ?? "bg-glass-low text-text-secondary border-glass-border"}`}>
                  {ROLE_LABELS[role] ?? role}
                </span>
                <div className="flex-1 mx-sm h-2 rounded-full bg-obsidian-deep overflow-hidden">
                  <div
                    className="h-full bg-violet-royal/50"
                    style={{ width: `${Math.min((count / activeRoles.length) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-caption font-bold text-text-primary tabular-nums w-6 text-right">{count}</span>
              </div>
            ))}
            {Object.keys(rolesByType).length === 0 && (
              <p className="text-caption text-text-tertiary text-center py-md">Aucun rôle enregistré.</p>
            )}
          </div>
        </GlassCard>

        {/* Table des accès */}
        <div className="lg:col-span-2">
          <GlassCard>
            <div className="mb-md">
              <Eyebrow variant="cyan">Audit des accès</Eyebrow>
              <h2 className="mt-xxs text-h1 font-bold text-text-hero">
                {activeRoles.length} accès actif{activeRoles.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="space-y-xs max-h-96 overflow-y-auto">
              {activeRoles.slice(0, 30).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-md p-sm rounded-md hover:bg-glass-low transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glass-low text-text-secondary shrink-0">
                    <User size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-caption text-text-primary font-mono truncate">
                      {r.user_id.slice(0, 8)}…{r.user_id.slice(-6)}
                    </div>
                    {r.granted_at && (
                      <div className="flex items-center gap-xs mt-xxs text-micro text-text-tertiary">
                        <Clock size={10} />
                        Accordé le {new Date(r.granted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                  <span className={`px-sm py-xxs rounded-pill border text-micro font-bold shrink-0 ${ROLE_COLORS[r.role] ?? "bg-glass-low text-text-secondary border-glass-border"}`}>
                    {ROLE_LABELS[r.role] ?? r.role}
                  </span>
                </div>
              ))}
              {activeRoles.length === 0 && (
                <p className="text-caption text-text-tertiary text-center py-lg">
                  Aucun accès actif trouvé dans user_roles.
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Accès révoqués */}
      {revokedRoles.length > 0 && (
        <GlassCard variant="low">
          <div className="mb-md">
            <Eyebrow>Historique révocations</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {revokedRoles.length} accès révoqué{revokedRoles.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="space-y-xs">
            {revokedRoles.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-md p-sm rounded-md bg-glass-low">
                <XCircle size={14} className="text-danger shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-caption text-text-secondary font-mono truncate block">
                    {r.user_id.slice(0, 8)}…{r.user_id.slice(-6)} · {ROLE_LABELS[r.role] ?? r.role}
                  </span>
                </div>
                {r.revoked_at && (
                  <span className="text-micro text-text-tertiary shrink-0 tabular-nums">
                    Révoqué {new Date(r.revoked_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Roadmap sécurité */}
      <GlassCard variant="low">
        <div className="flex items-start gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <Lock size={18} />
          </div>
          <div>
            <Eyebrow>Détection fraude — Q3 2026</Eyebrow>
            <h3 className="mt-xxs text-h3 font-bold text-text-hero">
              Moteur anti-fraude Pieuvre · fraud_signals + audit_logs
            </h3>
            <p className="mt-xs text-caption text-text-secondary">
              Tables <span className="font-mono text-violet-royal">fraud_signals</span>, <span className="font-mono text-violet-royal">fraud_risk_scores</span>, <span className="font-mono text-violet-royal">audit_logs</span> et
              <span className="font-mono text-violet-royal"> card_fingerprints</span> en cours de câblage.
              Détection comportements anormaux, IP suspectes, devices multiples sur un même compte.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
