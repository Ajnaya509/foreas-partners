'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Plus, Search, Grid2X2, KeyRound, LockKeyhole, Menu, Mic, Eye, RefreshCw, X, CircleHelp } from 'lucide-react';
import type { GatewayActionView, GatewayMissionView } from '@/lib/founder/brain/gateway';
import type { AccessView } from '@/lib/founder/access-gateway';
import { createClient } from '@/lib/supabase/client';
import { AdminMfaForm } from '@/app/auth/admin-mfa/AdminMfaForm';
import { checkFounderAccess, checkFounderApprovalAccess } from '@/lib/founder/check-access';
import { isPayoutAction } from '@/lib/founder/payout';
import { actionDeadline, canApproveAction } from '@/lib/founder/action';
import { administration, capabilityLabel, dateLabel, missionLabel, record } from './presentation';
import styles from './founder.module.css';
import { telegramDeliveryLabel } from './telegramDelivery';
import { CodeReviewPanel } from './CodeReviewPanel';
import { WorkerStatusCard } from './WorkerStatusCard';
import { MissionControlCard } from './MissionControlCard';
import { SocialMetricsCard,SocialAccessScope } from './SocialMetricsCard';
import { socialMetricsResult } from './socialMetricsResult';
import { isMissionControlCapability,missionControlResult } from './missionControlResult';
import { PayoutPreparationCard } from './PayoutPreparationCard';
import { PayoutAccessScope, PayoutActionCard, PayoutResultCard } from './PayoutCards';
import type { CodeReview } from '@/lib/founder/brain/codeReview';
import type { TelegramDeliveryStatus } from '@/lib/founder/brain/telegramReplies';

