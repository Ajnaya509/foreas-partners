"use client";
import { useRouter } from 'next/navigation';
import { DRIVER_FINANCE_STATES, type DriverFinance, type DriverFinanceState } from '@/lib/driver/finance';

const label:Record<DriverFinanceState,string>={pending_review:'À vérifier',eligible:'Admissibles au versement',reserved:'Réservés',paid:'Transférés',blocked:'Suspendus',reversed:'Droits corrigés',policy_unmapped:'Historique à vérifier'};
const help:Record<DriverFinanceState,string>={pending_review:'Commissions en cours de vérification.',eligible:'Commissions validées, sans transfert confirmé.',reserved:'Sommes déjà réservées à un transfert.',paid:'Transferts confirmés vers ton compte de versement.',blocked:'Commissions suspendues après un incident.',reversed:'Droits annulés ou corrigés. Cela ne prouve pas une reprise d’argent.',policy_unmapped:'Règle ou preuve ancienne à vérifier avec FOREAS.'};
const money=(c:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(c/100);
const date=(d:string)=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(d));
export function DriverFinancePanel({finance}:{finance:DriverFinance|null}) {
 const router=useRouter();
 if(!finance)return <section className="partner-panel"><h2 className="partner-small-title">Tes gains de parrainage</h2>
  <p role="status">Ton relevé est indisponible. Aucun montant ne peut être confirmé pour le moment.</p>
  <button className="partner-button" onClick={()=>router.refresh()}>Réessayer</button>
  <a className="partner-text-link" href="mailto:contact@foreas.xyz">Contacter FOREAS</a>
 </section>;
 const account={not_connected:'Compte de versement à ouvrir',incomplete:'Compte de versement à compléter',ready:'Compte de versement prêt',unavailable:'État du compte de versement indisponible'}[finance.payout_account.state];
 return <section className="partner-panel space-y-lg" aria-labelledby="driver-gains-title">
  <div><h2 id="driver-gains-title" className="partner-small-title">Tes gains de parrainage</h2><p className="partner-caption">Relevé du {date(finance.as_of)}, heure de Paris.</p></div>
  <p className="partner-caption">Ces montants couvrent le registre actuel. L’ancien historique n’a pas encore été rapproché.</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
   {DRIVER_FINANCE_STATES.slice(0,4).map(state=><div key={state}><p>{label[state]}</p><p className="partner-stat">{money(finance.totals_cents[state])}</p><p className="partner-caption">{help[state]}</p></div>)}
  </div>
  <dl className="space-y-md">{DRIVER_FINANCE_STATES.slice(4).map(state=><div key={state} className="flex flex-wrap justify-between gap-sm">
   <dt>{label[state]}<span className="block partner-caption">{help[state]}</span></dt><dd>{money(finance.totals_cents[state])}</dd>
  </div>)}</dl>
  {finance.reserved_breakdown.totals_cents.uncertain>0&&<p className="partner-notice">La confirmation de {money(finance.reserved_breakdown.totals_cents.uncertain)} est en cours de vérification. Cette somme est déjà incluse dans « Réservés ».</p>}
  {finance.confirmed_review.amount_cents>0&&<p className="partner-notice">{money(finance.confirmed_review.amount_cents)} de transferts nécessitent une vérification. Ils restent inclus dans « Transférés ». Cela ne signifie pas que l’argent a été repris.</p>}
  <p className="partner-caption">Les transferts affichés sont un historique. L’arrivée en banque et les éventuelles reprises d’argent ne sont pas confirmées ici.</p>
  <div><p>{account}</p><p className="partner-caption">État vérifié le {date(finance.payout_account.checked_at)}. Gère ce compte dans l’app FOREAS Driver.</p></div>
  <details><summary className="cursor-pointer">Voir les {finance.items.length} dernières commissions</summary>
   {finance.items.length===0?<p>Aucune commission enregistrée.</p>:<ul className="space-y-lg pt-lg">{finance.items.map(item=><li key={item.id} className="space-y-xs">
    <p>{item.kind==='monthly_paid'?'Échéance mensuelle':'Premier annuel'} · {money(item.amount_cents)} · {label[item.status]}</p>
    <p className="partner-caption">Commission enregistrée le {date(item.created_at)}.</p>
    {item.paid_at&&<p className="partner-caption">Confirmation du transfert enregistrée le {date(item.paid_at)}.</p>}
    {(item.batch_review_required||item.right_review_required)&&<p className="partner-caption">Cette commission ou son versement nécessite une vérification.</p>}
    <p className="partner-caption break-all">Référence : {item.id}</p>
   </li>)}</ul>}
   {finance.has_more&&<p className="partner-caption">Seules les 25 dernières commissions sont affichées. Les montants ci-dessus couvrent tout le relevé. Contacte FOREAS pour les lignes antérieures.</p>}
  </details>
  <div className="flex flex-wrap gap-md"><button className="partner-button" onClick={()=>router.refresh()}>Actualiser mon relevé</button><a className="partner-text-link" href="mailto:contact@foreas.xyz">Faire vérifier mon relevé</a></div>
 </section>;
}
