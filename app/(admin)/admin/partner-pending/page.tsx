import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import {
  UserPlus,
  Building2,
  Mail,
  Phone,
  Hash,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { railwayGet, type RailwayPartner } from "@/lib/api/railway";
import { getRecentPartnersAdmin } from "@/lib/queries/admin";
import { getPendingApplications } from "@/lib/queries/partner-applications";
import { formatDateRelative } from "@/lib/utils";
import { ApproveActions } from "./ApproveActions";
import { ApplicationActions } from "./ApplicationActions";
import type { PartnerRow } from "@/types/database";

const COMPANY_TYPE_LABEL: Record<string, string> = {
  auto_ecole: "Auto-école",
  fleet_manager: "Gestionnaire flotte",
  influencer: "Influenceur",
  agent_commercial: "Agent commercial",
  federation: "Fédération",
  autre: "Autre",
};

export default async function AdminPartnerPendingPage() {
  let allPartners: RailwayPartner[] = [];
  let apiError: string | null = null;

  try {
    const res = await railwayGet<{ partners: RailwayPartner[] }>("/api/admin/partners");
    allPartners = res.partners ?? [];
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Erreur Railway";
    // Fallback Supabase
    const rows = (await getRecentPartnersAdmin(200)) as PartnerRow[];
    allPartners = rows.map((r) => ({
      id: r.id,
      company_name: r.company_name ?? "",
      company_type: r.company_type ?? "",
      contact_email: r.contact_email ?? "",
      contact_phone: r.contact_phone ?? undefined,
      siret: r.siret ?? undefined,
      status: (r.status as "pending" | "active" | "paused") ?? "pending",
      referral_code: r.referral_code ?? "",
      total_drivers: 0,
      active_drivers: 0,
      total_earned: 0,
      pending_commission: 0,
      discount_percent_for_recruits: 0,
      discount_duration_months: 1,
      is_promo_active: false,
      created_at: r.created_at ?? "",
    }));
  }

  const pending = allPartners.filter((p) => p.status === "pending");

  // Candidatures du site (formulaire /devenir-partenaire → table partner_applications).
  // C'est le NOUVEAU flux : aucune ligne `partners` n'existe encore, elle est créée à l'approbation.
  const applications = await getPendingApplications();
  const totalToReview = applications.length + pending.length;

  return (
    <div className="space-y-xl animate-fade-in-down">
      {/* Hero warm — validation humaine */}
      <HeroGradientCard variant="warm" className="!p-xl">
        <Eyebrow>Validation candidatures</Eyebrow>
        <h1 className="mt-xs text-display-l font-extrabold text-text-hero">
          {totalToReview > 0
            ? `${totalToReview} candidature${totalToReview > 1 ? "s" : ""} à traiter`
            : "Aucune candidature en attente"}
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Valide les partenaires pour activer leur compte et générer leur lien Stripe Connect.
        </p>
        {totalToReview === 0 && (
          <Link
            href="/admin/partners"
            className="mt-lg inline-flex items-center gap-xs px-lg py-md rounded-lg bg-glass-low border border-glass-border text-text-primary text-body-bold hover:bg-glass-high transition-colors"
          >
            Voir tous les partners <ChevronRight size={16} />
          </Link>
        )}
      </HeroGradientCard>

      {/* Nouvelles candidatures (site /devenir-partenaire → partner_applications) */}
      {applications.length > 0 && (
        <section className="space-y-lg">
          <div className="flex items-center gap-md">
            <Sparkles size={16} className="text-violet-royal" />
            <span className="text-caption text-text-secondary">
              <strong className="text-text-primary">{applications.length} nouvelle{applications.length > 1 ? "s" : ""}</strong>{" "}
              candidature{applications.length > 1 ? "s" : ""} depuis le site. Valider crée le compte, génère le code parrainage et envoie l&apos;invitation.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            {applications.map((a) => (
              <GlassCard key={a.id} variant="elevated" className="space-y-lg">
                {/* Header */}
                <div className="flex items-start justify-between gap-md">
                  <div className="flex items-center gap-md">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-body-bold font-extrabold text-white"
                      style={{ background: "linear-gradient(135deg, #8C52FF 0%, #FF6699 100%)" }}
                    >
                      {a.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-h2 font-extrabold text-text-hero">{a.company_name}</h2>
                      <span className="text-caption text-text-muted">{a.contact_name}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-xs px-sm py-xxs rounded-pill text-caption font-bold bg-violet-royal/12 text-violet-royal border border-violet-royal/25 shrink-0">
                    <UserPlus size={12} /> Candidature
                  </span>
                </div>

                {/* Infos */}
                <div className="space-y-sm">
                  <div className="flex items-center gap-sm text-caption text-text-secondary">
                    <Mail size={14} className="text-text-muted shrink-0" />
                    <span>{a.email}</span>
                  </div>
                  {a.phone && (
                    <div className="flex items-center gap-sm text-caption text-text-secondary">
                      <Phone size={14} className="text-text-muted shrink-0" />
                      <span>{a.phone}</span>
                    </div>
                  )}
                  {a.siret && (
                    <div className="flex items-center gap-sm text-caption text-text-secondary">
                      <Hash size={14} className="text-text-muted shrink-0" />
                      <span>SIRET {a.siret}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-sm text-caption text-text-secondary">
                    <Clock size={14} className="text-text-muted shrink-0" />
                    <span>Reçue {formatDateRelative(a.created_at)}</span>
                  </div>
                </div>

                {/* Message */}
                {a.message && (
                  <div className="flex items-start gap-sm p-sm rounded-lg bg-glass-low border border-glass-border">
                    <MessageSquare size={14} className="text-text-muted shrink-0 mt-xxs" />
                    <p className="text-caption text-text-secondary italic">“{a.message}”</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-xs border-t border-glass-border">
                  <ApplicationActions applicationId={a.id} companyName={a.company_name} />
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* API error */}
      {apiError && (
        <div className="flex items-start gap-md p-md rounded-lg bg-warning/10 border border-warning/25 text-warning text-caption">
          <AlertCircle size={16} className="shrink-0 mt-xxs" />
          <span>
            <strong>Railway API indisponible</strong> — données Supabase. Les actions Valider/Refuser nécessitent Railway.
            <br />
            <span className="text-text-tertiary">{apiError}</span>
          </span>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div className="flex items-center gap-md">
            <CheckCircle2 size={16} className="text-text-tertiary" />
            <span className="text-caption text-text-secondary">
              La validation active le compte du partenaire et génère un lien d'onboarding Stripe Connect.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            {pending.map((p) => (
              <GlassCard key={p.id} variant="elevated" className="space-y-lg">
                {/* Header */}
                <div className="flex items-start justify-between gap-md">
                  <div className="flex items-center gap-md">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-body-bold font-extrabold text-white"
                      style={{ background: "linear-gradient(135deg, #8C52FF 0%, #FF6699 100%)" }}
                    >
                      {p.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-h2 font-extrabold text-text-hero">{p.company_name}</h2>
                      <span className="text-caption text-text-muted">
                        {COMPANY_TYPE_LABEL[p.company_type] ?? p.company_type ?? "—"}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-xs px-sm py-xxs rounded-pill text-caption font-bold bg-warning/10 text-warning border border-warning/25 shrink-0">
                    <Clock size={12} /> Pending
                  </span>
                </div>

                {/* Infos */}
                <div className="space-y-sm">
                  <div className="flex items-center gap-sm text-caption text-text-secondary">
                    <Mail size={14} className="text-text-muted shrink-0" />
                    <span>{p.contact_email}</span>
                  </div>
                  {p.contact_phone && (
                    <div className="flex items-center gap-sm text-caption text-text-secondary">
                      <Phone size={14} className="text-text-muted shrink-0" />
                      <span>{p.contact_phone}</span>
                    </div>
                  )}
                  {p.siret && (
                    <div className="flex items-center gap-sm text-caption text-text-secondary">
                      <Hash size={14} className="text-text-muted shrink-0" />
                      <span>SIRET {p.siret}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-sm text-caption text-text-secondary">
                    <Building2 size={14} className="text-text-muted shrink-0" />
                    <span>Inscrit {p.created_at ? formatDateRelative(p.created_at) : "—"}</span>
                  </div>
                </div>

                {/* Code referral */}
                <div className="p-sm rounded-lg bg-glass-low border border-glass-border">
                  <div className="text-micro uppercase tracking-wider text-text-muted mb-xxs">Code referral</div>
                  <span className="font-mono text-body-bold text-violet-royal">{p.referral_code}</span>
                </div>

                {/* Actions */}
                <div className="pt-xs border-t border-glass-border">
                  <ApproveActions
                    partnerId={p.id}
                    companyName={p.company_name}
                  />
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {/* Stats rapides */}
      <GlassCard>
        <Eyebrow>Vue globale</Eyebrow>
        <h2 className="mt-xxs text-h1 font-extrabold text-text-hero mb-lg">
          Tous les partenaires
        </h2>
        <div className="grid grid-cols-3 gap-lg">
          {(["active", "pending", "paused"] as const).map((s) => {
            const count = allPartners.filter((p) => p.status === s).length;
            const cfg = {
              active: { label: "Actifs", color: "text-success" },
              pending: { label: "Pending", color: "text-warning" },
              paused: { label: "Pausés", color: "text-danger" },
            }[s];
            return (
              <div key={s} className="text-center p-md rounded-lg bg-glass-low border border-glass-border">
                <div className={`text-display-l font-extrabold tabular-nums ${cfg.color}`}>{count}</div>
                <div className="text-caption text-text-tertiary mt-xxs">{cfg.label}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-lg">
          <Link
            href="/admin/partners"
            className="inline-flex items-center gap-xs text-caption text-cyan-electric hover:text-cyan-ice transition-colors"
          >
            Voir la liste complète Partners MLM <ChevronRight size={14} />
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
