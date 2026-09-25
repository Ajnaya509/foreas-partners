/** Same read evidence in the server, partner portal and app. No bank receipt is inferred. */
export const LEDGER_EVIDENCE_VERSION='commission-evidence.v1' as const;
export const LEDGER_STATES=['pending_review','eligible','reserved','paid','blocked','reversed','policy_unmapped'] as const;
export const RESERVATION_STATES=['prepared','dispatching','uncertain'] as const;
export type ReservationState=typeof RESERVATION_STATES[number];
export interface EvidenceCoverage {
 ledger:'parrainage_droits';legacy_reconciled:false;transfer_basis:'recorded_provider_confirmation';
 bank_receipt:'not_tracked';transfer_reversals:'not_reconciled';
}
export interface LedgerScope {evidence_version:typeof LEDGER_EVIDENCE_VERSION;observed_at:string;coverage:EvidenceCoverage}
export interface CommissionEvidence {
 right_status:'pending_review'|'eligible'|'paid'|'blocked'|'reversed'|'policy_unmapped';
 transfer_confirmed:boolean;reservation_state:ReservationState|null;
 batch_review_required:boolean;right_review_required:boolean;
}
export interface SummaryEvidence extends LedgerScope {
 reserved_breakdown:{totals_cents:Record<ReservationState,number>;counts:Record<ReservationState,number>};
 confirmed_review:{amount_cents:number;count:number};
}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export const ledgerUuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function ledgerDate(v:unknown):v is string {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v))return false;
 const day=v.slice(0,10),parsed=new Date(day+'T00:00:00Z');
 return Number.isFinite(Date.parse(v))&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===day;
}
export function validLedgerScope(v:unknown):v is LedgerScope {
 return object(v)&&v.evidence_version===LEDGER_EVIDENCE_VERSION&&ledgerDate(v.observed_at)
  &&object(v.coverage)&&v.coverage.ledger==='parrainage_droits'&&v.coverage.legacy_reconciled===false
  &&v.coverage.transfer_basis==='recorded_provider_confirmation'&&v.coverage.bank_receipt==='not_tracked'
  &&v.coverage.transfer_reversals==='not_reconciled';
}
function map(v:unknown,keys:readonly string[]):v is Record<string,number> {
 return object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>integer(v[k]));
}
const sum=(values:number[])=>values.reduce((a,v)=>a+BigInt(v),BigInt(0));
function possibleRights(count:number,amount:number):boolean {
 const n=BigInt(count),cents=BigInt(amount);
 if(cents%BigInt(500)!==BigInt(0))return false;
 const extra=cents/BigInt(500)-n;
 if(extra<BigInt(0))return false;
 const minAnnual=extra>n?(extra-n+BigInt(7))/BigInt(8):BigInt(0);
 const maxAnnual=(extra/BigInt(9))<n?extra/BigInt(9):n;
 return minAnnual<=maxAnnual;
}
export function validSummaryEvidence(v:unknown):v is SummaryEvidence&{totals_cents:Record<string,number>;counts:Record<string,number>} {
 if(!validLedgerScope(v))return false;const x=v as any;
 if(!map(x.totals_cents,LEDGER_STATES)||!map(x.counts,LEDGER_STATES)||!object(x.reserved_breakdown)
  ||!map(x.reserved_breakdown.totals_cents,RESERVATION_STATES)||!map(x.reserved_breakdown.counts,RESERVATION_STATES)
  ||!object(x.confirmed_review)||!integer(x.confirmed_review.amount_cents)||!integer(x.confirmed_review.count))return false;
 if(LEDGER_STATES.some(k=>!possibleRights(x.counts[k],x.totals_cents[k]))
  ||RESERVATION_STATES.some(k=>!possibleRights(x.reserved_breakdown.counts[k],x.reserved_breakdown.totals_cents[k]))
  ||!possibleRights(x.confirmed_review.count,x.confirmed_review.amount_cents))return false;
 return sum(RESERVATION_STATES.map(k=>x.reserved_breakdown.totals_cents[k]))===BigInt(x.totals_cents.reserved)
  &&sum(RESERVATION_STATES.map(k=>x.reserved_breakdown.counts[k]))===BigInt(x.counts.reserved)
  &&x.confirmed_review.amount_cents<=x.totals_cents.paid&&x.confirmed_review.count<=x.counts.paid
  &&possibleRights(x.counts.paid-x.confirmed_review.count,x.totals_cents.paid-x.confirmed_review.amount_cents);
}
export function validCommissionEvidence(v:unknown):v is CommissionEvidence {
 if(!object(v)||!ledgerUuid(v.id)||!['monthly_paid','annual_once'].includes(v.kind)
  ||!(v.kind==='monthly_paid'?[500,1000].includes(v.amount_cents):v.amount_cents===5000)||v.currency!=='EUR'||!LEDGER_STATES.includes(v.status)
  ||!ledgerDate(v.created_at)||![v.invoice_paid_at,v.eligible_at,v.paid_at].every(d=>d===null||ledgerDate(d))
  ||!(v.payout_month===null||typeof v.payout_month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v.payout_month))
  ||!['pending_review','eligible','paid','blocked','reversed','policy_unmapped'].includes(v.right_status)
  ||typeof v.transfer_confirmed!=='boolean'||typeof v.batch_review_required!=='boolean'||typeof v.right_review_required!=='boolean')return false;
 if(['blocked','reversed'].includes(v.right_status)&&!v.right_review_required)return false;
 if(v.batch_review_required&&!['paid','reserved','policy_unmapped'].includes(v.status))return false;
 if(['pending_review','eligible'].includes(v.status)&&(v.right_status!==v.status||v.right_review_required))return false;
 if(v.status==='reversed'&&v.right_status!=='reversed')return false;
 if(v.status==='blocked'&&(!['pending_review','eligible','blocked'].includes(v.right_status)||!v.right_review_required))return false;
 if((v.status==='paid')!==v.transfer_confirmed||(v.paid_at!==null)!==v.transfer_confirmed)return false;
 return v.status==='reserved'?RESERVATION_STATES.includes(v.reservation_state)&&v.right_status==='eligible':v.reservation_state===null;
}
function instant(value:string):bigint {
 const fraction=/\.(\d{1,6})/.exec(value)?.[1]??'';
 return BigInt(Date.parse(value))*BigInt(1000)+BigInt(fraction.padEnd(6,'0').slice(3));
}
/** Rows are a current, ordered page, not a historical snapshot across multiple requests. */
export function validLedgerPage(v:unknown,maxRows=51):boolean {
 if(!validLedgerScope(v))return false;const x=v as any;
 if(!Array.isArray(x.items)||x.items.length>maxRows||!x.items.every(validCommissionEvidence))return false;
 const ids=new Set<string>();let previous:any=null;
 for(const row of x.items){
  if(ids.has(row.id.toLowerCase())||row.paid_at!==null&&instant(row.paid_at)>instant(x.observed_at))return false;
  if(previous&&(instant(row.created_at)>instant(previous.created_at)
   ||instant(row.created_at)===instant(previous.created_at)&&row.id.toLowerCase()>=previous.id.toLowerCase()))return false;
  ids.add(row.id.toLowerCase());previous=row;
 }
 return true;
}

