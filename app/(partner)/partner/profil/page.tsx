import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Building2, Mail, Phone, MapPin, FileText, Calendar, BadgeCheck } from "lucide-react";
import { getCurrentPartner } from "@/lib/queries/partner";
import { redirect } from "next/navigation";

export default async function PartnerProfilPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/login?next=/partner/profil");

  const fields: { icon: React.ReactNode; label: string; value: string | null }[] = [
    { icon: <Building2 size={16} />, label: "Société", value: partner.company_name },
    { icon: <FileText size={16} />, label: "SIRET", value: partner.siret },
    { icon: <Mail size={16} />, label: "Email", value: partner.contact_email },
    { icon: <Phone size={16} />, label: "Téléphone", value: partner.contact_phone },
    { icon: <MapPin size={16} />, label: "Adresse", value: partner.address },
    {
      icon: <Calendar size={16} />,
      label: "Inscrit depuis",
      value: partner.created_at
        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(partner.created_at))
        : null,
    },
  ];

  return (
    <div className="space-y-xl animate-fade-in-down max-w-4xl">
      <header>
        <Eyebrow>Mon compte directeur</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">Profil</h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Informations de ton compte agent commercial FOREAS.
        </p>
      </header>

      {/* Identité */}
      <GlassCard variant="elevated">
        <div className="flex items-start gap-lg mb-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-royal shadow-glow font-extrabold text-display-l text-white">
            {partner.company_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1">
            <h2 className="text-h1 font-extrabold text-text-hero">
              {partner.company_name}
            </h2>
            <p className="text-caption text-text-secondary">
              {partner.company_type ?? "Agent commercial indépendant"}
            </p>
            <div className="mt-xs flex items-center gap-xs">
              <BadgeCheck size={14} className="text-success" />
              <span className="text-caption text-success font-semibold">
                Code partenaire : {partner.referral_code}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-caption text-text-tertiary">Statut</span>
            <span
              className={`mt-xxs px-md py-xs rounded-pill text-caption font-bold border ${
                partner.status === "active"
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-warning/10 text-warning border-warning/30"
              }`}
            >
              {partner.status === "active" ? "Actif" : partner.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {fields.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-sm p-md rounded-lg bg-glass-low border border-glass-border"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-royal/10 text-violet-royal">
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-micro uppercase tracking-wider text-text-tertiary">
                  {f.label}
                </div>
                <div className="text-body-bold text-text-primary truncate">
                  {f.value ?? <span className="text-text-muted">—</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Statut juridique */}
      <GlassCard>
        <Eyebrow>Statut juridique</Eyebrow>
        <h3 className="mt-xxs text-h2 font-bold text-text-hero">Agent commercial indépendant</h3>
        <div className="mt-md text-body text-text-secondary space-y-sm">
          <p>
            En tant que directeur de groupe FOREAS, tu opères sous le statut d&apos;
            <span className="text-text-primary font-semibold">agent commercial indépendant</span>{" "}
            (article L134-1 Code commerce). Ce statut te permet :
          </p>
          <ul className="list-disc pl-lg space-y-xxs text-text-secondary">
            <li>D&apos;émettre des factures mensuelles à FOREAS pour tes commissions</li>
            <li>De rester totalement indépendant (pas de subordination, pas de salariat)</li>
            <li>De travailler avec d&apos;autres partenaires en parallèle si tu le souhaites</li>
            <li>De plafonner tes charges via micro-entreprise (jusqu&apos;à 77 700€/an)</li>
          </ul>
          <p className="mt-md text-caption text-text-tertiary">
            Référence : <span className="font-mono">DASHBOARD_BRIEF.md §0.3</span>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
