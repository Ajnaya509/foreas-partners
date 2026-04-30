import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { StatusPill } from "@/components/foreas/StatusPill";
import { Users, UserCheck, UserPlus, Activity } from "lucide-react";
import { getRecentDriversAdmin } from "@/lib/queries/admin";
import { formatEUR, formatDateRelative, getInitials, type DriverStatus } from "@/lib/utils";
import type { DriverRow } from "@/types/database";

export default async function AdminChauffeursPage() {
  const drivers = (await getRecentDriversAdmin(100)) as DriverRow[];
  const total = drivers.length;
  const active = drivers.filter((d) => d.status === "active").length;
  const newSignups7d = drivers.filter((d) => {
    if (!d.created_at) return false;
    return new Date(d.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;
  const totalEarnings = drivers.reduce((acc, d) => acc + Number(d.total_earnings ?? 0), 0);

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Console Admin</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Chauffeurs
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Vue exhaustive de tous les chauffeurs FOREAS. {total} comptes affichés.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="Total comptes" value={total} icon={<Users size={18} />} />
        <StatCard label="Actifs" value={active} icon={<UserCheck size={18} />} status="success" />
        <StatCard label="Nouveaux 7j" value={newSignups7d} icon={<UserPlus size={18} />} status="success" />
        <StatCard label="CA cumulé" value={totalEarnings} format="eur" icon={<Activity size={18} />} status="neutral" />
      </section>

      <GlassCard>
        <div className="overflow-x-auto scrollbar-thin -mx-xl px-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Chauffeur</th>
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Statut</th>
                <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">CA total</th>
                <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Courses</th>
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Inscrit</th>
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const fullName = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Chauffeur";
                const status: DriverStatus = (d.status === "active" ? "active" : d.status === "churned" ? "churned" : "inactive") as DriverStatus;
                return (
                  <tr key={d.id} className="border-b border-glass-border/50 hover:bg-violet-royal/5 transition-colors">
                    <td className="py-md px-md">
                      <div className="flex items-center gap-md">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-royal font-bold text-white text-caption">
                          {getInitials(fullName)}
                        </div>
                        <div>
                          <div className="text-body-bold text-text-primary">{fullName}</div>
                          <div className="text-micro text-text-tertiary font-mono">{d.phone ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-md px-md">
                      <StatusPill status={status} />
                    </td>
                    <td className="py-md px-md text-right text-body-bold tabular-nums text-text-primary">
                      {formatEUR(Number(d.total_earnings ?? 0))}
                    </td>
                    <td className="py-md px-md text-right text-body tabular-nums text-text-secondary">
                      {d.total_rides ?? 0}
                    </td>
                    <td className="py-md px-md text-caption text-text-tertiary">
                      {d.created_at ? formatDateRelative(d.created_at) : "—"}
                    </td>
                    <td className="py-md px-md text-caption text-text-tertiary">
                      {d.last_active ? formatDateRelative(d.last_active) : "Jamais"}
                    </td>
                  </tr>
                );
              })}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-huge text-center text-text-tertiary">
                    Aucun chauffeur dans la base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
