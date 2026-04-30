import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { Handshake, UserCheck, Briefcase, Wallet } from "lucide-react";
import { getRecentPartnersAdmin } from "@/lib/queries/admin";
import { formatEUR, formatDateRelative, getInitials } from "@/lib/utils";
import type { PartnerRow } from "@/types/database";

export default async function AdminPartenairesPage() {
  const partners = (await getRecentPartnersAdmin(100)) as PartnerRow[];
  const total = partners.length;
  const active = partners.filter((p) => p.status === "active").length;
  const totalDrivers = partners.reduce((acc, p) => acc + Number(p.total_drivers ?? 0), 0);
  const totalEarned = partners.reduce((acc, p) => acc + Number(p.total_earned ?? 0), 0);

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Console Admin</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Partenaires (Directeurs de groupe)
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Agents commerciaux indépendants FOREAS. {total} partenaires enregistrés.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="Total partenaires" value={total} icon={<Handshake size={18} />} />
        <StatCard label="Actifs" value={active} icon={<UserCheck size={18} />} status="success" />
        <StatCard label="Chauffeurs sous gestion" value={totalDrivers} icon={<Briefcase size={18} />} status="neutral" />
        <StatCard label="Commissions versées" value={totalEarned} format="eur" icon={<Wallet size={18} />} status="success" />
      </section>

      <GlassCard>
        <div className="overflow-x-auto scrollbar-thin -mx-xl px-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Société</th>
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Code</th>
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Statut</th>
                <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Chauffeurs</th>
                <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Total gagné</th>
                <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-glass-border/50 hover:bg-violet-royal/5 transition-colors">
                  <td className="py-md px-md">
                    <div className="flex items-center gap-md">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-royal font-bold text-white text-caption">
                        {getInitials(p.company_name)}
                      </div>
                      <div>
                        <div className="text-body-bold text-text-primary">{p.company_name}</div>
                        <div className="text-micro text-text-tertiary">{p.contact_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-md px-md">
                    <span className="font-mono text-caption text-violet-royal">{p.referral_code}</span>
                  </td>
                  <td className="py-md px-md">
                    <span
                      className={`inline-flex items-center gap-xs px-sm py-xxs rounded-pill text-caption font-semibold border ${
                        p.status === "active"
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-warning/10 text-warning border-warning/30"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-md px-md text-right text-body-bold tabular-nums text-text-primary">
                    {p.total_drivers ?? 0}
                  </td>
                  <td className="py-md px-md text-right text-body-bold tabular-nums text-text-primary">
                    {formatEUR(Number(p.total_earned ?? 0))}
                  </td>
                  <td className="py-md px-md text-caption text-text-tertiary">
                    {p.created_at ? formatDateRelative(p.created_at) : "—"}
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-huge text-center text-text-tertiary">
                    Aucun partenaire enregistré.
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
