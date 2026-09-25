import { validSummaryEvidence, validLedgerPage, publicSummaryEvidence, publicLedgerScope, publicCommissionEvidence } from './ledger-evidence';
import type { PartnerMe, PartnerSummary, PartnerCommissions, PartnerTerms, PartnerKit } from './contract';
import { z } from 'zod';

export const COMMISSION_STATES = ['pending_review','eligible','reserved','paid','blocked','reversed','policy_unmapped'] as const;
const nullableDate = z.string().datetime({ offset: true }).nullable();
const money = z.number().int().safe().nonnegative();
export const meSchema = z.object({
  organization: z.object({ id: z.string().min(1), name: z.string().min(1), type: z.string().nullable() }),
  program: z.literal('driver_referral'), target: z.literal('drivers'),
  admission: z.object({ state: z.enum(['pending','active','paused','unknown']), approved_at: nullableDate }),
  capabilities: z.object({ can_read_commissions: z.boolean(), can_recruit: z.boolean(), can_manage_payout: z.boolean() }),
  referral: z.object({code: z.string().min(1), url: z.string().url()}).nullable(),
  terms: z.object({ required_version: z.string().nullable(), accepted_version: z.string().nullable(), acceptance_required: z.boolean() }),
});
const stateAmounts = z.object(Object.fromEntries(COMMISSION_STATES.map(s => [s, money])) as Record<typeof COMMISSION_STATES[number], typeof money>);
const summaryBaseSchema = z.object({
  currency: z.literal('EUR'), period: z.object({basis:z.literal('all_time'), from:z.null(), to:z.null()}),
  totals_cents: stateAmounts, counts: stateAmounts,
  coverage: z.object({ledger:z.literal('parrainage_droits'), legacy_reconciled:z.literal(false)}),
  payout_account:z.object({state:z.enum(['not_connected','incomplete','ready','unavailable']), checked_at:z.string().datetime({offset:true})}),
  next_payout_at: nullableDate,
});
const commissionsBaseSchema = z.object({
  items:z.array(z.object({ id:z.string(), kind:z.enum(['monthly_paid','annual_once']), status:z.enum(COMMISSION_STATES), amount_cents:money,
    currency:z.literal('EUR'), invoice_paid_at:nullableDate, eligible_at:nullableDate, payout_month:z.string().nullable(), paid_at:nullableDate, created_at:z.string().datetime({offset:true}) })),
  pagination:z.object({limit:z.number().int().min(1).max(50),next_cursor:z.string().nullable()}),
  coverage:z.object({ledger:z.literal('parrainage_droits'),legacy_reconciled:z.literal(false)}),
});

// Preserve verified evidence fields instead of silently stripping them.
export const summarySchema = z.custom<PartnerSummary>(v=>validSummaryEvidence(v)&&summaryBaseSchema.safeParse(v).success).transform(v=>({...summaryBaseSchema.parse(v),...publicSummaryEvidence(v)}));
export const commissionsSchema = z.custom<PartnerCommissions>(v=>validLedgerPage(v,50)&&commissionsBaseSchema.safeParse(v).success
 &&(v as PartnerCommissions).items.length<=(v as PartnerCommissions).pagination.limit).transform(v=>({...commissionsBaseSchema.parse(v),...publicLedgerScope(v),
 items:commissionsBaseSchema.parse(v).items.map((item,i)=>({...item,...publicCommissionEvidence(v.items[i])}))}));

export const termsSchema = z.object({document:z.object({version:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/i),document_url:z.string().url(),published_at:z.string().datetime({offset:true})}).nullable(), accepted_version:z.string().nullable()});
export const kitSchema = z.object({availability:z.enum(['available','not_published']),items:z.array(z.object({id:z.string(),title:z.string(),description:z.string(),url:z.string().url(),format:z.string(),version:z.string(),published_at:z.string().datetime({offset:true})}))});
export type Resource<T> = {status:'ready';data:T;asOf:string} | {status:'unavailable';code:string};
export interface PartnerSnapshot { me:Resource<PartnerMe>; summary:Resource<PartnerSummary>; commissions:Resource<PartnerCommissions>; terms:Resource<PartnerTerms>; kit:Resource<PartnerKit>; demo:boolean; viewerId?:string|null; }
export function audienceForCategory(category:string|null|undefined):'centre'|'loueur'|'flotte'|'createur'|'chauffeur'|null {
  const map:Record<string,'centre'|'loueur'|'flotte'|'createur'|'chauffeur'>={training:'centre',centre:'centre',rental:'loueur',loueur:'loueur',fleet_employer:'flotte',fleet_admin:'flotte',cooperative:'flotte',flotte:'flotte',creator:'createur',createur:'createur',driver:'chauffeur',chauffeur:'chauffeur'};
  return map[category?.toLowerCase()??'']??null;
}
export type PartnerSection = 'accueil'|'partager'|'gains'|'aide';
export function safeWebUrl(value:string|null|undefined):string|null {
  if (!value) return null;
  try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function referralForSharing(me:PartnerMe|null):string|null {
  if (!me || me.admission.state!=='active' || !me.capabilities.can_recruit || me.terms.acceptance_required) return null;
  if (!me.terms.required_version || me.terms.accepted_version!==me.terms.required_version) return null;
  if (!me.referral?.code.trim()) return null;
  const safe=safeWebUrl(me.referral.url);
  if(!safe) return null;
  const u=new URL(safe);
  if(u.hostname!=='www.foreas.xyz' || u.port || u.search || u.hash) return null;
  return u.pathname===`/r/${encodeURIComponent(me.referral.code)}` ? safe : null;
}
export function formatMoney(cents:number):string {
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
}
export function formatDate(value:string|null):string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Date non communiquée';
  return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium', timeZone:'Europe/Paris'}).format(new Date(value));
}
export function previewEnabled():boolean { return process.env.NODE_ENV==='development' && process.env.FOREAS_PARTNER_DEMO==='1'; }
export function previewSnapshot(error=false):PartnerSnapshot {
  const absent = {status:'unavailable',code:error?'SERVICE_UNAVAILABLE':'PREVIEW_NO_ACCOUNT'} as const;
  return {me:absent,summary:absent,commissions:absent,terms:absent,kit:absent,demo:true};
}
