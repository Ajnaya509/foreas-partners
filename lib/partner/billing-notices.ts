import {z} from 'zod';
const date=z.string().datetime({offset:true});
const state=z.enum(['ready','needs_review','obsolete']);
const category=z.enum(['checkout_active','invoice_paid','failure_first','failure_second','failure_final','suspended','reactivated','plan_changed','canceled']);
const receipt=z.enum(['sending','retry','accepted','needs_review']);
export const noticeLabels:Record<z.infer<typeof category>,string>={checkout_active:'Bienvenue',invoice_paid:'Paiement reçu',failure_first:'Premier échec de paiement',failure_second:'Deuxième échec de paiement',failure_final:'Dernier échec de paiement',suspended:'Abonnement suspendu',reactivated:'Abonnement réactivé',plan_changed:'Formule modifiée',canceled:'Abonnement arrêté'};
export const noticeListSchema=z.object({items:z.array(z.object({id:z.string().uuid(),revision:z.number().int().positive(),category,state,
 review_reason:z.string().nullable(),created_at:date,receipt_state:receipt.nullable()})).max(50),next_cursor:z.string().max(500).nullable()});
export const noticeDetailSchema=z.object({id:z.string().uuid(),revision:z.number().int().positive(),category,state,review_reason:z.string().nullable(),
 recipient:z.string().email(),subject:z.string(),origin_event:z.string(),receipt_state:z.union([receipt,z.literal('no_attempt')]),first_attempt_at:date.nullable(),provider_id:z.string().nullable(),
 relevance:z.object({state:z.enum(['relevant','obsolete','needs_review']),reason:z.string(),checked_at:date}),can_retry:z.boolean(),can_obsolete:z.boolean(),can_reconcile:z.boolean(),
 history:z.array(z.object({id:z.string().uuid(),action:z.enum(['send','reconcile','obsolete']),state:z.enum(['working','retry','accepted','needs_review','obsolete','late_evidence']),reason:z.string().nullable(),created_at:date,finished_at:date.nullable(),
 observations:z.array(z.object({provider_id:z.string().uuid(),provider_event:z.string().nullable(),observed_at:date,proof_kind:z.enum(['send_reply','retrieved'])}))})).max(20)}).superRefine((v,ctx)=>{
 const retry=v.state==='ready'&&v.relevance.state==='relevant'&&!['accepted','needs_review'].includes(v.receipt_state);
 const obsolete=v.state!=='obsolete'&&v.relevance.state==='obsolete'&&v.receipt_state!=='accepted';
 const reconcile=v.state!=='obsolete'&&!['no_attempt','accepted'].includes(v.receipt_state);
 if(v.can_retry&&!retry||v.can_obsolete&&!obsolete||v.can_reconcile&&!reconcile)
  ctx.addIssue({code:z.ZodIssueCode.custom,message:'Contradictory notice capabilities'});
});
export const noticeActionSchema=z.object({id:z.string().uuid(),revision:z.number().int().positive().safe(),operation_id:z.string().uuid(),action:z.enum(['send','reconcile','obsolete']),provider_id:z.string().uuid().optional()}).strict().refine(v=>v.action==='reconcile'?!!v.provider_id:v.provider_id===undefined);
export const noticeResultSchema=z.object({status:z.enum(['accepted','retry','needs_review','obsolete','late_evidence','in_progress'])});
export const noticeRecoveredSchema=z.object({items:z.array(z.object({id:z.string().uuid(),state,revision:z.number().int().positive(),review_reason:z.string().nullable()})).max(8)});
export type NoticeList=z.infer<typeof noticeListSchema>;
export type NoticeDetail=z.infer<typeof noticeDetailSchema>;
export type NoticeAction=z.infer<typeof noticeActionSchema>;
export function noticeStatus(row:{state:string;receipt_state:string|null}){
 if(row.state==='needs_review')return 'À vérifier';
 if(row.state==='obsolete')return 'Devenu inutile';
 return ({accepted:'Accepté par le service d’envoi',sending:'Confirmation attendue',retry:'Tentative à vérifier',needs_review:'À vérifier',no_attempt:'Préparé'})[row.receipt_state??'no_attempt']??'À vérifier';
}
