import { z } from 'zod';
const instant=z.string().datetime({offset:true});
const integer=z.number().int().min(0).max(1e12).safe();
const report=z.object({
 reportedAt:instant,phase:z.enum(['checking','ready','working','waiting_access','waiting_budget','needs_attention','stopped']),
 issue:z.enum(['access','budget','checks','source','provider','prices','bridge','configuration']).nullable(),active:z.boolean(),
 model:z.string().regex(/^claude-[a-z0-9-]{1,100}$/),maximumCallMicroUsd:integer.min(1),
 budget:z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),calls:integer.max(1000),chargedOrReservedMicroUsd:integer,dailyCalls:integer.min(1).max(1000),dailyMicroUsd:integer.min(1)}).strict().nullable()
}).strict();
const observation=z.object({
 projectId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),state:z.enum(['unknown','stale','recent']),receivedAt:instant.nullable(),validUntil:instant.nullable(),report:report.nullable(),
 nextAction:z.string().max(2000).nullable(),budgetCurrency:z.literal('USD'),budgetScope:z.literal('service-local-UTC-excluding-tax'),
 providerInvoiceVerified:z.literal(false),source:z.literal('worker-report'),independentlyVerified:z.literal(false),applied:z.literal(false)
}).strict();
export function workerStatus(raw:unknown,now=Date.now()){
 const parsed=observation.safeParse(raw);if(!parsed.success)return null;
 const value=parsed.data,r=value.report;
 if(!r)return value.state==='unknown'&&value.receivedAt===null&&value.validUntil===null?{...value,effectiveState:'unknown' as const}:null;
 if(value.state==='unknown'||!value.receivedAt||!value.validUntil)return null;
 const observed=Date.parse(r.reportedAt),received=Date.parse(value.receivedAt);
 if(Date.parse(value.validUntil)!==Math.min(observed,received)+60000||observed>received+5000||received-observed>30000)return null;
 if(r.budget&&r.budget.date!==r.reportedAt.slice(0,10))return null;
 if((r.phase==='waiting_access'&&r.issue!=='access')||(r.phase==='waiting_budget'&&r.issue!=='budget')||
    (r.phase==='needs_attention'&&r.issue===null)||(['checking','ready','working','stopped'].includes(r.phase)&&r.issue!==null)||
    (r.phase==='stopped'&&r.active)||(!r.budget&&!['needs_attention','stopped'].includes(r.phase)))return null;
 if(r.phase==='ready'&&r.budget&&(r.budget.calls>=r.budget.dailyCalls||r.maximumCallMicroUsd>r.budget.dailyMicroUsd-r.budget.chargedOrReservedMicroUsd))return null;
 const recent=value.state==='recent'&&now>=received&&now>=observed-5000&&now<Date.parse(value.validUntil);
 return {...value,effectiveState:recent?'recent' as const:'stale' as const};
}
export const usd=(micro:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:6}).format(micro/1e6);
