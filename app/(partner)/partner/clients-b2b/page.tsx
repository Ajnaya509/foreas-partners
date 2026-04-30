import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Briefcase, TrendingUp, Star, Hotel, Building2, Stethoscope } from "lucide-react";
import { getCurrentPartner } from "@/lib/queries/partner";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/foreas/StatCard";
import { createClient } from "@/lib/supabase/server";
import type { B2BProspectRow } from "@/types/database";

export default async function PartnerClientsB2BPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/login?next=/partner/clients-b2b");

  const supabase = await createClient();

  // Pipeline B2B (les contrats à distribuer)
  const { data: prospects } = await supabase
    .from("pieuvre_b2b_prospects")
    .select("*")
    .order("qualification_score", { ascending: false })
    .limit(15);

  const list = (prospects as B2BProspectRow[] | null) ?? [];

  // Stats
  const qualified = list.filter((p) => p.pipeline_stage === "qualified").length;
  const avgScore =
    list.length > 0
      ? list.reduce((acc, p) => acc + (Number(p.qualification_score) || 0), 0) / list.length
      : 0;

  const industryIcon = (industry: string | null) => {
    if (!industry) return <Building2 size={16} />;
    const s = industry.toLowerCase();
    if (s.includes("hotel") || s.includes("hôtel")) return <Hotel size={16} />;
    if (s.includes("clini") || s.includes("santé") || s.includes("médic")) return <Stethoscope size={16} />;
    return <Building2 size={16} />;
  };

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Pipeline B2B</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Clients privés
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Contrats hôtels, cliniques, conciergeries de luxe à distribuer à tes chauffeurs.
        </p>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
        <StatCard
          label="Prospects qualifiés"
          value={qualified}
          icon={<Star size={18} />}
          status="success"
        />
        <StatCard
          label="Score moyen pipeline"
          value={avgScore.toFixed(0)}
          icon={<TrendingUp size={18} />}
          status="neutral"
        />
        <StatCard
          label="Total prospects pipeline"
          value={list.length}
          icon={<Briefcase size={18} />}
          status="neutral"
        />
      </section>

      {/* Pipeline list */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow>Pipeline en cours</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">
            {list.length} prospects suivis
          </h2>
        </div>

        {list.length === 0 ? (
          <div className="py-huge text-center">
            <Briefcase size={36} className="mx-auto text-text-tertiary mb-md" />
            <p className="text-body text-text-tertiary">
              Aucun prospect B2B pour le moment.
            </p>
            <p className="mt-xs text-caption text-text-muted">
              L&apos;équipe terrain FOREAS travaille à la signature de contrats hôtels et cliniques.
            </p>
          </div>
        ) : (
          <div className="space-y-sm">
            {list.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-md p-md rounded-lg bg-glass-low border border-glass-border hover:border-violet-royal/30 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-royal/15 text-violet-royal">
                  {industryIcon(p.industry)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body-bold text-text-primary truncate">
                    {p.company_name ?? "Société"}
                  </div>
                  <div className="text-caption text-text-tertiary truncate">
                    {[p.industry, p.city, p.contact_title].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {p.qualification_score && (
                    <div className="text-body-bold tabular-nums text-violet-royal">
                      {Number(p.qualification_score).toFixed(0)}
                      <span className="text-micro text-text-tertiary">/100</span>
                    </div>
                  )}
                  <div className="text-micro uppercase tracking-wider text-text-muted">
                    {p.pipeline_stage ?? "à qualifier"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
