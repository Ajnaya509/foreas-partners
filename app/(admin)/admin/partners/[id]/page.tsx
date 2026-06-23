import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import {
  ArrowLeft,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  railwayGet,
  type RailwayPartner,
  type RailwayRecruit,
  type RailwayCommission,
} from "@/lib/api/railway";
import { getInitials, formatEUR, formatDateRelative } from "@/lib/utils";
import { DiscountForm } from "./DiscountForm";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

function CommissionLevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const cfg = { 1: "text-cyan-electric bg-cyan-electric/10", 2: "text-violet-royal bg-violet-royal/10", 3: "text-gold-subtle bg-gold-subtle/10" }[level];
  return (
    <span className={`px-sm py-xxs rounded-pill text-micro font-bold ${cfg}`}>
      N{level}
    </span>
  );
}

function RecruitStatusBadge({ status }: { status: string }) {
  const cfg = {
    active: "bg-success/10 text-success border-success/25",
    cancelled: "bg-danger/10 text-danger border-danger/25",
    trialing: "bg-warning/10 text-warning border-warning/25",
  }[status] ?? "bg-glass-low text-text-tertiary border-glass-border";
  return (
    <span className={`inline-flex items-center px-sm py-xxs rounded-pill text-caption font-semibold border ${cfg}`}>
      {status === "active" ? "Actif" : status === "cancelled" ? "Annulé" : "Trialing"}
    </span>
  );
}

