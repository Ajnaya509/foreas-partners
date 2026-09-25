import { validLedgerPage, publicLedgerScope, publicCommissionEvidence, type CommissionEvidence, type LedgerScope } from './ledger-evidence';
import { z } from 'zod';

export const partnerUuid = z.string().uuid();
const integer = z.number().int().nonnegative().refine(Number.isSafeInteger);
const date = z.string().refine(value => Number.isFinite(Date.parse(value)));
export const financeStates = ['pending_review','eligible','reserved','paid','blocked','reversed','policy_unmapped'] as const;
export const financeLabels: Record<typeof financeStates[number],string> = {
  pending_review:'À vérifier',eligible:'Admissible',reserved:'Réservé',paid:'Transféré',
  blocked:'Bloquée',reversed:'Droit corrigé',policy_unmapped:'Historique à vérifier',
};
const adminRightsBaseSchema = z.object({
  items:z.array(z.object({
    id:partnerUuid,sponsor_id:partnerUuid,sponsor_type:z.enum(['driver','partner']),
    kind:z.enum(['monthly_paid','annual_once']),status:z.enum(financeStates),amount_cents:integer,
    currency:z.literal('EUR'),invoice_paid_at:date.nullable(),eligible_at:date.nullable(),
    payout_month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(),paid_at:date.nullable(),created_at:date,
  })),
  pagination:z.object({limit:integer.refine(value=>value>=1&&value<=50),next_cursor:z.string().min(1).max(4096).nullable()}),
  coverage:z.object({ledger:z.literal('parrainage_droits'),legacy_reconciled:z.literal(false)}),
});
export type AdminRights = Omit<z.infer<typeof adminRightsBaseSchema>,'items'|'coverage'> & LedgerScope & {
 items:(z.infer<typeof adminRightsBaseSchema>['items'][number]&CommissionEvidence)[];
};
export const adminRightsSchema=z.custom<AdminRights>(v=>validLedgerPage(v,50)&&adminRightsBaseSchema.safeParse(v).success
 &&(v as AdminRights).items.length<=(v as AdminRights).pagination.limit).transform(v=>({...adminRightsBaseSchema.parse(v),...publicLedgerScope(v),
 items:adminRightsBaseSchema.parse(v).items.map((item,i)=>({...item,...publicCommissionEvidence(v.items[i])}))}));
export const rightsQuerySchema=z.object({
  status:z.enum(financeStates).optional(),sponsor_type:z.enum(['driver','partner']).optional(),
  sponsor_id:partnerUuid.optional(),cursor:z.string().min(1).max(4096).optional(),
}).strict().refine(value=>Boolean(value.sponsor_id)===Boolean(value.sponsor_type));
export type RightsQuery=z.infer<typeof rightsQuerySchema>;
export function rightsQueryString(query:RightsQuery):string {
  const valid=rightsQuerySchema.parse(query),params=new URLSearchParams({limit:'25'});
  for(const [key,value] of Object.entries(valid))if(value)params.set(key,value);
  return params.toString();
}
export const discountSchema=z.object({
  landing_message:z.string().max(2000).nullable(),
  landing_hero_url:z.string().url().refine(value=>new URL(value).protocol==='https:').nullable(),
}).strict();
export type DiscountInput=z.infer<typeof discountSchema>;
export const adminPartnerSchema=z.object({
  id:partnerUuid,company_name:z.string().min(1),contact_email:z.string().email(),
  company_type:z.string().nullable(),contact_phone:z.string().nullable().optional(),siret:z.string().nullable().optional(),
  status:z.enum(['pending','active','paused']),referral_code:z.string().nullable(),approved_at:date.nullable(),
  discount_percent_for_recruits:z.number().int().min(0).max(50).nullable(),
  discount_duration_months:z.union([z.literal(1),z.literal(3),z.literal(6),z.literal(12)]).nullable(),
  landing_message:z.string().nullable(),landing_hero_url:z.string().nullable(),is_promo_active:z.boolean().nullable(),
});
export type AdminPartner=z.infer<typeof adminPartnerSchema>;

export const adminPartnerListRowSchema=z.object({
  id:partnerUuid,company_name:z.string().min(1),contact_email:z.string().email(),
  company_type:z.string().nullable(),status:z.enum(['pending','active','paused']),
  referral_code:z.string().nullable(),created_at:date.nullable(),
});
export const adminPartnerListSchema=z.object({partners:z.array(adminPartnerListRowSchema)});
export type AdminPartnerListRow=z.infer<typeof adminPartnerListRowSchema>;
export const partnerListQuerySchema=z.object({
  status:z.enum(['pending','active','paused']).optional(),q:z.string().max(200).optional(),
  page:z.string().regex(/^[1-9]\d{0,5}$/).optional(),
}).strict();
