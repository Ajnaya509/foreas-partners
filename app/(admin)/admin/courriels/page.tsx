import Link from 'next/link';
import {isCurrentUserAdmin} from '@/lib/queries/admin';
import {partnerViewer} from '@/lib/partner/server';
import {BillingNotices} from '@/components/partner/BillingNotices';
export const dynamic='force-dynamic';
export default async function CourrielsPage(){
 if(!await isCurrentUserAdmin())return <p role="alert">Un accès administrateur vérifié est nécessaire.</p>;
 const viewerId=await partnerViewer();
 if(!viewerId)return <p role="alert">Reconnecte-toi pour consulter les courriels.</p>;
 return <div className="space-y-xl"><header><Link href="/admin/finance" className="font-display inline-flex min-h-12 items-center underline">Retour à Finance</Link>
  <h1 className="font-display text-display-l text-text-hero">Courriels d’abonnement</h1>
  <p className="text-body-lg text-text-secondary mt-md">Vérifie un courriel, puis choisis l’action adaptée. Les paiements restent séparés.</p></header>
  <BillingNotices key={viewerId} viewerId={viewerId}/></div>;
}
