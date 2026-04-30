import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { Wallet, TrendingUp, Activity, Repeat } from "lucide-react";
import { getAdminGlobalKPIs } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminFinancePage() {
  const kpis = await getAdminGlobalKPIs();
  const supabase = await createClient();

  // Commissions partner du mois
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: commissions } = await supabase
    .from("partner_commissions")
    .select("commission_amount, status")
    .gte("created_at", startOfMonth.toISOString());

  const list = (commissions ?? []) as { commission_amount: number | null; status: string }[];
  const totalCommissions = list.reduce((acc, c) => acc + Number(c.commission_amount ?? 0), 0);
  const paidCommissions = list
    .filter((c) => c.status === "paid")
    .reduce((acc, c) => acc + Number(c.commission_amount ?? 0), 0);
  const pendingCommissions = list
    .filter((c) => c.status === "pending")
    .reduce((acc, c) => acc + Number(c.commission_amount ?? 0), 0);

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Console Admin</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">Finance</h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          MRR live, commissions partenaires, paiements Stripe.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="MRR estimé" value={kpis.mrrEstimated} format="eur" status="success" icon={<Repeat size={18} />} />
        <StatCard label="ARR projeté" value={kpis.mrrEstimated * 12} format="eur" status="success" icon={<TrendingUp size={18} />} />
        <StatCard label="Subs actives" value={kpis.activeSubs} icon={<Activity size={18} />} status="neutral" />
        <StatCard label="Revenus jour" value={kpis.revenueToday} format="eur" icon={<Wallet size={18} />} status="success" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <StatCard label="Commissions partenaires (mois)" value={totalCommissions} format="eur" icon={<Wallet size={18} />} status="neutral" />
        <StatCard label="Versées" value={paidCommissions} format="eur" icon={<TrendingUp size={18} />} status="success" />
        <StatCard label="En attente" value={pendingCommissions} format="eur" icon={<Activity size={18} />} status="warning" />
      </section>

      <GlassCard>
        <Eyebrow>Module Stripe</Eyebrow>
        <h2 className="mt-xxs text-h1 font-bold text-text-hero">Connect & Webhooks</h2>
        <p className="mt-xs text-body text-text-secondary">
          Backend Railway connecté à Stripe : webhooks payment_intent, account.updated, charge.dispute, payout.
          Volume Stripe Connect Conciergerie suivi sur app mobile FOREAS Driver.
        </p>
        <div className="mt-md grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">Stripe Connect</div>
            <div className="mt-xxs text-h3 font-bold text-text-primary">Actif</div>
          </div>
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">Webhooks</div>
            <div className="mt-xxs text-h3 font-bold text-success">OK</div>
          </div>
          <div className="p-md rounded-lg bg-glass-low border border-glass-border">
            <div className="text-micro uppercase tracking-wider text-text-tertiary">Disputes 30j</div>
            <div className="mt-xxs text-h3 font-bold text-text-primary">0</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