export default async function AdminPartnerFichePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let partner: RailwayPartner | null = null;
  let recruits: RailwayRecruit[] = [];
  let commissions: RailwayCommission[] = [];
  let apiError: string | null = null;

  try {
    const res = await railwayGet<{
      partner: RailwayPartner;
      recruits: RailwayRecruit[];
      commissions: RailwayCommission[];
    }>(`/api/admin/partners/${id}`);
    partner = res.partner ?? null;
    recruits = res.recruits ?? [];
    commissions = res.commissions ?? [];
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Erreur Railway";
  }

  if (!partner && !apiError) notFound();

  // Si fallback Supabase nécessaire (pas de partner depuis Railway), essaie direct
  // (déjà géré par apiError banner — on continue avec ce qu'on a)

  const activeRecruits = recruits.filter((r) => r.subscription_status === "active").length;
  const pendingComm = commissions
    .filter((c) => c.status === "pending")
    .reduce((acc, c) => acc + (c.amount ?? 0), 0);

  // Commission actuelle (Railway ne la renvoie pas) — lue via Supabase admin RLS.
  const supabaseAdmin = await createClient();
  const { data: partnerRow } = await supabaseAdmin
    .from("partners")
    .select("commission_rate")
    .eq("id", id)
    .maybeSingle();
  const commissionRate = Number((partnerRow as { commission_rate?: number } | null)?.commission_rate ?? 0);

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Back nav */}
      <Link
        href="/admin/partners"
        className="inline-flex items-center gap-xs text-caption text-text-tertiary hover:text-cyan-electric transition-colors"
      >
        <ArrowLeft size={14} /> Retour à la liste Partners MLM
      </Link>

      {/* API Error */}
      {apiError && (
        <div className="flex items-start gap-md p-md rounded-lg bg-warning/10 border border-warning/25 text-warning text-caption">
          <AlertCircle size={16} className="shrink-0 mt-xxs" />
          <span>
            <strong>Railway API indisponible</strong> — {apiError}
          </span>
        </div>
      )}

      {partner ? (
        <>
          {/* Hero partner */}
          <HeroGradientCard variant="duo" className="!p-xl">
            <div className="flex items-start gap-lg">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-h2 font-extrabold text-white"
                style={{ background: "linear-gradient(135deg, #8C52FF 0%, #00D4FF 100%)" }}
              >
                {getInitials(partner.company_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-md flex-wrap">
                  <h1 className="text-display-l font-extrabold text-text-hero">
                    {partner.company_name}
                  </h1>
                  <span
                    className={`px-md py-xs rounded-pill text-caption font-bold border ${
                      partner.status === "active"
                        ? "bg-success/10 text-success border-success/25"
                        : partner.status === "pending"
                        ? "bg-warning/10 text-warning border-warning/25"
                        : "bg-danger/10 text-danger border-danger/25"
                    }`}
                  >
                    {partner.status}
                  </span>
                </div>
                <div className="mt-xs flex flex-wrap gap-md text-caption text-text-secondary">
                  <span>{partner.contact_email}</span>
                  {partner.contact_phone && <span>{partner.contact_phone}</span>}
                  {partner.siret && <span>SIRET {partner.siret}</span>}
                </div>
                <div className="mt-sm">
                  <span className="font-mono text-body-bold text-cyan-electric">
                    {partner.referral_code}
                  </span>
                  {partner.stripe_account_id && (
                    <span className="ml-lg text-micro text-text-muted">
                      Stripe: {partner.stripe_account_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </HeroGradientCard>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
            <StatCard label="Chauffeurs totaux" value={partner.total_drivers ?? 0} icon={<Users size={18} />} status="neutral" />
            <StatCard label="Actifs" value={activeRecruits} icon={<CheckCircle2 size={18} />} status="success" />
            <StatCard label="Total commissions" value={partner.total_earned ?? 0} format="eur" icon={<Wallet size={18} />} status="success" />
            <StatCard label="Commission pending" value={pendingComm || (partner.pending_commission ?? 0)} format="eur" icon={<Clock size={18} />} status={pendingComm > 0 ? "warning" : "neutral"} />
          </div>

          {/* Discount Config */}
          <GlassCard>
            <div className="mb-lg">
              <Eyebrow>Configuration promo</Eyebrow>
              <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
                Code promo filleuls
              </h2>
              <p className="mt-xs text-caption text-text-secondary">
                Remise offerte aux chauffeurs qui s'inscrivent via le lien de ce partner.
              </p>
            </div>
            <DiscountForm
              partnerId={partner.id}
              initialDiscount={partner.discount_percent_for_recruits ?? 0}
              initialDuration={partner.discount_duration_months ?? 1}
              initialMessage={partner.landing_message ?? ""}
              initialHeroUrl={partner.landing_hero_url ?? ""}
              initialPromoActive={partner.is_promo_active ?? false}
              initialCommission={commissionRate}
            />
          </GlassCard>

          {/* Recruits table */}
          <GlassCard className="!p-0 overflow-hidden">
            <div className="p-xl border-b border-glass-border">
              <Eyebrow>Filleuls recrutés</Eyebrow>
              <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
                {recruits.length} chauffeur{recruits.length !== 1 ? "s" : ""} recrutés
              </h2>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-glass-border/50">
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Chauffeur</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Statut sub.</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Qualifié</th>
                    <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Score</th>
                    <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Commission mois</th>
                    <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Total généré</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Inscrit</th>
                  </tr>
                </thead>
                <tbody>
                  {recruits.map((r) => (
                    <tr key={r.id} className="border-b border-glass-border/30 hover:bg-cyan-electric/5 transition-colors">
                      <td className="py-md px-lg">
                        <div className="text-body-bold text-text-primary">
                          {r.drivers?.first_name} {r.drivers?.last_name}
                        </div>
                        <div className="text-micro text-text-tertiary">{r.drivers?.email}</div>
                      </td>
                      <td className="py-md px-lg">
                        <RecruitStatusBadge status={r.subscription_status} />
                      </td>
                      <td className="py-md px-lg">
                        {r.drivers?.qualified_for_referral ? (
                          <CheckCircle2 size={16} className="text-success" />
                        ) : (
                          <XCircle size={16} className="text-text-muted" />
                        )}
                      </td>
                      <td className="py-md px-lg text-right">
                        <div className="inline-flex items-center gap-xs">
                          <div className="h-1.5 w-16 rounded-full bg-glass-border overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cyan-electric"
                              style={{ width: `${Math.min(r.driver_activity_score ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-caption tabular-nums text-text-secondary">
                            {Math.round(r.driver_activity_score ?? 0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-md px-lg text-right tabular-nums text-body-bold text-text-primary">
                        {formatEUR(r.monthly_commission ?? 0)}
                      </td>
                      <td className="py-md px-lg text-right tabular-nums text-body-bold text-text-primary">
                        {formatEUR(r.total_earned ?? 0)}
                      </td>
                      <td className="py-md px-lg text-caption text-text-tertiary whitespace-nowrap">
                        {r.signup_date ? formatDateRelative(r.signup_date) : "—"}
                      </td>
                    </tr>
                  ))}
                  {recruits.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-huge text-center text-text-tertiary">
                        Aucun chauffeur recruté pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Commissions history */}
          <GlassCard className="!p-0 overflow-hidden">
            <div className="p-xl border-b border-glass-border">
              <Eyebrow>Historique commissions</Eyebrow>
              <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
                {commissions.length} commission{commissions.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-glass-border/50">
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Mois</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Niveau</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Statut</th>
                    <th className="text-right py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Montant</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Versé le</th>
                    <th className="text-left py-md px-lg text-micro uppercase tracking-wider text-text-tertiary font-bold">Stripe ID</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-glass-border/30 hover:bg-cyan-electric/5 transition-colors">
                      <td className="py-md px-lg text-caption text-text-secondary whitespace-nowrap">
                        {c.commission_month
                          ? new Date(c.commission_month).toLocaleDateString("fr-FR", {
                              month: "long",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-md px-lg">
                        <CommissionLevelBadge level={c.level} />
                      </td>
                      <td className="py-md px-lg">
                        <span
                          className={`inline-flex items-center px-sm py-xxs rounded-pill text-caption font-semibold border ${
                            c.status === "paid"
                              ? "bg-success/10 text-success border-success/25"
                              : c.status === "failed"
                              ? "bg-danger/10 text-danger border-danger/25"
                              : "bg-warning/10 text-warning border-warning/25"
                          }`}
                        >
                          {c.status === "paid" ? "Versé" : c.status === "failed" ? "Échec" : "Pending"}
                        </span>
                      </td>
                      <td className="py-md px-lg text-right tabular-nums text-body-bold text-text-primary">
                        {formatEUR(c.amount ?? 0)}
                      </td>
                      <td className="py-md px-lg text-caption text-text-tertiary whitespace-nowrap">
                        {c.paid_at ? formatDateRelative(c.paid_at) : "—"}
                      </td>
                      <td className="py-md px-lg text-micro text-text-muted font-mono truncate max-w-[140px]">
                        {c.stripe_transfer_id ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-huge text-center text-text-tertiary">
                        Aucune commission enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard className="text-center py-huge">
          <AlertCircle size={32} className="mx-auto text-warning mb-md" />
          <h2 className="text-h1 font-bold text-text-hero">Partner introuvable</h2>
          <p className="mt-xs text-body text-text-secondary">
            Ce partner n&apos;existe pas ou l&apos;API Railway est indisponible.
          </p>
          <Link
            href="/admin/partners"
            className="mt-lg inline-flex items-center gap-xs px-lg py-md rounded-lg bg-glass-low border border-glass-border text-text-primary hover:bg-glass-high transition-colors"
          >
            <ArrowLeft size={16} /> Retour à la liste
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
