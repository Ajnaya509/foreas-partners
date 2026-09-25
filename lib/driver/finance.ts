/** Shared, dependency-free read contract. Money is integer EUR cents.
 * `paid` means historical transfer confirmation, never current net balance or
 * bank receipt. Review totals and reservation breakdowns are subsets.
 */
export const DRIVER_FINANCE_STATES = ['pending_review','eligible','reserved','paid','blocked','reversed','policy_unmapped'] as const;
export type DriverFinanceState = typeof DRIVER_FINANCE_STATES[number];
export const DRIVER_RESERVATION_STATES = ['prepared','dispatching','uncertain'] as const;
export type DriverReservationState = typeof DRIVER_RESERVATION_STATES[number];
export type DriverFinanceItem = {
 id:string; kind:'monthly_paid'|'annual_once'; status:DriverFinanceState; amount_cents:number; currency:'EUR';
 invoice_paid_at:string|null; eligible_at:string|null; payout_month:string|null; paid_at:string|null; created_at:string;
 right_status:Exclude<DriverFinanceState,'reserved'>; transfer_confirmed:boolean;
 reservation_state:DriverReservationState|null; batch_review_required:boolean; right_review_required:boolean;
};
export type DriverFinance = {
 contract_version:'driver-finance.v1'; viewer_id:string; sponsor:{type:'driver';id:string}; currency:'EUR';
 as_of:string; period:'all_time'; totals_cents:Record<DriverFinanceState,number>; counts:Record<DriverFinanceState,number>;
 reserved_breakdown:{totals_cents:Record<DriverReservationState,number>;counts:Record<DriverReservationState,number>};
 confirmed_review:{amount_cents:number;count:number}; items:DriverFinanceItem[]; items_limit:25; has_more:boolean;
 coverage:{ledger:'parrainage_droits';legacy_reconciled:false;transfer_basis:'recorded_provider_confirmation';bank_receipt:'not_tracked';transfer_reversals:'not_reconciled'};
 next_payout_at:null; referral:{code:string;url:string}|null;
 payout_account:{state:'not_connected'|'incomplete'|'ready'|'unavailable';checked_at:string};
};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const object=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0;
function date(v:unknown):v is string {
 if(typeof v!=='string'||v.length>64||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v))) return false;
 const year=Number(v.slice(0,4)),month=Number(v.slice(5,7)),day=Number(v.slice(8,10));
 return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate();
}
const nullableDate=(v:unknown)=>v===null||date(v);
function map(v:unknown,keys:readonly string[]):boolean {
 return object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>integer(v[k]));
}
function sum(v:Record<string,number>):number {return Object.values(v).reduce((a,n)=>a+n,0);}
/** Returns null for any missing, contradictory or unsafe financial fact.
 * No coercion, zero fallback, current-clock fallback or legacy API fallback.
 */
