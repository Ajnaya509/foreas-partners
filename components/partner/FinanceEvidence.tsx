import type {PartnerSummary} from '@/lib/partner/contract';
import {formatMoney} from '@/lib/partner/model';
import {RESERVATION_STATES,type CommissionEvidence} from '@/lib/partner/ledger-evidence';
export const reservationLabels={prepared:'Préparation',dispatching:'Envoi en cours',uncertain:'Confirmation attendue'};
export function FinanceEvidence({summary}:{summary:PartnerSummary}){
 return <div className="space-y-md mt-lg">
  <p className="partner-caption">Un transfert confirmé ne prouve pas son arrivée en banque. Les éventuelles reprises de transfert ne sont pas rapprochées dans ce relevé.</p>
  {summary.totals_cents.reserved>0&&<details className="partner-faq"><summary>Comprendre les montants réservés</summary>
   <p className="partner-caption py-md">Ces montants sont déjà compris dans le total réservé. Une confirmation attendue ne rend pas l’argent disponible.</p>
   <dl className="space-y-sm pb-lg">{RESERVATION_STATES.map(state=><div className="flex flex-wrap justify-between gap-md" key={state}><dt>{reservationLabels[state]}</dt><dd className="tabular-nums">{formatMoney(summary.reserved_breakdown.totals_cents[state])}</dd></div>)}</dl>
  </details>}
  {summary.confirmed_review.count>0&&<p className="partner-caption" role="status">Parmi les montants transférés, {formatMoney(summary.confirmed_review.amount_cents)} nécessitent une vérification. Ce montant est déjà compris dans le total transféré.</p>}
 </div>;
}
export function CommissionEvidenceNote({item}:{item:CommissionEvidence}){
 return <>{item.reservation_state&&<p className="partner-caption">{reservationLabels[item.reservation_state]}. Ce montant reste réservé.</p>}
 {(item.batch_review_required||item.right_review_required)&&<p className="partner-caption">Cette commission ou son versement nécessite une vérification.</p>}
 {item.transfer_confirmed&&item.right_status==='reversed'&&<p className="partner-caption">Le droit a été corrigé. Le transfert historique reste affiché.</p>}</>;
}
