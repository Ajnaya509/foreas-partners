import { z } from 'zod';

// Presentation only. Authority and the scope digest are checked by the official server modules.
const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/),robot=z.string().regex(/^[a-z][a-z0-9_.:-]{2,127}$/);
const uuid=z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/),digest=z.string().regex(/^[a-f0-9]{64}$/);
const count=z.number().int().nonnegative().safe(),quota=count.max(100);
const day=z.string().regex(/^(?:20|21)\d{2}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
const instant=z.string().datetime({offset:true}).regex(/^(?:20|21)\d{2}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/);
const zone=z.string().max(80).regex(/^[A-Za-z][A-Za-z0-9_+/-]*$/).refine(v=>{try{new Intl.DateTimeFormat('fr-FR',{timeZone:v});return true;}catch{return false;}});
const counts=z.object({prospectsSelected:z.null(),draftsPrepared:z.null(),providerAcceptedMessages:count,distinctExternalProspectsContacted:count,
 deliveryConfirmed:z.null(),authenticatedReplies:z.null(),usefulReplies:z.null(),conversionsAttributed:z.null()}).strict();
const output=z.object({robotRef:robot,providerAccountRef:id,purpose:z.enum(['FOREAS_HUNTER','PRIVATE_HUNTER']),driverId:uuid.nullable(),channel:z.literal('email'),
 scopeRevision:z.number().int().positive().safe(),scopeHash:digest,sourceRef:z.literal('app_social_dispatches'),scopeRef:robot,timezone:zone,calendarDate:day,
 observedAt:instant,periodStart:instant,periodEnd:instant,coverage:z.literal('partial'),globalGate:z.literal('LOCAL_REVIEW_ONLY'),configuredQuota:quota,
 effectiveQuota:z.literal(0),scopeQuotaMaximum:quota,messageQuotaMaximum:quota,consumedSlots:count,reservedSlots:count,uncertainSlots:count,counts,
 limitations:z.array(z.string().max(1000)).max(20),proofRefs:z.tuple([z.string().max(256)]),
 countUnit:z.literal('producer_declared_external_email_address'),verifiedCommercialContacts:z.null(),simulation:z.boolean()}).strict();
const evidence=z.object({kind:z.literal('social.metrics.observation'),source:z.enum(['app:app_social_metrics_bound','simulation:app:app_social_metrics_bound']),
 observedAt:instant,reference:z.string().max(256),accountId:id,data:output}).strict();
const result=z.object({summary:z.string().min(1).max(2000),output,evidence:z.tuple([evidence])}).strict();
const stable=(v:unknown):string=>JSON.stringify(v,(_k,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
function at(epoch:number,timezone:string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(epoch);return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');}
export function socialMetricsResult(step:Record<string,unknown>,mode:unknown,now=Date.now()){
 if(step.capability!=='social.metrics.read'||step.status!=='succeeded')return null;
 const parsed=result.safeParse(step.result);if(!parsed.success)return null;
 const {output:v,evidence:[e]}=parsed.data,start=Date.parse(v.periodStart),end=Date.parse(v.periodEnd),observed=Date.parse(v.observedAt);
 const age=(Date.parse(at(observed,v.timezone))-Date.parse(v.calendarDate))/86400000;
 const next=new Date(Date.parse(v.calendarDate)+86400000).toISOString().slice(0,10);
 if(!['test','prepare','live'].includes(String(mode))||v.simulation!==(mode==='test')
   ||v.purpose==='FOREAS_HUNTER'&&v.driverId!==null||v.purpose==='PRIVATE_HUNTER'&&(v.driverId===null||v.scopeQuotaMaximum>20)
   ||v.scopeRef!==v.robotRef||v.scopeQuotaMaximum>Math.min(v.configuredQuota,v.messageQuotaMaximum)
   ||!Number.isSafeInteger(v.consumedSlots+v.reservedSlots+v.uncertainSlots)
   ||v.counts.distinctExternalProspectsContacted>v.counts.providerAcceptedMessages||v.counts.providerAcceptedMessages>v.consumedSlots
   ||!Number.isFinite(now)||observed>now+5000||age<0||age>31||end<=start||end-start>172800000
   ||[v.periodStart,v.periodEnd].some(d=>/\.(\d*[1-9]\d*)/.test(d))
   ||at(start,v.timezone)!==v.calendarDate||at(start-1,v.timezone)===v.calendarDate||at(end,v.timezone)!==next||at(end-1,v.timezone)!==v.calendarDate
   ||v.proofRefs[0]!==`app_social_dispatches:${v.robotRef}:${v.calendarDate}`
   ||e.source!==(v.simulation?'simulation:':'')+'app:app_social_metrics_bound'||e.accountId!==v.providerAccountRef
   ||e.reference!==v.proofRefs[0]||e.observedAt!==v.observedAt||stable(e.data)!==stable(v))return null;
 return v;
}
export const socialAccessResources=z.object({ownerId:id,robotRef:robot,purpose:z.enum(['FOREAS_HUNTER','PRIVATE_HUNTER']),driverId:uuid.nullable(),
 providerAccountRef:id,channel:z.literal('email'),timezone:zone,revision:z.number().int().positive().safe(),environment:z.enum(['live','test'])}).strict();