export function parseDriverFinance(value:unknown,viewerId:string):DriverFinance|null {
 if(!object(value)) return null;
 const d=value;
 if(d.contract_version!=='driver-finance.v1'||!uuid(viewerId)||d.viewer_id!==viewerId
  ||!object(d.sponsor)||d.sponsor.type!=='driver'||!uuid(d.sponsor.id)||d.currency!=='EUR'
  ||d.period!=='all_time'||!date(d.as_of)||d.next_payout_at!==null
  ||!map(d.totals_cents,DRIVER_FINANCE_STATES)||!map(d.counts,DRIVER_FINANCE_STATES)
  ||!integer(sum(d.totals_cents))||!integer(sum(d.counts))) return null;
 const rb=d.reserved_breakdown,review=d.confirmed_review;
 if(!object(rb)||!map(rb.totals_cents,DRIVER_RESERVATION_STATES)||!map(rb.counts,DRIVER_RESERVATION_STATES)
  ||sum(rb.totals_cents)!==d.totals_cents.reserved||sum(rb.counts)!==d.counts.reserved
  ||!object(review)||!integer(review.amount_cents)||!integer(review.count)
  ||review.amount_cents>d.totals_cents.paid||review.count>d.counts.paid) return null;
 const coverage=d.coverage,account=d.payout_account;
 if(!object(coverage)||coverage.ledger!=='parrainage_droits'||coverage.legacy_reconciled!==false
  ||coverage.transfer_basis!=='recorded_provider_confirmation'||coverage.bank_receipt!=='not_tracked'
  ||coverage.transfer_reversals!=='not_reconciled'||!object(account)
  ||!['not_connected','incomplete','ready','unavailable'].includes(account.state)||!date(account.checked_at)) return null;
 if(d.referral!==null&&(!object(d.referral)||typeof d.referral.code!=='string'
  ||!/^[A-Z0-9-]{6,32}$/.test(d.referral.code)||['FOREAS','FOREAS-NEW'].includes(d.referral.code)
  ||d.referral.url!=='https://www.foreas.xyz/r/'+encodeURIComponent(d.referral.code))) return null;
 if(!Array.isArray(d.items)||d.items_limit!==25||typeof d.has_more!=='boolean'
  ||d.has_more!==(sum(d.counts)>25)||d.items.length!==Math.min(25,sum(d.counts))) return null;
 const ids=new Set<string>(), amounts:Record<string,number>={},counts:Record<string,number>={};
 const reservedAmounts:Record<string,number>={},reservedCounts:Record<string,number>={};
 let reviewAmount=0,reviewCount=0;
 for(const r of d.items){
  if(!object(r)||!uuid(r.id)||ids.has(r.id)||!(DRIVER_FINANCE_STATES as readonly string[]).includes(r.status)
   ||r.currency!=='EUR'||!['monthly_paid','annual_once'].includes(r.kind)
   ||r.amount_cents!==(r.kind==='monthly_paid'?500:5000)||!date(r.created_at)
   ||!nullableDate(r.invoice_paid_at)||!nullableDate(r.eligible_at)||!nullableDate(r.paid_at)
   ||(r.payout_month!==null&&(typeof r.payout_month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.payout_month)))
   ||!(DRIVER_FINANCE_STATES as readonly string[]).includes(r.right_status)||r.right_status==='reserved'
   ||typeof r.transfer_confirmed!=='boolean'||typeof r.batch_review_required!=='boolean'||typeof r.right_review_required!=='boolean'
   ||r.transfer_confirmed!==(r.status==='paid')||r.transfer_confirmed!==(r.paid_at!==null)
   ||(r.status==='reserved'?!(DRIVER_RESERVATION_STATES as readonly string[]).includes(r.reservation_state):r.reservation_state!==null)) return null;
  ids.add(r.id);amounts[r.status]=(amounts[r.status]??0)+r.amount_cents;counts[r.status]=(counts[r.status]??0)+1;
  if(r.status==='reserved'){
   reservedAmounts[r.reservation_state]=(reservedAmounts[r.reservation_state]??0)+r.amount_cents;
   reservedCounts[r.reservation_state]=(reservedCounts[r.reservation_state]??0)+1;
  }
  if(r.transfer_confirmed&&(r.batch_review_required||r.right_review_required)){reviewAmount+=r.amount_cents;reviewCount++;}
 }
 if(DRIVER_FINANCE_STATES.some(k=>(amounts[k]??0)>d.totals_cents[k]||(counts[k]??0)>d.counts[k]
  ||(!d.has_more&&((amounts[k]??0)!==d.totals_cents[k]||(counts[k]??0)!==d.counts[k])))) return null;
 if(DRIVER_RESERVATION_STATES.some(k=>(reservedAmounts[k]??0)>rb.totals_cents[k]||(reservedCounts[k]??0)>rb.counts[k]
  ||(!d.has_more&&((reservedAmounts[k]??0)!==rb.totals_cents[k]||(reservedCounts[k]??0)!==rb.counts[k])))
  ||reviewAmount>review.amount_cents||reviewCount>review.count
  ||(!d.has_more&&(reviewAmount!==review.amount_cents||reviewCount!==review.count)))return null;
 // Copy only public contract fields. Never spread the internal SQL response.
 return {contract_version:d.contract_version,viewer_id:d.viewer_id,sponsor:{type:'driver',id:d.sponsor.id},currency:'EUR',
  as_of:d.as_of,period:'all_time',totals_cents:d.totals_cents,counts:d.counts,reserved_breakdown:{totals_cents:rb.totals_cents,counts:rb.counts},
  confirmed_review:{amount_cents:review.amount_cents,count:review.count},items:d.items.map(r=>({
   id:r.id,kind:r.kind,status:r.status,amount_cents:r.amount_cents,currency:r.currency,invoice_paid_at:r.invoice_paid_at,
   eligible_at:r.eligible_at,payout_month:r.payout_month,paid_at:r.paid_at,created_at:r.created_at,right_status:r.right_status,
   transfer_confirmed:r.transfer_confirmed,reservation_state:r.reservation_state,batch_review_required:r.batch_review_required,right_review_required:r.right_review_required,
  })),items_limit:25,has_more:d.has_more,coverage:{ledger:'parrainage_droits',legacy_reconciled:false,
   transfer_basis:'recorded_provider_confirmation',bank_receipt:'not_tracked',transfer_reversals:'not_reconciled'},next_payout_at:null,
  referral:d.referral===null?null:{code:d.referral.code,url:d.referral.url},payout_account:{state:account.state,checked_at:account.checked_at}};
}
