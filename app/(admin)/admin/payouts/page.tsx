import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { Coins, Users, Network, AlertCircle, Calendar } from "lucide-react";
import { railwayGet, type PendingPayout, type PayoutHistoryItem } from "@/lib/api/railway";
import { formatEUR } from "@/lib/utils";
import { RunCronButton } from "./RunCronButton";

const MONTH_LABELS: Record<number, string> = {
  1: "janv.", 2: "févr.", 3: "mars", 4: "avr.", 5: "mai", 6: "juin",
  7: "juil.", 8: "août", 9: "sept.", 10: "oct.", 11: "nov.", 12: "déc.",
};

function formatCommissionMonth(dateStr: string) {
  const d = new Date(dateStr);
  return `${MONTH_LABELS[d.getMonth() + 1] ?? ""} ${d.getFullYear()}`;
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;

  // Mois courant pour historique
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let pending: PendingPayout[] = [];
  let history: PayoutHistoryItem[] = [];
  let totalPendingEur = 0;
  let totalHistoryEur = 0;
  let apiError: string | null = null;

  try {
    const [pendingRes, historyRes] = await Promise.all([
      railwayGet<{ pending: PendingPayout[]; total_eur: number }>("/api/admin/payouts/pending"),
      railwayGet<{ history: PayoutHistoryItem[]; total_eur: number }>(
        `/api/admin/payouts/history?month=${currentMonth}`
      ),
    ]);
    pending = pendingRes.pending ?? [];
    totalPendingEur = pendingRes.total_eur ?? 0;
    history = historyRes.history ?? [];
    totalHistoryEur = historyRes.total_eur ?? 0;
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Erreur Railway";
  }

  const driverPending = pending.filter((p) => p.sponsor_type === "driver");
  const partnerPending = pending.filter((p) => p.sponsor_type === "partner");
  const totalDriverEur = driverPending.reduce((acc, p) => acc + p.total_amount_eur, 0);
  const totalPartnerEur = partnerPending.reduce((acc, p) => acc + p.total_amount_eur, 0);

  // Navigation mois historique (6 mois précédents)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[d.getMonth() + 1]} ${d.getFullYear()}`,
    };
  });

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Hero cyan — argent et data */}
      <HeroGradientCard variant="cyan" className="!p-xl">
        <div className="flex items-start justify-between flex-wrap gap-lg">
          <div>
            <Eyebrow>Payouts MLM · Réseau FOREAS</Eyebrow>
            <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
              Payouts MLM
            </h1>
            <p className="mt-xs text-body-lg text-text-secondary">
              Cascade N1 (10 €) · N2 (4 €) · N3 (2 €) par filleul actif qualifié. Versement le 5 du mois.
            </p>
            {!apiError && (
              <div className="mt-lg">
                <span className="text-display-l font-extrabold text-cyan-electric tabular-nums">
                  {formatEUR(totalPendingEur)}
                </span>
                <span className="ml-md text-body text-text-secondary">à verser ce mois</span>
              </div>
            )}
          </div>
          <RunCronButton />
        </div>
      </HeroGradientCard>

      {/* API error */}
      {apiError && (
        <div className="flex items-start gap-md p-md rounded-lg bg-warning/10 border border-warning/25 text-warning text-caption">
          <AlertCircle size={16} className="shrink-0 mt-xxs" />
          <span>
            <strong>Railway API indisponible</strong> — {apiError}
          </span>
        </div>
      )}

      {/* KPIs pending */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="Total à verser" value={totalPendingEur} format="eur" icon={<Coins size={18} />} status={totalPendingEur > 0 ? "warning" : "success"} />
        <StatCard label="Commissions pending" value={pending.length} icon={<Calendar size={18} />} status="neutral" />
        <StatCard label="Parrains drivers" value={driverPending.length} icon={<Users size={18} />} status="neutral" />
        <StatCard label="Partners" value={partnerPending.length} icon={<Network size={18} />} status="neutral" />
      </div>

      {/* Pending — détail par type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Drivers P2P */}
        <GlassCard>
          <div className="flex items-start justify-between mb-lg">
            <div>
              <Eyebrow>Chauffeurs parrains (P2P)</Eyebrow>
              <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
                {formatEUR(totalDriverEur)}
              </h2>
              <p className="mt-xs text-caption text-text-secondary">
                {driverPending.length} commission{driverPending.length !== 1 ? "s" : ""} pending
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-royal/10 text-violet-royal">
              <Users size={18} />
            </div>
          </div>
          {driverPending.length > 0 ? (
            <div className="space-y-sm max-h-64 overflow-y-auto scrollbar-thin">
              {driverPending.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-sm rounded-lg bg-glass-low border border-glass-border">
                  <div>
                    <div className="text-micro font-mono text-text-muted truncate max-w-[120px]">
                      {p.sponsor_uuid.slice(0, 8)}…
                    </div>
                    <div className="text-caption text-text-secondary mt-xxs">
                      {formatCommissionMonth(p.commission_month)} · {p.commission_count} filleul{p.commission_count > 1 ? "s" : ""}
                    </div>
                  </div>
                  <span className="text-body-bold tabular-nums text-violet-royal">
                    {formatEUR(p.total_amount_eur)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-caption text-text-muted">Aucune commission pending pour les chauffeurs.</p>
          )}
        </GlassCard>

        {/* Partners B2B */}
        <GlassCard>
          <div className="flex items-start justify-between mb-lg">
            <div>
              <Eyebrow>Partners recruteurs (B2B2C)</Eyebrow>
              <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
                {formatEUR(totalPartnerEur)}
              </h2>
              <p className="mt-xs text-caption text-text-secondary">
                {partnerPending.length} commission{partnerPending.length !== 1 ? "s" : ""} pending
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-electric/10 text-cyan-electric">
              <Network size={18} />
            </div>
          </div>
          {partnerPending.length > 0 ? (
            <div className="space-y-sm max-h-64 overflow-y-auto scrollbar-thin">
              {partnerPending.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-sm rounded-lg bg-glass-low border border-glass-border">
                  <div>
                    <div className="text-micro font-mono text-text-muted truncate max-w-[120px]">
                      {p.sponsor_uuid.slice(0, 8)}…
                    </div>
                    <div className="flex items-center gap-xs mt-xxs">
                      <span className="text-caption text-text-secondary">
                        {formatCommissionMonth(p.commission_month)} · {p.commission_count} filleul{p.commission_count > 1 ? "s" : ""}
                      </span>
                      {p.levels?.map((l) => (
                        <span key={l} className="text-micro text-cyan-electric/70 font-bold">N{l}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-body-bold tabular-nums text-cyan-electric">
                    {formatEUR(p.total_amount_eur)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-caption text-text-muted">Aucune commission pending pour les partners.</p>
          )}
        </GlassCard>
      </div>

      {/* Historique */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="p-xl border-b border-glass-border flex items-center justify-between flex-wrap gap-md">
          <div>
            <Eyebrow>Historique payouts</Eyebrow>
            <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
              {history.length > 0
                ? `${formatEUR(totalHistoryEur)} versés`
                : "Aucun versement"}
            </h2>
          </div>
          {/* Month selector */}
          <div className="flex gap-xs flex-wrap">
            {monthOptions.map((m) => (
              <a
                key={m.value}
                href={`/admin/payouts?month=${m.value}`}
                className={`px-md py-sm rounded-pill text-caption font-bold transition-colors ${
                  currentMonth === m.value
                    ? "bg-cyan-electric text-obsidian-deep"
                    : "bg-glass-low border border-glass-border text-text-secondary hover:bg-glass-high"
                }`}
              >
                {m.label}
              </a>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass-border/50">
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Type</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Sponsor</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Mois</th>
                <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Commissions</th>
                <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Montant</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Versé le</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b border-glass-border/30 hover:bg-cyan-electric/5 transition-colors">
                  <td className="py-md px-lg">
                    <span
                      className={`inline-flex items-center px-sm py-xxs rounded-pill text-caption font-bold border ${
                        h.sponsor_type === "partner"
                          ? "bg-cyan-electric/10 text-cyan-electric border-cyan-electric/25"
                          : "bg-violet-royal/10 text-violet-royal border-violet-royal/25"
                      }`}
                    >
                      {h.sponsor_type === "partner" ? "Partner" : "Driver"}
                    </span>
                  </td>
                  <td className="py-md px-lg text-micro font-mono text-text-muted">
                    {h.sponsor_uuid.slice(0, 12)}…
                  </td>
                  <td className="py-md px-lg text-caption text-text-secondary">
                    {h.commission_month ? formatCommissionMonth(h.commission_month) : "—"}
                  </td>
                  <td className="py-md px-lg text-right tabular-nums text-caption text-text-secondary">
                    {h.commission_count}
                  </td>
                  <td className="py-md px-lg text-right tabular-nums text-body-bold text-text-primary">
                    {formatEUR(h.total_paid_eur ?? 0)}
                  </td>
                  <td className="py-md px-lg text-caption text-text-tertiary whitespace-nowrap">
                    {h.paid_at
                      ? new Date(h.paid_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-huge text-center text-text-tertiary">
                    Aucun versement pour {monthOptions.find((m) => m.value === currentMonth)?.label ?? currentMonth}.
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
