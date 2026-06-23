import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import {
  Network,
  UserCheck,
  Clock,
  Wallet,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { railwayGet, type RailwayPartner } from "@/lib/api/railway";
import { getRecentPartnersAdmin } from "@/lib/queries/admin";
import { formatEUR, formatDateRelative, getInitials } from "@/lib/utils";
import type { PartnerRow } from "@/types/database";

const COMPANY_TYPE_LABEL: Record<string, string> = {
  auto_ecole: "Auto-école",
  fleet_manager: "Gestionnaire flotte",
  influencer: "Influenceur",
  agent_commercial: "Agent commercial",
  federation: "Fédération",
  autre: "Autre",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active:  { label: "Actif",   cls: "bg-success/10 text-success border-success/25" },
    pending: { label: "Pending", cls: "bg-warning/10 text-warning border-warning/25" },
    paused:  { label: "Pausé",   cls: "bg-danger/10 text-danger border-danger/25" },
  }[status] ?? { label: status, cls: "bg-glass-low text-text-tertiary border-glass-border" };
  return (
    <span className={`inline-flex items-center px-sm py-xxs rounded-pill text-caption font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default async function AdminPartnersMLMPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const query = (params.q ?? "").toLowerCase();

  // Tente Railway API, fallback Supabase
  let partners: RailwayPartner[] = [];
  let apiError: string | null = null;

  try {
    const res = await railwayGet<{ partners: RailwayPartner[] }>(
      "/api/admin/partners"
    );
    partners = res.partners ?? [];
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Erreur Railway";
    // Fallback Supabase
    const rows = (await getRecentPartnersAdmin(200)) as PartnerRow[];
    partners = rows.map((r) => ({
      id: r.id,
      company_name: r.company_name ?? "",
      company_type: r.company_type ?? "",
      contact_email: r.contact_email ?? "",
      status: (r.status as "pending" | "active" | "paused") ?? "pending",
      referral_code: r.referral_code ?? "",
      stripe_account_id: r.stripe_account_id ?? undefined,
      total_drivers: Number(r.total_drivers ?? 0),
      active_drivers: Number(r.active_drivers ?? 0),
      total_earned: Number(r.total_earned ?? 0),
      pending_commission: 0,
      discount_percent_for_recruits: Number(r.discount_percent_for_recruits ?? 0),
      discount_duration_months: Number(r.discount_duration_months ?? 1),
      is_promo_active: r.is_promo_active ?? false,
      created_at: r.created_at ?? "",
    }));
  }

  // Filtres
  const filtered = partners
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter(
      (p) =>
        !query ||
        p.company_name.toLowerCase().includes(query) ||
        p.contact_email.toLowerCase().includes(query) ||
        p.referral_code.toLowerCase().includes(query)
    );

  // KPIs
  const total = partners.length;
  const active = partners.filter((p) => p.status === "active").length;
  const pending = partners.filter((p) => p.status === "pending").length;
  const totalEur = partners.reduce((acc, p) => acc + (p.total_earned ?? 0), 0);
  const totalDrivers = partners.reduce((acc, p) => acc + (p.total_drivers ?? 0), 0);

  const FILTERS = [
    { key: "all",     label: "Tous" },
    { key: "active",  label: "Actifs" },
    { key: "pending", label: `Pending${pending > 0 ? ` (${pending})` : ""}` },
    { key: "paused",  label: "Pausés" },
  ];

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Hero cyan */}
      <HeroGradientCard variant="cyan" className="!p-xl">
        <Eyebrow>Partners MLM · Réseau FOREAS</Eyebrow>
        <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
          {total} partner{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""}
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Réseau MLM N1/N2/N3 — cascade 10 € / 4 € / 2 € par filleul qualifié actif.
        </p>

        {pending > 0 && (
          <Link
            href="/admin/partner-pending"
            className="mt-lg inline-flex items-center gap-xs px-lg py-md rounded-lg border border-warning/30 bg-warning/10 text-warning text-body-bold hover:bg-warning/20 transition-colors"
          >
            <AlertCircle size={16} />
            {pending} candidature{pending > 1 ? "s" : ""} en attente de validation
            <ChevronRight size={16} />
          </Link>
        )}
      </HeroGradientCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-lg">
        <StatCard label="Total partners" value={total} icon={<Network size={18} />} status="neutral" />
        <StatCard label="Actifs" value={active} icon={<UserCheck size={18} />} status="success" />
        <StatCard label="Pending" value={pending} icon={<Clock size={18} />} status={pending > 0 ? "warning" : "neutral"} />
        <StatCard label="Chauffeurs recrutés" value={totalDrivers} icon={<Network size={18} />} status="neutral" />
        <StatCard label="Total commissions" value={totalEur} format="eur" icon={<Wallet size={18} />} status="success" />
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="flex items-start gap-md p-md rounded-lg bg-warning/10 border border-warning/25 text-warning text-caption">
          <AlertCircle size={16} className="shrink-0 mt-xxs" />
          <div>
            <span className="font-bold">Railway API indisponible</span> — affichage depuis Supabase (données locales).
            <br />
            <span className="text-text-tertiary">{apiError}</span>
          </div>
        </div>
      )}

      {/* Filtres + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-md">
        <div className="flex gap-xs flex-wrap">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/partners?status=${f.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={`px-lg py-sm rounded-pill text-caption font-bold transition-colors ${
                statusFilter === f.key
                  ? "bg-cyan-electric text-obsidian-deep"
                  : "bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass-high"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <form method="GET" action="/admin/partners" className="flex-1 max-w-xs">
          {statusFilter !== "all" && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Rechercher société, email, code…"
            className="w-full px-md py-sm rounded-lg bg-glass-low border border-glass-border text-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 transition-colors"
          />
        </form>
      </div>

      {/* Table */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Société</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Type</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Code</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Statut</th>
                <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Chauffeurs</th>
                <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Total gagné</th>
                <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Promo</th>
                <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Inscrit</th>
                <th className="py-md px-lg" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-glass-border/40 hover:bg-cyan-electric/5 transition-colors"
                >
                  <td className="py-md px-lg">
                    <div className="flex items-center gap-md">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white text-caption"
                           style={{ background: "linear-gradient(135deg, #8C52FF 0%, #00D4FF 100%)" }}>
                        {getInitials(p.company_name)}
                      </div>
                      <div>
                        <div className="text-body-bold text-text-primary">{p.company_name}</div>
                        <div className="text-micro text-text-tertiary">{p.contact_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-md px-lg text-caption text-text-secondary">
                    {COMPANY_TYPE_LABEL[p.company_type] ?? p.company_type ?? "—"}
                  </td>
                  <td className="py-md px-lg">
                    <span className="font-mono text-caption text-cyan-electric">{p.referral_code}</span>
                  </td>
                  <td className="py-md px-lg">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-md px-lg text-right tabular-nums text-body-bold text-text-primary">
                    <span className="text-text-secondary">{p.active_drivers ?? 0}</span>
                    <span className="text-text-muted">/{p.total_drivers ?? 0}</span>
                  </td>
                  <td className="py-md px-lg text-right tabular-nums text-body-bold text-text-primary">
                    {formatEUR(p.total_earned ?? 0)}
                  </td>
                  <td className="py-md px-lg text-right text-caption">
                    {p.is_promo_active ? (
                      <span className="text-cyan-electric font-bold">−{p.discount_percent_for_recruits}%</span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-md px-lg text-caption text-text-tertiary whitespace-nowrap">
                    {p.created_at ? formatDateRelative(p.created_at) : "—"}
                  </td>
                  <td className="py-md px-lg">
                    <Link
                      href={`/admin/partners/${p.id}`}
                      className="inline-flex items-center gap-xs px-md py-sm rounded-lg bg-cyan-electric/10 text-cyan-electric text-caption font-bold hover:bg-cyan-electric/20 transition-colors whitespace-nowrap"
                    >
                      Voir <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-huge text-center text-text-tertiary text-body">
                    {query || statusFilter !== "all"
                      ? "Aucun partenaire ne correspond aux filtres."
                      : "Aucun partenaire enregistré."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-lg py-md border-t border-glass-border/40 text-caption text-text-muted">
          {filtered.length} / {total} partenaire{total > 1 ? "s" : ""}
          {apiError ? " (source: Supabase)" : " (source: Railway API)"}
        </div>
      </GlassCard>
    </div>
  );
}
