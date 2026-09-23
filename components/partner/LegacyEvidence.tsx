import Link from 'next/link';
import {formatDate,formatMoney} from '@/lib/partner/model';
import type {LegacySnapshot} from '@/lib/partner/legacy-read';

const recordedStatus=(status:string)=>status==='paid'?'Marquée payée dans l’ancien registre'
  :status==='pending'?'En attente dans l’ancien registre':`État enregistré : ${status}`;

/** Existing records stay separate from the new programme's rights. */
export function LegacyEvidence({snapshot,cursor=null,showRows=true}:{snapshot:LegacySnapshot;cursor?:string|null;showRows?:boolean}){
  if(snapshot.me.status!=='ready')return snapshot.me.code==='PARTNER_NOT_FOUND'?null:<section className="partner-section" aria-label="Historique du compte partenaire"><div className="partner-notice" role="status"><h2>Votre ancien historique est indisponible.</h2><p>Aucun zéro n’est déduit de cette erreur. Actualisez la page pour réessayer.</p></div></section>;
  if(snapshot.me.data.admission.state!=='active'&&snapshot.me.data.admission.state!=='paused')return <section className="partner-section" aria-label="Historique du compte partenaire"><div className="partner-notice" role="status"><h2>Le relevé attend l’admission de votre dossier.</h2><p>Consultez l’état de votre candidature ou contactez FOREAS.</p></div></section>;
  const summary=snapshot.summary.status==='ready'?snapshot.summary.data:null;
  const summaryAsOf=snapshot.summary.status==='ready'?snapshot.summary.asOf:null;
  const commissions=snapshot.commissions.status==='ready'?snapshot.commissions.data:null;
  return <section className="partner-section" aria-label="Historique du compte partenaire">
    <div className="partner-section-heading"><h2>Votre historique existant</h2></div>
    <p className="partner-caption">Ces chiffres viennent de l’ancien registre. Ils ne sont pas encore rapprochés du nouveau programme. Les états de paiement ne prouvent pas une arrivée sur votre compte bancaire.</p>
    {summary?<>
      <div className="partner-summary-grid mt-lg">
        <div className="partner-panel"><p>Marqué payé</p><p className="partner-stat">{formatMoney(summary.totals_cents.paid)}</p><p className="partner-caption">{summary.counts.paid} ligne{summary.counts.paid>1?'s':''} enregistrée{summary.counts.paid>1?'s':''}</p></div>
        <div className="partner-panel"><p>En attente</p><p className="partner-stat">{formatMoney(summary.totals_cents.pending)}</p><p className="partner-caption">{summary.counts.pending} ligne{summary.counts.pending>1?'s':''} enregistrée{summary.counts.pending>1?'s':''}</p></div>
        <div className="partner-panel"><p>Autres états</p><p className="partner-stat">{formatMoney(summary.totals_cents.other)}</p><p className="partner-caption">{summary.counts.other} ligne{summary.counts.other>1?'s':''} à lire dans le détail</p></div>
        <div className="partner-panel"><p>Chauffeurs liés</p><p className="partner-stat">{summary.referrals_count}</p><p className="partner-caption">Nombre distinct dans l’ancien registre.</p></div>
      </div>
      <p className="partner-caption mt-lg">Lecture au {formatDate(summaryAsOf)}.</p>
    </>:<div className="partner-notice" role="status"><h3>Vos anciens montants sont indisponibles.</h3><p>Aucun zéro n’est déduit de cette erreur. Actualisez la page pour réessayer.</p></div>}
    {showRows&&<>
      <div className="partner-section-heading mt-lg"><h3>Les lignes enregistrées</h3></div>
      {commissions?<>
        {commissions.items.length?<div className="partner-ledger">{commissions.items.map(item=><article key={item.id}>
          <div><h3>{item.month?`Mois ${item.month.slice(0,7)}`:'Commission enregistrée'}</h3><p>{formatDate(item.created_at)}</p><p className="partner-caption break-all">Référence : {item.id}</p></div>
          <span className={`partner-status ${item.status==='paid'?'is-paid':''}`}>{recordedStatus(item.status)}</span>
          <strong>{formatMoney(item.amount_cents)}</strong>
          {item.paid_at&&<p className="partner-caption">Date de paiement enregistrée : {formatDate(item.paid_at)}. Réception bancaire non vérifiée.</p>}
        </article>)}</div>:<div className="partner-panel"><p>Aucune ligne renvoyée sur cette page de l’ancien registre.</p></div>}
        <div className="flex flex-wrap gap-md mt-lg">{cursor&&<Link className="partner-button" href="/partner/gains">Revenir au début</Link>}{commissions.pagination.next_cursor&&<Link className="partner-button" href={`/partner/gains?cursor=${encodeURIComponent(commissions.pagination.next_cursor)}`}>Voir les lignes suivantes</Link>}</div>
      </>:<div className="partner-notice" role="status"><h3>Le détail ancien est indisponible.</h3><p>Les montants déjà lus restent affichés sans inventer de lignes.</p></div>}
    </>}
  </section>;
}
