import Link from 'next/link';
import {isCurrentUserAdmin} from '@/lib/queries/admin';
import {partnerViewer} from '@/lib/partner/server';
import {PayoutDocumentReviews} from '@/components/partner/PayoutDocumentReviews';
export const dynamic='force-dynamic';
export default async function PayoutReviewsPage(){
 if(!await isCurrentUserAdmin())return <p role="alert">Un accès administrateur vérifié est nécessaire.</p>;
 const viewerId=await partnerViewer();if(!viewerId)return <p role="alert">Reconnecte-toi pour vérifier les versements.</p>;
 return <div className="space-y-xl"><header><Link href="/admin/finance" className="font-display inline-flex min-h-12 items-center underline">Retour à Finance</Link>
  <h1 className="font-display text-display-l text-text-hero">Avant de verser</h1>
  <p className="text-body-lg text-text-secondary mt-md">Prépare le montant, vérifie les pièces, puis valide pour le prochain versement.</p></header>
  <PayoutDocumentReviews key={viewerId} viewerId={viewerId}/></div>;
}
