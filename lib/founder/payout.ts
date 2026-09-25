import { z } from 'zod';

// Read-only projections of the financial contract at f2cda91. Provider calls
// and the authoritative approval checks remain in the brain service.
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const date=z.string().datetime({offset:true});
const iso=date.refine(v=>new Date(v).toISOString()===v);
const minor=z.number().int().min(1).max(100_000_000);
const identity={accountId:z.string().regex(/^acct_[A-Za-z0-9]{1,96}$/),currency:z.literal('eur'),
 destinationId:z.string().regex(/^ba_[A-Za-z0-9]{1,96}$/),destinationLast4:z.string().regex(/^\d{4}$/),
 destinationCountry:z.string().regex(/^[A-Z]{2}$/),destinationFingerprintHash:digest,
 sourceType:z.enum(['card','bank_account']),apiVersion:z.literal('2026-08-26.dahlia'),livemode:z.boolean()};
export const payoutAccessResources=z.object({...identity,maxAmountMinor:minor,scope:z.literal('platform'),method:z.literal('standard')}).strict();
export const payoutInput=z.object({...identity,amountMinor:minor,preparedAt:iso,expiresAt:iso}).strict()
 .refine(v=>Date.parse(v.expiresAt)-Date.parse(v.preparedAt)===300_000);
export const payoutPreparation=z.object({preparation:payoutInput,availableMinor:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
 sourceAvailableMinor:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),method:z.literal('standard'),scope:z.literal('platform'),
 orderCreated:z.literal(false),fundsArrivalConfirmed:z.literal(false),feesVerified:z.literal(false),simulation:z.boolean()}).strict()
 .refine(v=>v.simulation===!v.preparation.livemode&&v.availableMinor>=v.preparation.amountMinor&&v.sourceAvailableMinor>=v.preparation.amountMinor);
const financialReview=z.object({scopeHash:digest,evidenceHash:digest,reviewedAt:date,expiresAt:date,
 bankReadVerified:z.literal(true),standardPayoutFeeMinor:z.literal(0),currency:z.literal('eur')}).strict()
 .refine(v=>Date.parse(v.expiresAt)>Date.parse(v.reviewedAt)&&Date.parse(v.expiresAt)-Date.parse(v.reviewedAt)<=86_400_000);
export const payoutManifest=z.object({...identity,livemode:z.literal(true),schemaVersion:z.literal(1),operation:z.literal('payout'),
 capabilityId:z.enum(['stripe.payout.create','stripe.payout.execute_prepared']),capabilityVersion:z.union([z.literal(1),z.literal(2)]),ownerId:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_:.-]{0,127}$/),
 missionId:z.string().min(1).max(128),planVersion:z.number().int().positive(),stepId:z.string().min(1).max(64),effectiveMode:z.literal('live'),
 inputHash:digest,apiOrigin:z.literal('https://api.stripe.com'),amountMinor:minor,method:z.literal('standard'),scope:z.literal('platform'),
 preparedAt:iso,executeBefore:iso,financialReview,feeAssessment:z.literal('reviewed_standard_no_additional_fee'),
 feeCapEnforcedByProvider:z.literal(false),feesObservedAfterPayout:z.literal(false),expectedTotalDebitMinor:minor,
 fundsArrivalConfirmed:z.literal(false),impact:z.string().min(1).max(2000),limitation:z.string().min(1).max(2000),
 preparedSource:z.object({stepId:z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),capabilityVersion:z.literal(1),inputHash:digest,proofHash:digest}).strict().optional()}).strict()
 .refine(v=>v.expectedTotalDebitMinor===v.amountMinor&&Date.parse(v.executeBefore)-Date.parse(v.preparedAt)===300_000
  &&(v.capabilityId==='stripe.payout.create'?v.capabilityVersion===2&&v.preparedSource===undefined:v.capabilityVersion===1&&v.preparedSource!==undefined));
export type PayoutManifest=z.infer<typeof payoutManifest>;
export const isPayoutAction=(capability:unknown)=>capability==='stripe.payout.create'||capability==='stripe.payout.execute_prepared';
export const payoutReceipt=z.object({accountId:identity.accountId,payoutId:z.string().regex(/^po_[A-Za-z0-9]{1,96}$/),amountMinor:minor,
 currency:z.literal('eur'),destinationId:identity.destinationId,destinationLast4:identity.destinationLast4,
 providerStatus:z.enum(['pending','in_transit','paid']),dispatchId:z.string().uuid(),observedAt:iso,
 orderCreated:z.literal(true),fundsArrivalConfirmed:z.literal(false),feesVerified:z.literal(false),simulation:z.boolean()}).strict();
export const euros=(amount:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount/100);
export const payoutSource=(source:string)=>source==='card'?'Paiements par carte':'Paiements bancaires';
