import {z} from 'zod';
export const payoutReviewActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepare'),sponsor_type:z.enum(['partner','driver']),sponsor_id:z.string().uuid()}).strict(),
 z.object({action:z.literal('approve'),request_id:z.string().uuid(),batch_id:z.string().uuid(),
 invoice_reference:z.string().trim().min(1).max(200),invoice_sha256:z.string().regex(/^[a-f0-9]{64}$/),
 invoice_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),dossier_reference:z.string().trim().min(1).max(500),
 amount_cents:z.number().int().positive().safe(),currency:z.literal('EUR'),documents_checked:z.literal(true)}).strict(),
 z.object({action:z.literal('revoke'),review_id:z.string().uuid(),reason:z.string().trim().min(1).max(1000)}).strict()
]);
const sponsor=z.enum(['partner','driver']);
const amount=z.number().int().positive().safe();
const stamp=z.string().refine(x=>Number.isFinite(Date.parse(x)));
export const payoutDocumentReviewSchema=z.object({id:z.string().uuid(),batch_id:z.string().uuid(),sponsor_type:sponsor,sponsor_id:z.string().uuid(),
 invoice_reference:z.string(),invoice_sha256:z.string().regex(/^[a-f0-9]{64}$/),invoice_date:z.string(),dossier_reference:z.string(),
 amount_cents:amount,currency:z.literal('EUR'),reviewed_at:stamp,reviewed_by:z.string().uuid(),revoked_at:stamp.nullable()});
export const payoutReviewBatchSchema=z.object({id:z.string().uuid(),sponsor_type:sponsor,sponsor_id:z.string().uuid(),amount_cents:amount,currency:z.literal('EUR'),state:z.literal('prepared'),created_at:stamp,review:payoutDocumentReviewSchema.nullable()}).refine(b=>!b.review||(b.review.batch_id===b.id&&b.review.sponsor_id===b.sponsor_id&&b.review.sponsor_type===b.sponsor_type&&b.review.amount_cents===b.amount_cents&&b.review.revoked_at===null));
export const payoutReviewListSchema=z.object({items:z.array(payoutReviewBatchSchema).max(50),next:z.object({created_at:stamp,id:z.string().uuid()}).nullable(),
 candidates:z.array(z.object({sponsor_type:sponsor,sponsor_id:z.string().uuid(),amount_cents:amount,rights_count:z.number().int().positive(),destination:z.string().nullable()})).max(100),candidates_next:z.string().regex(/^(driver|partner):[a-f0-9-]{36}$/i).nullable(),observed_at:stamp});
export const payoutReviewResultSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepare'),batch:z.object({id:z.string().uuid(),sponsor_type:sponsor,sponsor_id:z.string().uuid(),amount_cents:amount,state:z.literal('prepared')}).nullable()}),
 z.object({action:z.literal('approve'),review:payoutDocumentReviewSchema,replayed:z.boolean()}),
 z.object({action:z.literal('revoke'),review:payoutDocumentReviewSchema,replayed:z.boolean()})]);
export type PayoutReviewList=z.infer<typeof payoutReviewListSchema>;
export type PayoutReviewAction=z.infer<typeof payoutReviewActionSchema>;
export type PayoutReviewResult=z.infer<typeof payoutReviewResultSchema>;
/** A valid response must also acknowledge the exact operation that was submitted. */
export function payoutReviewResultMatches(body:PayoutReviewAction,result:PayoutReviewResult,viewerId:string,
 batch?:Pick<PayoutReviewList['items'][number],'id'|'sponsor_id'|'sponsor_type'>):boolean {
 if(body.action!==result.action)return false;
 if(body.action==='approve'&&result.action==='approve'){
  const r=result.review;
  return r.id===body.request_id&&r.batch_id===body.batch_id&&r.amount_cents===body.amount_cents
   &&r.invoice_reference===body.invoice_reference&&r.invoice_sha256===body.invoice_sha256
   &&r.invoice_date===body.invoice_date&&r.dossier_reference===body.dossier_reference
   &&r.currency===body.currency&&r.reviewed_by===viewerId&&r.revoked_at===null
   &&(!batch||(r.batch_id===batch.id&&r.sponsor_id===batch.sponsor_id&&r.sponsor_type===batch.sponsor_type));
 }
 if(body.action==='revoke'&&result.action==='revoke')return result.review.id===body.review_id&&result.review.revoked_at!==null;
 if(body.action==='prepare'&&result.action==='prepare')return !result.batch||(result.batch.sponsor_id===body.sponsor_id&&result.batch.sponsor_type===body.sponsor_type);
 return false;
}
