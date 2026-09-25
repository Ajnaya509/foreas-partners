import { z } from 'zod';
import { FounderAccessError, type FounderProof } from './access';
import { createMissionGateway, MissionGatewayError, renderGatewayErrorFrench, type MissionGatewayOptions } from './brain/gateway';
import { createAccessGateway, type AccessView } from './access-gateway';
import { canApproveAction } from './action';
import { isPayoutAction, payoutManifest } from './payout';
import { hash } from './brain/model';
export type FounderDependencies={
  authenticate:(sensitive:boolean)=>Promise<FounderProof>;
  gatewayOptions:Omit<MissionGatewayOptions,'authenticate'>;
  configured:boolean; sensitiveEnabled:boolean; codeReviewEnabled?:boolean; payoutEnabled?:boolean; origin:string;
};
const object=z.record(z.unknown());
const empty=z.object({}).strict();
const id=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const noStore={'cache-control':'private, no-store, max-age=0','pragma':'no-cache','vary':'Cookie','x-content-type-options':'nosniff'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:noStore});
async function bodyOf(req:Request){
  if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))throw new MissionGatewayError('request_invalid');
  const reader=req.body?.getReader();if(!reader)throw new MissionGatewayError('request_invalid');
  const chunks:Uint8Array[]=[];let size=0;let timer:ReturnType<typeof setTimeout>;
  try{return await Promise.race([(async()=>{for(;;){const c=await reader.read();if(c.done)break;size+=c.value.byteLength;if(size>24576)throw new MissionGatewayError('request_invalid');chunks.push(c.value);}try{return object.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{throw new MissionGatewayError('request_invalid');}})(),new Promise<never>((_,r)=>{timer=setTimeout(()=>r(new MissionGatewayError('request_invalid')),3000);})]);}
  finally{clearTimeout(timer!);void reader.cancel().catch(()=>{});}
}
export async function handleFounderRequest(req:Request,parts:string[],deps:FounderDependencies):Promise<Response>{
  let wrote=false;
  let authenticationFailure:FounderAccessError|undefined;
  try{
    const target=new URL(req.url);
    if(req.headers.has('x-mission-authority') || req.headers.get('x-foreas-founder')!=='1'
      || target.search || parts.some(p=>!id.test(p)) || parts.length>7 || !['GET','POST'].includes(req.method)
      || (req.headers.has('sec-fetch-site') && req.headers.get('sec-fetch-site')!=='same-origin')
      || (req.method==='POST' && req.headers.get('origin')!==deps.origin))return reply({code:'forbidden',message:'Cette demande doit venir de ton espace protégé.'},403);
    const path=parts.join('/'), sensitive=/\/approve$/.test(path);
    const first=await deps.authenticate(sensitive);
    const auth=async()=>{try{const p=await deps.authenticate(sensitive);if(p.sessionId!==first.sessionId||p.actor.subject!==first.actor.subject)throw new FounderAccessError('unauthenticated');return p;}catch(e){if(e instanceof FounderAccessError)authenticationFailure=e;throw e;}};
    if(path==='status'&&req.method==='GET')return reply({available:deps.configured,sensitiveAvailable:deps.sensitiveEnabled,codeReviewAvailable:deps.configured&&deps.codeReviewEnabled===true,payoutAvailable:deps.configured&&deps.sensitiveEnabled&&deps.payoutEnabled===true,expiresAt:first.expiresAt,
      message:deps.configured?'Accès fondateur vérifié.':'Le service des missions attend encore son raccordement.'});
    if(!deps.configured)throw new FounderAccessError('configuration');
    const opts={...deps.gatewayOptions,authenticate:async()=>(await auth()).actor};
    const gateway=createMissionGateway(opts), access=createAccessGateway(opts);
    const requireAction=(capability:unknown)=>{
      if(!deps.sensitiveEnabled||!(capability==='n8n.workflow.deactivate'||capability==='n8n.workflow.deactivation.prepare'
        ||deps.payoutEnabled===true&&(isPayoutAction(capability)||capability==='stripe.payout.prepare')))
        throw new FounderAccessError('configuration');
    };
    const currentFinancialScope=(manifest:unknown,view:AccessView,mission:import('./brain/gateway').GatewayMissionView)=>{
      const parsed=payoutManifest.safeParse(manifest),scope=view.scopes['stripe.payout.prepare'];
      if(!parsed.success||!scope)return false;
      const m=parsed.data;
      if(m.preparedSource){
        const result=mission.steps.find(s=>s.id===m.preparedSource!.stepId)?.result;
        if(!result||typeof result!=='object'||Array.isArray(result)||!Array.isArray(result.evidence)||result.evidence.length!==1
          ||hash(result.evidence[0])!==m.preparedSource.proofHash)return false;
      }
      return m.ownerId===opts.authority.ownerId&&m.financialReview.scopeHash===scope.scopeHash
        &&m.amountMinor<=Number(scope.resources.maxAmountMinor)
        &&Object.entries(scope.resources).every(([k,v])=>k==='maxAmountMinor'||m[k as keyof typeof m]===v);
    };
    const b=req.method==='POST'?await bodyOf(req):{};
    let result:unknown;
    if(req.method==='GET'){
      if(path==='missions')result=await gateway.list();
      else if(path==='access')result=await access.list();
      else if(parts.length===2&&parts[0]==='missions')result=await gateway.get(parts[1]);
      else if(parts.length===3&&parts[0]==='missions'&&parts[2]==='telegram-delivery')result=await gateway.telegramDelivery(parts[1]);
      else if(parts.length===3&&parts[0]==='missions'&&parts[2]==='actions')result=await gateway.listActions(parts[1]);
      else if(parts.length===7&&parts[0]==='missions'&&parts[2]==='plans'&&parts[4]==='steps'&&parts[6]==='code-review'){
        if(!deps.codeReviewEnabled)return reply({code:'code_review_closed',message:'La lecture des propositions n’est pas encore ouverte.'},503);
        if(!/^[1-9][0-9]{0,8}$/.test(parts[3])||!/^[a-z][a-z0-9_-]{0,63}$/.test(parts[5]))return reply({code:'request_invalid'},400);
        const version=Number(parts[3]);
        const matches=(m:import('./brain/gateway').GatewayMissionView)=>m.id===parts[1]&&m.planVersion===version&&m.steps.some(s=>s.id===parts[5]&&s.capability==='code.change.prepare');
        const before=(await gateway.get(parts[1])).mission;
        if(!matches(before))return reply({code:'code_review_changed',message:'La demande a changé. Recharge son suivi.'},409);
        result=await gateway.codeReview(parts[1],version,parts[5]);
        const after=(await gateway.get(parts[1])).mission;
        await auth();
        if(!matches(after)||after.mode!==before.mode)return reply({code:'code_review_changed',message:'La demande a changé. Recharge son suivi.'},409);
      }
      else return reply({code:'not_found'},404);
    }else{
      wrote=true;
      if(path==='missions')result=await gateway.create(z.object({requestId:z.string().min(1).max(160),objective:z.string().min(1).max(4000)}).strict().parse(b));
      else if(path==='access')result=await access.issue(b);
      else if(parts.length===3&&parts[0]==='access'&&parts[2]==='revoke'){empty.parse(b);result=await access.revoke(parts[1]);}
      else if(parts[0]==='missions'&&parts.length===3&&parts[2]==='commands')result=await gateway.command(parts[1],b as never);
      else if(parts[0]==='missions'&&parts.length===3&&parts[2]==='renew')result=await gateway.renew(parts[1],z.object({planVersion:z.number().int().positive()}).strict().parse(b).planVersion);
      else if(parts[0]==='missions'&&parts.length===3&&parts[2]==='action-missions'){
        const body=z.object({requestId:z.string(),sourceStepId:z.string()}).strict().parse(b);
        const mission=(await gateway.get(parts[1])).mission,step=mission.steps.find(s=>s.id===body.sourceStepId);
        requireAction(step?.capability);
        if(!step||!['stripe.payout.prepare','n8n.workflow.deactivation.prepare'].includes(String(step.capability))||step.status!=='succeeded'||mission.mode==='test')
          return reply({code:'card_changed',message:'Relis la préparation actuelle avant de continuer.'},409);
        if(step.capability==='stripe.payout.prepare'&&mission.steps.some(s=>isPayoutAction(s.capability)))
          return reply({code:'card_changed',message:'Le versement est déjà prévu dans cette mission. Lis la fiche de sa seconde étape.'},409);
        result=await gateway.createActionMission(parts[1],body);
      }
      else if(parts[0]==='missions'&&parts.length===4&&parts[2]==='actions'&&parts[3]==='preview'){
        const stepId=z.object({stepId:z.string()}).strict().parse(b).stepId;
        const mission=(await gateway.get(parts[1])).mission,step=mission.steps.find(s=>s.id===stepId);
        requireAction(step?.capability);
        if(!step||!(isPayoutAction(step.capability)||step.capability==='n8n.workflow.deactivate'))return reply({code:'card_changed'},409);
        const [preview,financialAccess]=await Promise.all([gateway.previewAction(parts[1],stepId),isPayoutAction(step.capability)?access.list():Promise.resolve(null)]);
        if(preview.action.manifest.capabilityId!==step.capability||!canApproveAction(preview.action,mission)
          ||financialAccess&&!currentFinancialScope(preview.action.manifest,financialAccess,mission))
          return reply({code:'card_changed',message:'La fiche ne correspond plus à la préparation autorisée. Relis son suivi.'},409);
        result=preview;
      } else if(parts[0]==='missions'&&parts.length===5&&parts[2]==='actions'&&['approve','revoke'].includes(parts[4])){
        const [view,list]=await Promise.all([gateway.get(parts[1]),gateway.listActions(parts[1])]);
        const mission=view.mission;
        const action=list.actions.find(a=>a.id===parts[3]);
        if(!action)return reply({code:'card_changed',message:'Cette autorisation a changé. Relis la fiche actuelle.'},409);
        if(parts[4]==='approve'){
          requireAction(action.manifest.capabilityId);
          const body=z.object({manifestHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(b);
          if(action.manifestHash!==body.manifestHash||!canApproveAction(action,mission))return reply({code:'card_changed',message:'Cette autorisation a changé ou expiré. Relis la fiche actuelle.'},409);
          if(isPayoutAction(action.manifest.capabilityId)&&!currentFinancialScope(action.manifest,await access.list(),mission))
            return reply({code:'card_changed',message:'Le compte, la banque ou la revue ont changé. Prépare une nouvelle fiche.'},409);
          result=await gateway.approveAction(action.id,body.manifestHash);
        }else{empty.parse(b);result=await gateway.revokeAction(action.id);}
      } else return reply({code:'not_found'},404);
    }
    await auth(); // Discard even a valid private response if the session changed while waiting.
    return reply(result);
  }catch(e){
    if(authenticationFailure)e=authenticationFailure;
    if(e instanceof FounderAccessError){const code=e.code;return reply({code,message:code==='mfa_required'?'Confirme à nouveau que c’est bien toi.':code==='configuration'?'Ce service attend encore son raccordement.':'Ton accès doit être vérifié.'},code==='mfa_required'?428:code==='forbidden'?403:code==='unauthenticated'?401:503);}
    if(e instanceof z.ZodError)return reply({code:'request_invalid',message:'La demande doit être précisée.'},400);
    if(e instanceof MissionGatewayError){
      if(parts[0]==='access'&&(e.status===401||e.status===403))return reply({code:'forbidden',message:'Reconnecte-toi à ton espace fondateur.'},403);
      if(parts.at(-1)==='code-review'){
        if(e.status===401||e.status===403)return reply({code:'forbidden',message:'Reconnecte-toi à ton espace fondateur.'},403);
        if(e.code==='authority_refused')return reply({code:'mfa_required',message:'Confirme à nouveau que c’est bien toi.'},428);
        return reply({code:'code_review_unverified',message:'Le dossier n’a pas pu être vérifié.'},e.code==='request_invalid'?400:503);
      }
      return reply({code:e.code,message:renderGatewayErrorFrench(e)},e.code==='request_invalid'?400:e.code==='authority_refused'?428:e.code==='outcome_unknown'?409:503);
    }
    return reply({code:wrote?'outcome_unknown':'unavailable',message:wrote?'La réponse manque. Vérifie le suivi avant de recommencer.':'Le suivi est momentanément indisponible.'},503);
  }
}
