import { z } from 'zod';

export const isMissionControlCapability=(v:unknown)=>v==='mission.control'||v==='mission.status.read';
const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
const instant=z.string().datetime({offset:true}).regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/);
const control=z.enum(['run','pause','cancel']);
const version=z.number().int().positive().safe();
const current=z.object({
 missionId:id,status:z.enum(['queued','running','waiting','succeeded','failed','cancelled']),control,
 planVersion:version,updatedAt:instant,uncertain:z.boolean(),executing:z.boolean(),
 needs:z.array(z.enum(['access','approval','information','capability','verification'])).max(5).refine(v=>new Set(v).size===v.length)
}).strict();
const receipt=z.object({
 targetMissionId:id,command:z.enum(['pause','continue','cancel']),beforeControl:control,afterControl:control,
 targetPlanVersion:version,appliedAt:instant,permissionsChanged:z.literal(false)
}).strict();
const observation=z.object({kind:z.literal('observation'),source:z.string(),observedAt:instant,reference:z.string(),data:z.unknown()}).strict();
const result=z.object({summary:z.string().min(1),output:z.unknown(),evidence:z.tuple([observation])}).strict();
const controlOutput=z.object({receiptId:z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/),receipt,current,observationAt:instant}).strict();
const statusOutput=current.extend({observationAt:instant}).strict();
// These small, schema-checked objects are compared without importing server cryptography into the browser.
const stable=(v:unknown):string=>JSON.stringify(v,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
export type MissionObservation=z.infer<typeof current>;
export function missionControlResult(step:Record<string,unknown>,sourceMissionId?:string){
 if(!isMissionControlCapability(step.capability)||step.status!=='succeeded')return null;
 const r=result.safeParse(step.result);if(!r.success)return null;
 const e=r.data.evidence[0];
 if(step.capability==='mission.control'){
  const p=controlOutput.safeParse(r.data.output);if(!p.success)return null;
  const v=p.data;
  if(v.receipt.targetMissionId!==v.current.missionId||v.current.missionId===sourceMissionId
    ||v.receipt.afterControl!==(v.receipt.command==='continue'?'run':v.receipt.command)
    ||e.source!=='Pieuvre : registre des commandes'||e.reference!=='control:'+v.receiptId
    ||e.observedAt!==v.observationAt||stable(e.data)!==stable({receipt:v.receipt,current:v.current}))return null;
  return {kind:'control' as const,...v};
 }
 const p=statusOutput.safeParse(r.data.output);if(!p.success)return null;
 const {observationAt,...v}=p.data;
 if(v.missionId===sourceMissionId||e.source!=='Pieuvre : mission conservée'||e.reference!=='mission:'+v.missionId
   ||e.observedAt!==observationAt||stable(e.data)!==stable(v))return null;
 return {kind:'status' as const,current:v,observationAt};
}
export function observedMissionLabel(v:MissionObservation){
 if(v.uncertain)return 'Résultat à vérifier';
 if(v.status==='succeeded')return 'Étapes terminées';
 if(v.control==='cancel')return 'Annulation demandée';
 if(v.control==='pause')return 'En pause';
 return {queued:'En attente de démarrage',running:'En cours',waiting:'En attente',failed:'Échec',cancelled:'Annulée'}[v.status];
}
