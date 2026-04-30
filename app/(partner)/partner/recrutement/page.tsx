import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { Copy, QrCode, MessageSquare, TrendingUp, Users, Share2 } from "lucide-react";
import { getCurrentPartner } from "@/lib/queries/partner";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/foreas/StatCard";

export default async function PartnerRecrutementPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/login?next=/partner/recrutement");

  const referralLink = `https://foreas.xyz/p/${partner.referral_code.toLowerCase()}`;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Acquisition chauffeurs</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Recrutement
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Outils pour recruter de nouveaux chauffeurs dans ton groupe.
        </p>
      </header>

      {/* Mon code parrainage hero */}
      <HeroGradientCard>
        <div className="flex flex-col lg:flex-row gap-xl items-start">
          <div className="flex-1">
            <div className="flex items-center gap-xs">
              <Eyebrow>Mon code parrainage</Eyebrow>
            </div>
            <div className="mt-xs flex items-baseline gap-md">
              <span className="text-display-xl font-extrabold tracking-tight text-text-hero font-mono">
                {partner.referral_code}
              </span>
            </div>
            <p className="mt-md text-body text-text-secondary">
              Partage cette URL avec tes prospects chauffeurs. Chaque inscription
              via ton code génère <span className="text-violet-royal font-bold">25€/sem</span> de commission.
            </p>
            <div className="mt-lg flex flex-wrap gap-sm">
              <button className="flex items-center gap-xs px-md py-sm rounded-lg bg-violet-royal/15 border border-violet-royal/40 text-violet-royal hover:bg-violet-royal/25 transition-colors">
                <Copy size={14} />
                <span className="text-caption font-semibold">Copier le lien</span>
              </button>
              <button className="flex items-center gap-xs px-md py-sm rounded-lg bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary transition-colors">
                <QrCode size={14} />
                <span className="text-caption font-semibold">QR code</span>
              </button>
              <button className="flex items-center gap-xs px-md py-sm rounded-lg bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary transition-colors">
                <Share2 size={14} />
                <span className="text-caption font-semibold">Partager WhatsApp</span>
              </button>
            </div>
            <div className="mt-md p-md rounded-lg bg-obsidian-deep/60 border border-glass-border font-mono text-caption text-text-tertiary break-all">
              {referralLink}
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center justify-center w-48 h-48 rounded-xl bg-glass-low border border-glass-border">
            <QrCode size={120} className="text-violet-royal/60" />
            <span className="mt-xs text-caption text-text-tertiary">QR code</span>
          </div>
        </div>
      </HeroGradientCard>

      {/* KPI parrainage */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
        <StatCard
          label="Chauffeurs recrutés (total)"
          value={partner.total_drivers ?? 0}
          icon={<Users size={18} />}
          status="success"
        />
        <StatCard
          label="Chauffeurs actifs"
          value={partner.active_drivers ?? 0}
          icon={<TrendingUp size={18} />}
          status="success"
        />
        <StatCard
          label="Total gagné parrainage"
          value={Number(partner.total_earned ?? 0)}
          format="eur"
          icon={<MessageSquare size={18} />}
          status="success"
        />
      </section>

      {/* Lead Generator placeholder */}
      <GlassCard variant="elevated">
        <div className="flex items-start justify-between gap-lg">
          <div>
            <Eyebrow>Lead Generator</Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              Prospects chauffeurs qualifiés
            </h2>
            <p className="mt-xs text-body text-text-secondary max-w-2xl">
              SCRAPER + SPY (tentacules Pieuvre) sortent chaque jour des leads
              chauffeurs scorés depuis LeBonCoin, Facebook groups VTC, Instagram.
              Un clic = message WhatsApp pré-rempli prêt à envoyer.
            </p>
          </div>
        </div>
        <div className="mt-lg p-xl rounded-lg border border-dashed border-violet-royal/30 bg-violet-royal/5">
          <div className="text-center">
            <p className="text-body-bold text-violet-royal">
              🚀 Module Lead Generator en cours d&apos;activation
            </p>
            <p className="mt-xs text-caption text-text-tertiary">
              Disponible Q3 2026 — premier batch de leads scrapés en cours sur Paris/Île-de-France
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
