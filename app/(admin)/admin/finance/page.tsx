import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { StatCard } from "@/components/foreas/StatCard";
import { Wallet, TrendingUp, Activity, Repeat } from "lucide-react";
import { getAdminGlobalKPIs } from "@/lib/queries/admin";
import Link from 'next/link';
import {getAdminRights} from '@/lib/partner/admin-program-server';
import {AdminRightsTable} from '@/components/partner/AdminRightsTable';

export default async function AdminFinancePage() {
  const kpis = await getAdminGlobalKPIs();
  const rights = await getAdminRights({});

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Console Admin</Eyebrow>
        <h1 className="mt-xxs font-display text-display-l text-text-hero">Finance</h1>
        {/* « estimé » partout : le chiffre sort d'une constante (admin.ts), pas de Stripe. */}
        <p className="mt-xs text-body-lg text-text-secondary">
          Revenus estimés et droits du programme partenaire. Les confirmations de transfert sont séparées des réceptions bancaires.
        </p>
      </header>

      <Link href="/admin/verification-versements" className="font-display inline-flex min-h-12 items-center mr-lg underline">Vérifier les pièces avant versement</Link>
      <Link href="/admin/courriels" className="font-display inline-flex min-h-12 items-center underline">Vérifier les courriels d’abonnement</Link>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <StatCard label="MRR estimé" value={kpis.mrrEstimated} format="eur" status="success" icon={<Repeat size={18} />} />
        <StatCard label="ARR projeté" value={kpis.mrrEstimated * 12} format="eur" status="success" icon={<TrendingUp size={18} />} />
        <StatCard label="Subs actives" value={kpis.activeSubs} icon={<Activity size={18} />} status="neutral" />
        <StatCard label="Revenus jour" value={kpis.revenueToday} format="eur" icon={<Wallet size={18} />} status="success" />
      </section>

      <GlassCard>
        <Eyebrow>Programme partenaire</Eyebrow>
        <h2 className="mt-xxs font-display text-h1 text-text-hero">Commissions et transferts</h2>
        {rights.status==='ready'?<AdminRightsTable data={rights.data} asOf={rights.asOf}/>:<p role="alert" className="mt-md text-text-secondary">Le relevé des commissions n’est pas disponible. Aucun total n’est déduit de cette erreur.</p>}
        <Link href="/admin/payouts" className="font-display inline-flex min-h-12 items-center mt-md underline">Ouvrir le relevé et ses filtres</Link>
        <p className="mt-md text-caption text-text-secondary">Cette page lit le registre. Elle ne vérifie pas en direct l’état global des services Stripe et ne déclenche aucun versement.</p>
      </GlassCard>
    </div>
  );
}
