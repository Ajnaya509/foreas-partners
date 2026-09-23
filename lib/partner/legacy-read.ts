import {z} from 'zod';

export const LEGACY_READ_VERSION='partner.legacy.read.v1' as const;
const uuid=z.string().uuid();
const date=z.string().refine(value=>Number.isFinite(Date.parse(value)));
const amount=z.number().int().safe();
const count=z.number().int().safe().nonnegative();

/** A separate, read-only source. Its values are never merged into the new ledger. */
export const legacyMeSchema=z.object({
  organization:z.object({id:uuid,name:z.string().min(1),type:z.string().nullable()}),
  admission:z.object({state:z.string().min(1),approved_at:date.nullable()}),
  referral:z.object({code:z.string().min(1),url:z.null()}).nullable(),
});
export const legacySummarySchema=z.object({
  currency:z.literal('EUR'),source:z.literal('partner_commissions'),legacy_reconciled:z.literal(false),
  referrals_count:count,
  totals_cents:z.object({paid:amount,pending:amount,other:amount}),
  counts:z.object({paid:count,pending:count,other:count}),
});
export const legacyCommissionsSchema=z.object({
  source:z.literal('partner_commissions'),
  items:z.array(z.object({
    id:uuid,month:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    status:z.string().min(1).max(200),amount_cents:amount,
    paid_at:date.nullable(),created_at:date,
  })).max(50),
  pagination:z.object({limit:z.number().int().min(1).max(50),next_cursor:z.string().min(1).max(500).nullable()}),
}).refine(value=>value.items.length<=value.pagination.limit);

export type LegacyMe=z.infer<typeof legacyMeSchema>;
export type LegacySummary=z.infer<typeof legacySummarySchema>;
export type LegacyCommissions=z.infer<typeof legacyCommissionsSchema>;
export type LegacyResource<T>={status:'ready';data:T;asOf:string}|{status:'unavailable';code:string};
export interface LegacySnapshot {
  me:LegacyResource<LegacyMe>;
  summary:LegacyResource<LegacySummary>;
  commissions:LegacyResource<LegacyCommissions>;
}
