import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Wallet, Calendar, CheckCircle2, Clock, FileDown } from "lucide-react";
import { getCurrentPartner } from "@/lib/queries/partner";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/foreas/StatCard";
import { createClient } from "@/lib/supabase/server";
import { formatEUR } from "@/lib/utils";
import type { PartnerCommissionRow } from "@/types/database";

export default async function PartnerCommissionsPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/login?next=/partner/commissions");

  const supabase = await createClient();

  const { data: commissions } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("partner_id", partner.id)
    .order("commission_month", { ascending: false })
    .limit(24);

  const list = (commissions as PartnerCommissionRow[] | null) ?? [];

  // Stats
  const total = list.reduce((acc, c) => acc + Number(c.commission_amount ?? 0), 0);
  const pending = list.filter((c) => c.status === "pending");
  const pendingTotal = pending.reduce((acc, c) => acc + Number(c.commission_amount ?? 0), 0);
  const paid = list.filter((c) => c.status === "paid");
  const paidTotal = paid.reduce((acc, c) => acc + Number(c.commission_amount ?? 0), 0);

  // Mois actuel
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const currentMonthCommissions = list.filter((c) => {
    const d = new Date(c.commission_month);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });
  const currentMonthTotal = currentMonthCommissions.reduce(
    (acc, c) => acc + Number(c.commission_amount ?? 0),
    0
  );

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Tes revenus FOREAS</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Commissions
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Historique de tes commissions d&apos;agent commercial indépendant
          (25€/sem × chauffeur actif).
        </p>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard
          label="Ce mois"
          value={currentMonthTotal}
          format="eur"
          icon={<Calendar size={18} />}
          status="success"
        />
        <StatCard
          label="En attente"
          value={pendingTotal}
          format="eur"
          icon={<Clock size={18} />}
          status={pendingTotal > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Payées (cumul)"
          value={paidTotal}
          format="eur"
          icon={<CheckCircle2 size={18} />}
          status="success"
        />
        <StatCard
          label="Total tous mois"
          value={total}
          format="eur"
          icon={<Wallet size={18} />}
          status="neutral"
        />
      </section>

      {/* Historique */}
      <GlassCard>
        <div className="flex items-center justify-between mb-lg">
          <div>
            <Eyebrow>Historique 24 derniers mois</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              Détail mensuel
            </h2>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="py-huge text-center">
            <Wallet size={36} className="mx-auto text-text-tertiary mb-md" />
            <p className="text-body text-text-tertiary">
              Aucune commission pour le moment.
            </p>
            <p className="mt-xs text-caption text-text-muted">
              Tes premières commissions arriveront fin de mois après onboarding de tes chauffeurs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin -mx-xl px-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">
                    Mois
                  </th>
                  <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">
                    Montant
                  </th>
                  <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">
                    Statut
                  </th>
                  <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">
                    Facture
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-glass-border/50 hover:bg-violet-royal/5 transition-colors"
                  >
                    <td className="py-md px-md text-body-bold text-text-primary">
                      {new Intl.DateTimeFormat("fr-FR", {
                        month: "long",
                        year: "numeric",
                      }).format(new Date(c.commission_month))}
                    </td>
                    <td className="py-md px-md text-right text-body-bold tabular-nums text-text-primary">
                      {formatEUR(Number(c.commission_amount ?? 0))}
                    </td>
                    <td className="py-md px-md">
                      <span
                        className={`inline-flex items-center gap-xs px-sm py-xxs rounded-pill text-caption font-semibold border ${
                          c.status === "paid"
                            ? "bg-success/10 text-success border-success/30"
                            : c.status === "pending"
                            ? "bg-warning/10 text-warning border-warning/30"
                            : "bg-glass-low text-text-tertiary border-glass-border"
                        }`}
                      >
                        {c.status === "paid" ? "Payée" : c.status === "pending" ? "En attente" : c.status}
                      </span>
                    </td>
                    <td className="py-md px-md">
                      {c.invoice_url ? (
                        <a
                          href={c.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-xs text-violet-royal hover:text-cyan-electric text-caption font-semibold"
                        >
                          <FileDown size={14} />
                          {c.invoice_number ?? "Télécharger"}
                        </a>
                      ) : (
                        <span className="text-caption text-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
