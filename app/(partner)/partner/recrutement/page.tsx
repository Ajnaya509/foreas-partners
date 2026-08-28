import { PROMESSE_PARRAINAGE_COURTE } from '@/lib/parrainagePromesse'
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { MessageSquare, TrendingUp, Users } from "lucide-react";
import { getCurrentPartner } from "@/lib/queries/partner";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/foreas/StatCard";
import { CopyLinkButton } from "./CopyLinkButton";

export default async function PartnerRecrutementPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/login?next=/partner/recrutement");

  // Seule landing partenaire qui EXISTE sur le site : /cap?ref=CODE
  // (/p/<code> était un 404 — aucune route /p ni redirect côté foreas-website).
  // Majuscules car /cap normalise le code en .toUpperCase().
  const code = (partner.referral_code ?? "").trim().toUpperCase();
  const referralLink = `https://foreas.xyz/cap?ref=${code}`;

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
        <div className="flex items-center gap-xs">
          <Eyebrow>Mon code parrainage</Eyebrow>
        </div>
        <div className="mt-xs flex items-baseline gap-md">
          <span className="text-display-xl font-extrabold tracking-tight text-text-hero font-mono">
            {partner.referral_code}
          </span>
        </div>
        {code ? (
          <>
            {/* 28/08 — « 25€/sem » RETIRÉ. Ce n'était pas un autre montant,
                c'était une autre structure : un revenu hebdomadaire à vie, soit
                environ 108 €/mois par tête. La règle réelle donne 5 €/mois payé
                ou 50 € une fois. Le contrat partenaire §8 l'interdit nommément.

                Et « chaque inscription génère » était faux dans les deux sens :
                une inscription ne génère rien. Seule une FACTURE PAYÉE ouvre un
                droit — un essai gratuit n'en ouvre aucun. */}
            <p className="mt-md text-body text-text-secondary">
              Partage cette URL avec tes prospects chauffeurs.{' '}
              <span className="text-violet-royal font-bold">
                {PROMESSE_PARRAINAGE_COURTE}
              </span>
            </p>
            <p className="mt-xs text-caption text-text-tertiary">
              Une inscription seule ne verse rien : le droit s’ouvre au premier
              paiement réellement encaissé.
            </p>
            <div className="mt-lg flex flex-wrap gap-sm">
              {/* Boutons QR et WhatsApp retirés : rien derrière — un bouton mort est un mensonge. */}
              <CopyLinkButton link={referralLink} />
            </div>
            <div className="mt-md p-md rounded-lg bg-obsidian-deep/60 border border-glass-border font-mono text-caption text-text-tertiary break-all">
              {referralLink}
            </div>
          </>
        ) : (
          <p className="mt-md text-body text-warning">
            Ton code parrainage n&apos;est pas encore généré — contacte le
            support avant de partager quoi que ce soit.
          </p>
        )}
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
              Lead Generator — pas encore disponible
            </p>
            <p className="mt-xs text-caption text-text-tertiary">
              Aucun lead n&apos;est encore livré dans ton espace. On te
              préviendra ici dès l&apos;ouverture.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