type Pending={requestId:string;objective:string};
type Status={available:boolean;sensitiveAvailable:boolean;codeReviewAvailable?:boolean;payoutAvailable?:boolean;expiresAt:number;message:string};
class RequestError extends Error { constructor(readonly code:string,message:string){super(message);} }
function Panel({title,children,close,wide=false}:{title:string;children:React.ReactNode;close:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className={styles.panel+(wide?' '+styles.reviewPanel:'')} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===ref.current)close();}}><div className={styles.panelHead}><h2>{title}</h2><button type="button" onClick={close} aria-label="Fermer"><X/></button></div><div className={styles.panelBody}>{children}</div></dialog>;
}
export function FounderChat({userId}:{userId:string}){
 const [status,setStatus]=useState<Status|null>(null),[notice,setNotice]=useState('Vérification de ton accès…');
 const [missions,setMissions]=useState<GatewayMissionView[]>([]),[active,setActive]=useState<string|null>(null),[draft,setDraft]=useState(''),[pending,setPending]=useState<Pending|null>(null);
 const [actions,setActions]=useState<GatewayActionView[]>([]),[access,setAccess]=useState<AccessView|null>(null),[search,setSearch]=useState(''),[panel,setPanel]=useState<'tools'|'access'|'topics'|'help'|'review'|null>(null);
 const [mfa,setMfa]=useState<false|'mission'|'approval'>(false),[busy,setBusy]=useState(false),[closed,setClosed]=useState(false),[now,setNow]=useState(Date.now());
 const [coverage,setCoverage]=useState(false),[duration,setDuration]=useState(30);
 const epoch=useRef(0),requests=useRef(new Set<AbortController>()),inflight=useRef(false),dead=useRef(false),session=useRef<string|null>(null),storageKey=useRef<string|null>(null),pendingRef=useRef<Pending|null>(null);
 const [delivery,setDelivery]=useState<TelegramDeliveryStatus|null|undefined>(undefined);
 const [review,setReview]=useState<CodeReview|null>(null),[reviewNotice,setReviewNotice]=useState('');
 const reviewEpoch=useRef(0);
 const closeReview=useCallback(()=>{reviewEpoch.current++;setReview(null);setReviewNotice('');setPanel(p=>p==='review'?null:p);},[]);
 const childRequests=useRef(new Map<string,string>());
 const chosenAction=useRef<{missionId:string;id:string;hash:string}|null>(null);
 const mission=missions.find(m=>m.id===active)||null;
 const shownGrants=new Set(access?Object.entries(access.scopes).map(([id,s])=>access.grants.find(g=>g.capabilityId===id&&g.scopeHash===s.scopeHash&&!g.revokedAt&&Date.parse(g.expiresAt)>now)?.id).filter(Boolean):[]);
 const clear=useCallback((message='L’espace est verrouillé. Reconnecte-toi pour continuer.')=>{
  dead.current=true;epoch.current++;reviewEpoch.current++;setReview(null);setReviewNotice('');requests.current.forEach(c=>c.abort());requests.current.clear();
  if(storageKey.current)try{sessionStorage.removeItem(storageKey.current);}catch{}
  for(const key of childRequests.current.keys())try{sessionStorage.removeItem(key);}catch{}
  pendingRef.current=null;childRequests.current.clear();setDelivery(undefined);chosenAction.current=null;setPending(null);setMissions([]);setActions([]);setAccess(null);setDraft('');setActive(null);setStatus(null);setMfa(false);setPanel(null);setClosed(true);setNotice(message);
 },[]);
 const api=useCallback(async <T,>(path:string,body?:unknown):Promise<T>=>{
  if(dead.current)throw new RequestError('closed','L’espace est verrouillé.');
  const generation=epoch.current,abort=new AbortController();requests.current.add(abort);const timeout=setTimeout(()=>abort.abort(),25000);
  try{
   const response=await fetch('/api/founder/'+path,{method:body===undefined?'GET':'POST',headers:{'x-foreas-founder':'1',...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'same-origin',signal:abort.signal});
   const data=await response.json();if(generation!==epoch.current||dead.current)throw new RequestError('closed','La session a changé.');
   if(!response.ok){
    if(response.status===401||response.status===403){clear();throw new RequestError('closed','Ton accès a été retiré.');}
    if(response.status===428){closeReview();setMfa(path.endsWith('/approve')?'approval':'mission');setStatus(null);}
    throw new RequestError(data.code||'unavailable',data.message||'Le suivi est indisponible.');
   }
   return data as T;
  }catch(e){if(generation!==epoch.current||dead.current)throw new RequestError('closed','La session a changé.');if(e instanceof RequestError)throw e;throw new RequestError(body===undefined?'unavailable':'outcome_unknown',body===undefined?'La connexion manque. Réessaie dans un instant.':'La réponse manque. La demande a pu être enregistrée. Vérifie son suivi.');}
  finally{clearTimeout(timeout);requests.current.delete(abort);}
 },[clear,closeReview]);
 const fail=useCallback((e:unknown)=>{if(!dead.current)setNotice(e instanceof Error?e.message:'Le suivi est indisponible.');},[]);
 const load=useCallback(async()=>{
  const value=await api<Status>('status');setStatus(value);setNotice(value.message);
  if(value.available){const list=await api<{missions:GatewayMissionView[];coverage:{exhaustive:boolean}}>('missions');setMissions(list.missions);setCoverage(list.coverage.exhaustive);}
 },[api]);
 const refresh=useCallback(async(id:string)=>{
  closeReview();setDelivery(undefined);
  const [view,cards,telegram]=await Promise.all([api<{mission:GatewayMissionView}>('missions/'+id),api<{actions:GatewayActionView[]}>('missions/'+id+'/actions'),api<{delivery:TelegramDeliveryStatus|null}>('missions/'+id+'/telegram-delivery').catch(()=>undefined)]);
  if(dead.current)return view.mission;
  setDelivery(telegram?.delivery);
  setMissions(previous=>[view.mission,...previous.filter(m=>m.id!==id)]);setActions(cards.actions);return view.mission;
 },[api,closeReview]);
 useEffect(()=>{
  dead.current=false;setClosed(false);
  const client=createClient();
  const {data:watch}=client.auth.onAuthStateChange((event,value)=>{
   if(event==='SIGNED_OUT'||(value?.user.id&&value.user.id!==userId)){clear();return;}
   if(value?.access_token){try{
    // Used only to discard private UI on a changed session, never to authorize it.
    const part=value.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const sid=JSON.parse(atob(part)).session_id;
    if(typeof sid!=='string'){clear();return;}
    if(session.current&&session.current!==sid){clear();return;}
    const initial=!session.current;session.current=sid;storageKey.current=`foreas-founder-request:${userId}:${sid}`;
    if(initial)try{const raw=sessionStorage.getItem(storageKey.current);if(raw){const p=JSON.parse(raw);if(typeof p.requestId==='string'&&p.requestId.length<=160&&typeof p.objective==='string'&&p.objective.length<=4000){pendingRef.current=p;setPending(p);setDraft(p.objective);}}}catch{}
   }catch{clear();}}
  });
  void load().catch(fail);
  const timer=setInterval(()=>setNow(Date.now()),1000);
  return()=>{dead.current=true;epoch.current++;reviewEpoch.current++;requests.current.forEach(c=>c.abort());requests.current.clear();watch.subscription.unsubscribe();clearInterval(timer);};
 },[userId,clear,load,fail]);
 useEffect(()=>{if(status&&now>=status.expiresAt){closeReview();setStatus(null);setMfa('mission');setNotice('Confirme à nouveau que c’est bien toi. Ta demande est conservée.');}},[now,status,closeReview]);
 const run=useCallback(async(operation:()=>Promise<void>)=>{
  if(inflight.current||dead.current)return;inflight.current=true;setBusy(true);
  try{await operation();}catch(e){fail(e);}finally{inflight.current=false;if(!dead.current)setBusy(false);}
 },[fail]);
 async function select(id:string){closeReview();setActive(id);setActions([]);setPanel(null);await refresh(id);}
 async function openTarget(id:string){
  const value=await api<{mission:GatewayMissionView}>('missions/'+id);
  if(value.mission.id!==id)throw new RequestError('response_invalid','La mission demandée n’a pas pu être vérifiée.');
  if(dead.current)return;
  closeReview();setActions([]);setDelivery(undefined);setPanel(null);
  setMissions(previous=>[value.mission,...previous.filter(m=>m.id!==id)]);setActive(id);setNotice('État de cette mission relu.');
 }
 async function openReview(stepId:string){
  if(!mission)return;
  const generation=++reviewEpoch.current;
  setReview(null);setPanel('review');
  if(!status?.codeReviewAvailable){setReviewNotice('La lecture des propositions n’est pas encore ouverte.');return;}
  setReviewNotice('Lecture du dossier protégé…');
  try{
   const value=await api<{review:CodeReview|null}>(`missions/${mission.id}/plans/${mission.planVersion}/steps/${stepId}/code-review`);
   if(dead.current||generation!==reviewEpoch.current)return;
   setReview(value.review);setReviewNotice(value.review?'':'La proposition n’est pas encore disponible. Relis le suivi de la mission.');
  }catch(e){if(!dead.current&&generation===reviewEpoch.current)setReviewNotice(e instanceof Error?e.message:'Le dossier n’a pas pu être vérifié.');}
 }
 async function send(){
  if(!status?.available||!session.current)return;
  let p=pendingRef.current;
  if(!p){if(!draft.trim())return;p={requestId:crypto.randomUUID(),objective:draft};pendingRef.current=p;setPending(p);
   if(storageKey.current)try{sessionStorage.setItem(storageKey.current,JSON.stringify(p));}catch{setNotice('Garde cette page ouverte jusqu’à la confirmation.');}}
  const result=await api<{mission:GatewayMissionView}>('missions',p);
  pendingRef.current=null;setPending(null);if(storageKey.current)try{sessionStorage.removeItem(storageKey.current);}catch{}
  setDraft('');setActive(result.mission.id);setMissions(previous=>[result.mission,...previous.filter(m=>m.id!==result.mission.id)]);setNotice('Mission enregistrée. Son résultat apparaîtra dans le suivi.');await refresh(result.mission.id);
 }
 const afterMfa=useCallback(()=>{
  setMfa(false);
  void run(async()=>{await load();const c=chosenAction.current;if(c){await refresh(c.missionId);chosenAction.current=null;setNotice('Identité confirmée. Relis la fiche actuelle, puis confirme ton choix.');}});
 },[load,refresh,run]);
 async function command(type:'pause'|'continue'|'cancel'){
  if(!mission)return;await api(`missions/${mission.id}/commands`,{type});await refresh(mission.id);setNotice(type==='cancel'?'Annulation demandée. Une action déjà partie doit encore être vérifiée.':'Demande enregistrée. État relu.');
 }
 async function approve(a:GatewayActionView){
  chosenAction.current={missionId:a.missionId,id:a.id,hash:a.manifestHash};
  try{await api(`missions/${a.missionId}/actions/${a.id}/approve`,{manifestHash:a.manifestHash});setNotice('Accord enregistré. L’exécution reste à confirmer.');chosenAction.current=null;}
  catch(e){if(e instanceof RequestError&&e.code==='mfa_required')throw e;await refresh(a.missionId);throw e;}
  await refresh(a.missionId);
 }
 async function deriveAction(stepId:string){
  if(!mission||!storageKey.current)return;
  const financial=mission.steps.find(s=>s.id===stepId)?.capability==='stripe.payout.prepare';
  const key=`${storageKey.current}:action:${mission.id}:${stepId}${financial?':plan:'+mission.planVersion:''}`;
  let existing=childRequests.current.get(key);
  if(!existing){try{existing=sessionStorage.getItem(key)||undefined;}catch{}existing??=crypto.randomUUID();childRequests.current.set(key,existing);try{sessionStorage.setItem(key,existing);}catch{}}
  const result=await api<{mission:GatewayMissionView}>(`missions/${mission.id}/action-missions`,{requestId:existing,sourceStepId:stepId});
  await select(result.mission.id);
 }
 async function revoke(a:GatewayActionView){
  const result=await api<{revoked:boolean}>(`missions/${a.missionId}/actions/${a.id}/revoke`,{});
  setNotice(result.revoked?'Accord retiré.':'Le retrait n’est pas confirmé. État relu.');await refresh(a.missionId);
 }
 async function withdrawAccess(grantId:string){
  let result:{revoked:boolean};
  try{result=await api<{revoked:boolean}>(`access/${grantId}/revoke`,{});}
  finally{setAccess(null);setAccess(await api<AccessView>('access'));}
  setNotice(result.revoked?'Accès retiré.':'Le retrait n’est pas confirmé. État relu.');
 }
 async function openAccess(){setPanel('access');setAccess(null);if(status?.available)setAccess(await api<AccessView>('access'));}
 const topics=<><button className={styles.new} disabled={!!pending||busy||closed} onClick={()=>{closeReview();setActive(null);setActions([]);setPanel(null);}}> <Plus size={18}/>Nouvelle conversation</button><label className={styles.search}><Search size={17}/><input aria-label="Rechercher un sujet" placeholder="Rechercher un sujet" value={search} onChange={e=>setSearch(e.target.value)}/></label><p className={styles.small}>Tes sujets</p><nav className={styles.topics} aria-label="Tes conversations">{missions.filter(m=>m.objective.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).map(m=><button key={m.id} disabled={busy} aria-current={m.id===active?'page':undefined} onClick={()=>void run(()=>select(m.id))}>{m.objective}</button>)}{!missions.length&&<p className={styles.small}>Les missions enregistrées apparaîtront ici.</p>}{!!missions.length&&!coverage&&<p className={styles.small}>Les 50 missions les plus récentes au maximum.</p>}</nav></>;
 return <div className={styles.root}>
  <a className={styles.skip} href="#founder-objective">Aller à la conversation</a>
  <aside className={styles.sidebar}><a href="/admin/overview" className={styles.brand}><span>F/</span> FOREAS</a>{topics}<div className={styles.sideBottom}><button onClick={()=>setPanel('tools')}><Grid2X2 size={18}/>Toute l’administration</button><button onClick={()=>void run(openAccess)}><KeyRound size={18}/>Accès et autorisations</button><div className={styles.identity}><span>Chandler<br/><small>Espace fondateur</small></span><button aria-label="Verrouiller l’espace" onClick={()=>clear()}><LockKeyhole size={18}/></button></div></div></aside>
  <div className={styles.shell}><header className={styles.topbar}><div><button className={styles.mobile} aria-label="Ouvrir les conversations" onClick={()=>setPanel('topics')}><Menu/></button><strong>Ajnaya</strong><small>Ton bras droit</small></div><div><button aria-label="Toute l’administration" onClick={()=>setPanel('tools')}><Grid2X2 size={20}/></button><button aria-label="Aide et limites" onClick={()=>setPanel('help')}><CircleHelp size={20}/></button><button aria-label="Verrouiller l’espace" onClick={()=>clear()}><LockKeyhole size={18}/></button></div></header>
   <div className={styles.notice} role="status">{notice}</div>
   <main className={styles.chat}><div className={styles.thread}>
    {!mission?<section className={styles.welcome}><div className={styles.symbol}><Eye size={28}/></div><h1>Que veux-tu que je prenne en charge ?</h1><p>Donne-moi ton objectif. Tu verras ce qui avance, ce qui manque et ce qui attend ton accord.</p>
      {!status?.available&&<div className={styles.info}>Le service des missions attend son raccordement. Les pages de l’administration restent accessibles.</div>}
      {!closed&&!status?.available&&<button className={styles.button} disabled={busy} onClick={()=>void run(load)}><RefreshCw size={16}/>Vérifier à nouveau</button>}
      <button className={styles.button} onClick={()=>setPanel('tools')}><Grid2X2 size={17}/>Ouvrir l’administration</button>
     </section>:<><div className={styles.user}>{mission.objective}</div><p className={styles.assistant}><Eye size={20}/>Ajnaya</p><h2>{missionLabel(mission)}</h2>{mission.mode==='test'&&<p className={styles.info}>Cette mission est une simulation.</p>}
      <section className={styles.card}><div className={styles.cardHead}><strong>Suivi de la mission</strong><small>{dateLabel(mission.updatedAt)}</small></div>
       <p className={styles.info}>{telegramDeliveryLabel(delivery)}{delivery?.updatedAt&&<> · {dateLabel(delivery.updatedAt)}</>}</p><p className={styles.small}>Ce suivi ne confirme pas la lecture sur ton téléphone.</p>
       <ol className={styles.steps}>{mission.steps.map(step=><li key={String(step.id)}><strong>{capabilityLabel[String(step.capability)]||'Étape de la mission'}</strong><span>{step.status==='succeeded'&&step.capability==='social.metrics.read'?(socialMetricsResult(step,mission.mode,now)?'Registre relu':'Résultat indisponible'):step.status==='succeeded'&&isMissionControlCapability(step.capability)?(missionControlResult(step,mission.id)?step.capability==='mission.control'?'Commande enregistrée':'État relu':'Résultat indisponible'):({pending:'En préparation',executing:'En cours',waiting:'En attente',succeeded:'Terminée',failed:'Échec',uncertain:'Résultat à vérifier'} as Record<string,string>)[String(step.status)]}</span>
        {step.capability==='social.metrics.read'?<SocialMetricsCard step={step} mode={mission.mode} now={now}/>:isMissionControlCapability(step.capability)?<MissionControlCard step={step} sourceMissionId={mission.id} busy={busy} openTarget={id=>void run(()=>openTarget(id))}/>:(step.capability==='stripe.payout.prepare'||isPayoutAction(step.capability))?<PayoutResultCard step={step} now={now}/>:record(step.result)&&(step.capability==='code.worker.status.read'?<WorkerStatusCard output={step.result.output} now={now}/>:<><p>{String(step.result.summary||'')}</p>{Array.isArray(step.result.evidence)&&step.result.evidence.map((e,i)=>record(e)?<details key={i}><summary>Source et preuve · {dateLabel(e.observedAt)}</summary><p>{String(e.source||'Source non précisée')}</p><p>{String(e.reference||'')}</p>{e.kind==='draft'&&<p>Document préparé. À relire avant utilisation.</p>}</details>:null)}<details><summary>Voir le résultat</summary><pre>{JSON.stringify(step.result.output,null,2)}</pre></details></>)}
        {step.capability==='code.change.prepare'&&<section className={styles.need} aria-label="Proposition de correction"><h3>{step.status==='succeeded'?'Correction prête à relire':'Suivi de la proposition'}</h3><p>{mission.objective}</p>
         {record(step.result)&&record(step.result.output)&&<><p>Projet : {String(step.result.output.projectId||'À confirmer')}</p>{Array.isArray(step.result.output.changedPaths)&&<ul>{step.result.output.changedPaths.filter(p=>typeof p==='string').map(p=><li key={String(p)}>{String(p)}</li>)}</ul>}{typeof step.result.output.checksPassed==='number'&&<p>{step.result.output.checksPassed} {step.result.output.checksPassed===1?'contrôle réussi':'contrôles réussis'}.</p>}</>}
         <p><strong>Aucun changement appliqué.</strong></p><button className={styles.button} disabled={busy} onClick={()=>void run(()=>openReview(String(step.id)))}>Voir la proposition</button>
        </section>}
        {Array.isArray(step.needs)&&step.needs.filter(record).map((need,i)=><div className={styles.need} key={String(need.id||i)}><p>{String(need.description||'Une vérification est nécessaire.')}</p>{typeof need.accountId==='string'&&<p>Compte : {String(need.accountId)}</p>}{Array.isArray(need.permissions)&&<p>Accès demandé : {need.permissions.join(', ')}</p>}
          {need.kind==='access'&&<button className={styles.button} disabled={busy} onClick={()=>void run(openAccess)}>Voir les accès</button>}
          {['access','verification','approval'].includes(String(need.kind))&&<button className={styles.button} disabled={busy} onClick={()=>void run(async()=>{await api(`missions/${mission.id}/commands`,{type:'recheck',stepId:step.id,needId:need.id,planVersion:mission.planVersion});await refresh(mission.id);})}>Vérifier la situation</button>}
        </div>)}
        {(['n8n.workflow.deactivation.prepare','stripe.payout.prepare'].includes(String(step.capability)))&&step.status==='succeeded'&&mission.mode!=='test'
          &&(step.capability!=='stripe.payout.prepare'||!mission.steps.some(s=>isPayoutAction(s.capability)))
          &&(step.capability==='stripe.payout.prepare'?status?.payoutAvailable:status?.sensitiveAvailable)
          &&<button className={styles.button} disabled={busy} onClick={()=>void run(()=>deriveAction(String(step.id)))}>{step.capability==='stripe.payout.prepare'?'Préparer la fiche de versement':'Préparer la fiche d’arrêt'}</button>}
        {(step.capability==='n8n.workflow.deactivate'||isPayoutAction(step.capability))&&['pending','waiting'].includes(String(step.status))
          &&(isPayoutAction(step.capability)?status?.payoutAvailable:status?.sensitiveAvailable)
          &&<button className={styles.button} disabled={busy} onClick={()=>void run(async()=>{await api(`missions/${mission.id}/actions/preview`,{stepId:step.id});await refresh(mission.id);})}>Lire la fiche avant accord</button>}
       </li>)}</ol>
       <div className={styles.cardButtons}><button disabled={busy} onClick={()=>void run(()=>refresh(mission.id).then(()=>{}))}><RefreshCw size={16}/>Vérifier le résultat</button>{!['succeeded','failed','cancelled'].includes(mission.status)&&<><button disabled={busy} onClick={()=>void run(()=>command(mission.control==='pause'?'continue':'pause'))}>{mission.control==='pause'?'Reprendre':'Mettre en pause'}</button><button disabled={busy} onClick={()=>void run(()=>command('cancel'))}>Demander l’annulation</button><button disabled={busy} onClick={()=>void run(async()=>{await api(`missions/${mission.id}/renew`,{planVersion:mission.planVersion});await refresh(mission.id);})}>Renouveler la préparation</button></>}</div>
      </section>
      {actions.map(a=>isPayoutAction(a.manifest.capabilityId)?<PayoutActionCard key={a.id} action={a} mission={mission} available={status?.payoutAvailable===true} busy={busy} now={now}
       approve={()=>void run(()=>approve(a))} revoke={()=>void run(()=>revoke(a))} close={()=>setActions(previous=>previous.filter(v=>v.id!==a.id))}/>
       :a.manifest.capabilityId!=='n8n.workflow.deactivate'?<section className={styles.card} key={a.id}><p className={styles.info}>Cette action n’est pas prise en charge dans cet espace.</p></section>:<section className={styles.card} key={a.id}><div className={styles.cardHead}><strong>Arrêter les prochains déclenchements de ce robot ?</strong></div><div className={styles.actionBody}><dl><div><dt>Instance</dt><dd>{String(a.manifest.instanceId||'Non confirmée')}</dd></div><div><dt>Robot</dt><dd>{String(a.manifest.workflowId||'Non confirmé')}</dd></div><div><dt>Version observée</dt><dd>{String(a.manifest.expectedVersionId||'Non confirmée')}</dd></div><div><dt>Version active</dt><dd>{String(a.manifest.expectedActiveVersionId??'Aucune')}</dd></div><div><dt>Observation</dt><dd>{dateLabel(a.manifest.preparedAt)}</dd></div><div><dt>Accord valable jusqu’au</dt><dd>{actionDeadline(a)?dateLabel(new Date(actionDeadline(a)).toISOString()):'Échéance non confirmée'}</dd></div></dl>
       <p className={styles.info}>Les tâches déjà lancées peuvent continuer. Une modification faite ailleurs au même moment peut intervenir entre notre vérification et l’arrêt.</p>
       {a.approval&&<p>{a.approval.consumedAt?'Action partie. Résultat à vérifier.':a.approval.revokedAt?'Accord retiré.':'Accord enregistré. Exécution non confirmée.'}</p>}{actionDeadline(a)<=now&&<p>Cette fiche a expiré. Prépare une nouvelle fiche.</p>}
       <div className={styles.cardButtons}>{status?.sensitiveAvailable&&canApproveAction(a,mission,now)&&<button className={styles.primary} disabled={busy} onClick={()=>void run(()=>approve(a))}>Autoriser cet arrêt</button>}{a.approval&&!a.approval.consumedAt&&!a.approval.revokedAt&&actionDeadline(a)>now&&<button disabled={busy} onClick={()=>void run(async()=>{const r=await api<{revoked:boolean}>(`missions/${a.missionId}/actions/${a.id}/revoke`,{});setNotice(r.revoked?'Accord retiré.':'Le retrait n’est pas confirmé. État relu.');await refresh(a.missionId);})}>Retirer mon accord</button>}<button onClick={()=>setActions(previous=>previous.filter(v=>v.id!==a.id))}>Fermer</button></div>
      </div></section>)}
     </>}
    {closed&&<a href="/admin/ajnaya" className={styles.button}>Vérifier mon accès et rouvrir</a>}
   </div></main>
   <div className={styles.composerZone}><form className={styles.composer} onSubmit={e=>{e.preventDefault();void run(send);}}><label className={styles.sr} htmlFor="founder-objective">Ton objectif pour Ajnaya</label><textarea id="founder-objective" placeholder="Donne-moi l’objectif. Je m’occupe de la suite." value={draft} maxLength={4000} readOnly={!!pending} disabled={closed} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void run(send);}}}/><div className={styles.composerBottom}><small>{pending?'Demande conservée après coupure':'Espace fondateur'}</small><div><button type="button" disabled title="Le raccordement vocal des missions reste à vérifier" aria-label="Saisie vocale non raccordée"><Mic size={20}/></button><button type="submit" className={styles.send} disabled={closed||busy||!status?.available||(!draft.trim()&&!pending)} aria-label={pending?'Retrouver la même demande':'Envoyer la demande'}><ArrowUp size={22}/></button></div></div></form><p className={styles.hint}>{status?.payoutAvailable?'Chaque versement exige une fiche exacte et ton accord.':'Les versements sont fermés.'} Publications et application des corrections indisponibles. Aucun secret dans la conversation.</p></div>
  </div>
  {panel&&<Panel wide={panel==='review'} title={panel==='review'?'Proposition de correction':panel==='tools'?'Toute l’administration':panel==='access'?'Tes accès et autorisations':panel==='topics'?'Tes conversations':'Ce que tu peux attendre'} close={()=>{closeReview();setPanel(null);}}>
   {panel==='tools'&&<><p>Ouvre une rubrique existante. Ses boutons gardent leurs propres règles de vérification.</p>{administration.map(([path,label])=><a className={styles.toolLink} key={path} href={'/admin/'+path}>{label}<span>↗</span></a>)}</>}
   {panel==='topics'&&topics}
   {panel==='review'&&<>{reviewNotice&&<p role="status">{reviewNotice}</p>}{review&&<CodeReviewPanel review={review}/>}<button className={styles.button} onClick={()=>closeReview()}>Revenir à la mission</button></>}
   {panel==='help'&&<><p>Une mission enregistrée attend son résultat.</p><p>Un brouillon terminé reste à relire.</p><p>Une autorisation ne prouve pas que l’action a eu lieu.</p><p>Les missions reçues depuis Telegram conservent ici leur demande et leur suivi écrit.</p><p>Le micro de cet écran et l’ajout de documents attendent leur raccordement protégé.</p><PayoutPreparationCard available={status?.payoutAvailable===true}/></>}
   {panel==='access'&&<>{!access?<><p>{busy?'Lecture des accès…':status?.available?'Le suivi des accès est indisponible. Relis-le avant une nouvelle décision.':'Les services des missions ne sont pas encore raccordés.'}</p>{status?.available&&<button className={styles.button} disabled={busy} onClick={()=>void run(openAccess)}>Relire les accès</button>}</>:<><p>Chaque accord concerne uniquement les comptes et opérations affichés.</p><label>Durée de l’accord<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[5,30,60,240,1440].map(v=><option key={v} value={v}>{v===1440?'24 heures':v+' minutes'}</option>)}</select></label>
    {Object.entries(access.scopes).map(([id,s])=>{const grant=access.grants.find(g=>g.capabilityId===id&&g.scopeHash===s.scopeHash&&!g.revokedAt&&Date.parse(g.expiresAt)>now);return <section className={styles.card} key={id}><div className={styles.actionBody}><h3>{capabilityLabel[id]||id}</h3><p>{s.description}</p>{id==='social.metrics.read'?<SocialAccessScope resources={s.resources}/>:id==='stripe.payout.prepare'?<PayoutAccessScope resources={s.resources}/>:id==='code.change.prepare'?<><p>Projet : {String(s.resources.projectId)}</p><p className={styles.prewrap}>Version : {String(s.resources.revision)}</p><p>Fichiers concernés :</p><ul>{[...(s.resources.editablePaths as string[]),...(s.resources.contextPaths as string[])].map(p=><li key={p}>{p}</li>)}</ul><p>Trois essais au plus par demande. Aucun changement appliqué.</p><p>Cet accord ne fixe aucun budget financier.</p><details><summary>Détails du projet</summary><pre>{JSON.stringify(s.resources,null,2)}</pre></details></>:<pre>{JSON.stringify(s.resources,null,2)}</pre>}{grant?<><p>Accord valable jusqu’au {dateLabel(grant.expiresAt)}</p><button className={styles.button} disabled={busy} onClick={()=>void run(()=>withdrawAccess(grant.id))}>Retirer cet accès</button></>:<button className={styles.button} disabled={busy} onClick={()=>void run(async()=>{try{await api('access',{capabilityId:id,scopeHash:s.scopeHash,durationMinutes:duration});}finally{setAccess(null);setAccess(await api<AccessView>('access'));}setNotice(id==='code.change.prepare'?'Accord de préparation enregistré. Aucun changement appliqué.':'Accord de lecture enregistré. Vérifie ensuite la mission en attente.');})}>{id==='code.change.prepare'?'Autoriser cette préparation':'Autoriser cette lecture'}</button>}</div></section>;})}
    {access.grants.some(g=>!shownGrants.has(g.id))&&<details><summary>Anciens accès et autorisations</summary>{access.grants.filter(g=>!shownGrants.has(g.id)).map(g=><section className={styles.card} key={g.id}><div className={styles.actionBody}>
      <h3>{capabilityLabel[g.capabilityId]||'Ancien accès'}</h3><p>Accordé le {dateLabel(g.issuedAt)}</p><p>Valable jusqu’au {dateLabel(g.expiresAt)}</p>
      <p>{g.revokedAt?'Accès retiré le '+dateLabel(g.revokedAt):Date.parse(g.expiresAt)<=now?'Cet accès a expiré.':'Cet accord concerne un périmètre précédent.'}</p>
      <details><summary>Références de cet accord</summary><p>{g.capabilityId}</p><pre>{g.scopeHash}</pre></details>
      {!g.revokedAt&&<button className={styles.button} disabled={busy} onClick={()=>void run(()=>withdrawAccess(g.id))}>Retirer cet ancien accès</button>}
     </div></section>)}</details>}
    {!Object.keys(access.scopes).length&&<p>Aucun nouveau compte de service identifié. Les anciens accords restent consultables ci-dessus.</p>}</> }<p className={styles.small}>Ne colle jamais de mot de passe ni de clé ici.</p></>}
  </Panel>}
  {mfa&&<Panel title="Confirme que c’est bien toi" close={()=>setMfa(false)}><AdminMfaForm userId={userId} checkAccess={mfa==='approval'?checkFounderApprovalAccess:checkFounderAccess} onVerified={afterMfa}/></Panel>}
 </div>;
}