/** Whitelisted fields only; a database object is never forwarded wholesale. */
export function publicLedgerScope(v:LedgerScope):LedgerScope {
 return {evidence_version:LEDGER_EVIDENCE_VERSION,observed_at:v.observed_at,coverage:{ledger:'parrainage_droits',legacy_reconciled:false,
  transfer_basis:'recorded_provider_confirmation',bank_receipt:'not_tracked',transfer_reversals:'not_reconciled'}};
}
export function publicSummaryEvidence(v:SummaryEvidence):SummaryEvidence {
 return {...publicLedgerScope(v),reserved_breakdown:{
  totals_cents:{prepared:v.reserved_breakdown.totals_cents.prepared,dispatching:v.reserved_breakdown.totals_cents.dispatching,uncertain:v.reserved_breakdown.totals_cents.uncertain},
  counts:{prepared:v.reserved_breakdown.counts.prepared,dispatching:v.reserved_breakdown.counts.dispatching,uncertain:v.reserved_breakdown.counts.uncertain}},
  confirmed_review:{amount_cents:v.confirmed_review.amount_cents,count:v.confirmed_review.count}};
}
export function publicCommissionEvidence(v:CommissionEvidence):CommissionEvidence {
 return {right_status:v.right_status,transfer_confirmed:v.transfer_confirmed,reservation_state:v.reservation_state,
  batch_review_required:v.batch_review_required,right_review_required:v.right_review_required};
}

export function isBeforeLedgerCursor(row:{created_at:string;id:string},at:string|null,id:string|null):boolean {
 if(at===null||id===null)return at===null&&id===null;
 if(!ledgerDate(at)||!ledgerUuid(id)||!ledgerDate(row.created_at)||!ledgerUuid(row.id))return false;
 return instant(row.created_at)<instant(at)||(instant(row.created_at)===instant(at)&&row.id.toLowerCase()<id.toLowerCase());
}
