import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { Users, Copy, QrCode, Share2, TrendingUp } from "lucide-react";
import { getCurrentDriver } from "@/lib/queries/driver";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/foreas/StatCard";

export default async function DriverParrainagePage() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?next=/driver/parrainage");

  const referralLink = `https://foreas.xyz/r/${driver.referral_code?.toLowerCase() ?? "join"}`;

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow variant="gold">MLM 3 niveaux</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Parrainage
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Recrute des chauffeurs FOREAS, gagne des commissions à vie sur 3 niveaux.
        </p>
      </header>

      {/* Code parrainage */}
      <HeroGradientCard>
        <div>
          <Eyebrow>Mon code</Eyebrow>
          <div className="mt-xs text-display-xl font-extrabold tracking-tight text-text-hero font-mono">
            {driver.referral_code ?? "FOREAS-NEW"}
          </div>
          <p className="mt-md text-body text-text-secondary">
            Partage ce code à tes contacts. Tu gagnes <span className="text-violet-royal font-bold">10€/mois</span> par filleul direct,
            <span className="text-violet-royal font-bold"> 4€</span> en N2 et <span className="text-violet-royal font-bold">2€</span> en N3.
          </p>

          <div className="mt-lg flex flex-wrap gap-sm">
            <button className="flex items-center gap-xs px-md py-sm rounded-lg bg-violet-royal/15 border border-violet-royal/40 text-violet-royal hover:bg-violet-royal/25 transition-colors">
              <Copy size={14} />
              <span className="text-caption font-semibold">Copier</span>
            </button>
            <button className="flex items-center gap-xs px-md py-sm rounded-lg bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary transition-colors">
              <QrCode size={14} />
              <span className="text-caption font-semibold">QR code</span>
            </button>
            <button className="flex items-center gap-xs px-md py-sm rounded-lg bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary transition-colors">
              <Share2 size={14} />
              <span className="text-caption font-semibold">WhatsApp</span>
            </button>
          </div>

          <div className="mt-md p-md rounded-lg bg-obsidian-deep/60 border border-glass-border font-mono text-caption text-text-tertiary break-all">
            {referralLink}
          </div>
        </div>
      </HeroGradientCard>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
        <StatCard
          label="Filleuls directs (N1)"
          value={driver.total_direct_referrals ?? 0}
          icon={<Users size={18} />}
          status="success"
        />
        <StatCard
          label="Commissions en attente"
          value={Number(driver.mlm_earnings_pending ?? 0)}
          format="eur"
          icon={<TrendingUp size={18} />}
          status="warning"
        />
        <StatCard
          label="Total versé"
          value={Number(driver.mlm_earnings_paid ?? 0)}
          format="eur"
          icon={<TrendingUp size={18} />}
          status="success"
        />
      </section>

      {/* Mécanisme MLM */}
      <GlassCard>
        <Eyebrow>Mécanisme</Eyebrow>
        <h2 className="mt-xxs text-h1 font-bold text-text-hero">Comment ça marche ?</h2>
        <div className="mt-md grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div className="p-md rounded-lg bg-violet-royal/10 border border-violet-royal/20">
            <Eyebrow>Niveau 1</Eyebrow>
            <div className="mt-xxs text-display-l font-extrabold text-violet-royal">10€</div>
            <p className="mt-xs text-caption text-text-secondary">par mois et par filleul direct actif</p>
          </div>
          <div className="p-md rounded-lg bg-cyan-electric/10 border border-cyan-electric/20">
            <Eyebrow variant="cyan">Niveau 2</Eyebrow>
            <div className="mt-xxs text-display-l font-extrabold text-cyan-electric">4€</div>
            <p className="mt-xs text-caption text-text-secondary">par mois et par filleul N2</p>
          </div>
          <div className="p-md rounded-lg bg-gold-radiant/10 border border-gold-radiant/20">
            <Eyebrow variant="gold">Niveau 3</Eyebrow>
            <div className="mt-xxs text-display-l font-extrabold text-gold-radiant">2€</div>
            <p className="mt-xs text-caption text-text-secondary">par mois et par filleul N3</p>
          </div>
        </div>
        <p className="mt-md text-caption text-text-tertiary">
          Éligibilité : 4 paiements hebdo consécutifs sans annulation. Commissions versées chaque mois.
        </p>
      </GlassCard>
    </div>
  );
}
