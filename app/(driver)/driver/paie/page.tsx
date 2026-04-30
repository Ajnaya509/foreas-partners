import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { FileText, Download, Calendar, CheckCircle2, Wallet } from "lucide-react";
import { getCurrentDriver, getDriverKPIs } from "@/lib/queries/driver";
import { redirect } from "next/navigation";
import { formatEUR } from "@/lib/utils";
import { StatCard } from "@/components/foreas/StatCard";

export default async function DriverPaiePage() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?next=/driver/paie");

  const kpis = await getDriverKPIs(driver.id);

  // Estimation salaire net (CA brut - 10% commission FOREAS - ~30% charges)
  const monthGross = kpis.monthCA;
  const commission = monthGross * 0.10;
  const subscription = 50; // abonnement app
  const charges = (monthGross - commission - subscription) * 0.30;
  const netSalary = monthGross - commission - subscription - charges;

  const months = [
    { month: "Avril 2026", status: "current", net: netSalary },
    { month: "Mars 2026", status: "available", net: 2480 },
    { month: "Février 2026", status: "available", net: 2310 },
    { month: "Janvier 2026", status: "available", net: 2620 },
  ];

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>CAE FOREAS · CDI entrepreneur-salarié</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Mes fiches de paie
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Cotisations sociales versées chaque vendredi. Fiche de paie officielle au début du mois suivant.
        </p>
      </header>

      {/* Estimation mois courant */}
      <GlassCard variant="elevated">
        <div className="flex items-start gap-lg">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-success">
            <Wallet size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <Eyebrow variant="muted">Estimation paie en cours</Eyebrow>
            <h2 className="mt-xxs text-h1 font-extrabold text-text-hero">
              {formatEUR(netSalary)} net
            </h2>
            <p className="mt-xs text-caption text-text-secondary">
              Mois en cours · Calcul mis à jour en temps réel
            </p>
          </div>
        </div>

        <div className="mt-xl grid grid-cols-2 sm:grid-cols-4 gap-md">
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">CA brut</div>
            <div className="mt-xxs text-h3 font-bold text-text-primary">{formatEUR(monthGross)}</div>
          </div>
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">- Commission FOREAS (10%)</div>
            <div className="mt-xxs text-h3 font-bold text-text-tertiary">-{formatEUR(commission)}</div>
          </div>
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">- Abonnement app</div>
            <div className="mt-xxs text-h3 font-bold text-text-tertiary">-{formatEUR(subscription)}</div>
          </div>
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">- Charges sociales (~30%)</div>
            <div className="mt-xxs text-h3 font-bold text-text-tertiary">-{formatEUR(charges)}</div>
          </div>
        </div>
      </GlassCard>

      {/* Bénéfices CDI */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="Sécu sociale" value="✓" icon={<CheckCircle2 size={18} />} status="success" />
        <StatCard label="Retraite" value="✓" icon={<CheckCircle2 size={18} />} status="success" />
        <StatCard label="Chômage" value="✓" icon={<CheckCircle2 size={18} />} status="success" />
        <StatCard label="Mutuelle" value="✓" icon={<CheckCircle2 size={18} />} status="success" />
      </section>

      {/* Liste fiches */}
      <GlassCard>
        <div className="mb-lg">
          <Eyebrow>Historique</Eyebrow>
          <h2 className="mt-xxs text-h1 font-bold text-text-hero">Fiches de paie disponibles</h2>
        </div>

        <div className="space-y-sm">
          {months.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-md p-md rounded-lg bg-glass-low border border-glass-border hover:border-violet-royal/30 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-royal/15 text-violet-royal">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <div className="text-body-bold text-text-primary">{m.month}</div>
                <div className="text-caption text-text-tertiary">
                  Net : {formatEUR(m.net)}
                </div>
              </div>
              {m.status === "available" ? (
                <button className="flex items-center gap-xs px-md py-xs rounded-lg bg-violet-royal/15 border border-violet-royal/40 text-violet-royal hover:bg-violet-royal/25 transition-colors">
                  <Download size={14} />
                  <span className="text-caption font-semibold">PDF</span>
                </button>
              ) : (
                <span className="flex items-center gap-xs px-md py-xs rounded-lg bg-warning/10 border border-warning/30 text-warning">
                  <Calendar size={14} />
                  <span className="text-caption font-semibold">En cours</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
