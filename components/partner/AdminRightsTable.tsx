import {CommissionEvidenceNote} from './FinanceEvidence';
import type { AdminRights } from '@/lib/partner/admin-program';
import { financeLabels } from '@/lib/partner/admin-program';
const money=(cents:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100);
const date=(value:string|null)=>value?new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeZone:'Europe/Paris'}).format(new Date(value)):'Non confirmée';
/** No total is inferred from a partial page; every amount belongs to a real right. */
export function AdminRightsTable({data,asOf}:{data:AdminRights;asOf:string}){
 return <section className="space-y-md text-text-secondary" aria-label="Relevé des droits">
   <p>Lecture du {date(data.observed_at)}. {data.items.length} droit{data.items.length>1?'s':''} sur cette page. L’ancien historique reste à rapprocher.</p>
   <p>Un transfert confirmé ne prouve pas une réception bancaire. Les reprises de transfert ne sont pas rapprochées ici. Aucun versement ne se déclenche depuis ce relevé.</p>
   {data.items.length===0?<p>Aucun droit ne correspond à cette page et à ces filtres.</p>:<>
    <div className="space-y-md md:hidden">{data.items.map(item=><article key={item.id} className="rounded-lg border border-glass-border p-md space-y-md" aria-label={`Droit ${item.id}`}>
     <div className="flex flex-wrap items-start justify-between gap-sm"><div><h3 className="font-display text-h3 text-text-primary">{item.kind==='monthly_paid'?'Mensuel':'Premier annuel'}</h3><p>{financeLabels[item.status]}</p></div><strong className="tabular-nums whitespace-nowrap text-text-primary">{money(item.amount_cents)}</strong></div>
     <div><p className="text-caption">Référence du droit</p><p className="text-caption break-all select-all text-text-primary">{item.id}</p></div>
     <div><p className="text-caption">{item.sponsor_type==='partner'?'Partenaire':'Chauffeur'} apporteur</p><p className="text-caption break-all select-all">{item.sponsor_id}</p></div>
     <dl className="space-y-sm text-caption">{[['Facture payée',date(item.invoice_paid_at)],['Mois de rattachement',item.payout_month??'Non confirmé'],['Transfert confirmé',date(item.paid_at)]].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-sm"><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     <CommissionEvidenceNote item={item}/>
    </article>)}</div>
    <div className="hidden md:block overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Référence','Apporteur direct','Formule','État','Montant','Facture payée','Mois de rattachement','Transfert confirmé'].map(text=><th key={text} className="p-sm font-medium text-text-primary">{text}</th>)}</tr></thead><tbody>{data.items.map(item=><tr key={item.id} className="border-t border-glass-border">
     <td className="p-sm text-caption"><span className="break-all select-all">{item.id}</span></td>
     <td className="p-sm text-caption">{item.sponsor_type==='partner'?'Partenaire':'Chauffeur'}<br/><span className="break-all select-all">{item.sponsor_id}</span></td>
     <td className="p-sm">{item.kind==='monthly_paid'?'Mensuel':'Premier annuel'}</td><td className="p-sm">{financeLabels[item.status]}<CommissionEvidenceNote item={item}/></td>
     <td className="p-sm whitespace-nowrap tabular-nums text-text-primary">{money(item.amount_cents)}</td><td className="p-sm whitespace-nowrap">{date(item.invoice_paid_at)}</td>
     <td className="p-sm whitespace-nowrap">{item.payout_month??'Non confirmé'}</td><td className="p-sm whitespace-nowrap">{date(item.paid_at)}</td>
   </tr>)}</tbody></table></div></>}
 </section>;
}
