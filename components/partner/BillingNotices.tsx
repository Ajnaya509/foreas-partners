'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {noticeActionSchema,noticeDetailSchema,noticeListSchema,noticeLabels,noticeStatus,noticeResultSchema,noticeRecoveredSchema,
 type NoticeList,type NoticeDetail,type NoticeAction} from '@/lib/partner/billing-notices';
const date=(v:string|null)=>v?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(v)):'Aucune tentative enregistrée';
const resultLabel:Record<string,string>={accepted:'Le service d’envoi a accepté le courriel. Cela ne prouve pas sa lecture.',obsolete:'Ce courriel est classé comme devenu inutile.',retry:'L’envoi reste incertain. Une vérification est nécessaire.',needs_review:'La demande nécessite une vérification.',late_evidence:'Une réponse tardive a été conservée. Vérifie l’historique.',in_progress:'Une autre opération est déjà en cours.'};
export function BillingNotices({viewerId}:{viewerId:string}){
 const [list,setList]=useState<NoticeList|null>(null),[detail,setDetail]=useState<NoticeDetail|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[changed,setChanged]=useState(false);
 const [providerId,setProviderId]=useState(''),[eventId,setEventId]=useState('');
 const epoch=useRef(0),lock=useRef(false),currentViewer=useRef(viewerId);
 if(currentViewer.current!==viewerId){currentViewer.current=viewerId;epoch.current++;}
 const valid=(n:number)=>epoch.current===n&&currentViewer.current===viewerId;
 useEffect(()=>{
  const supabase=createClient();const {data}=supabase.auth.onAuthStateChange((_e,session)=>{
   if(session?.user.id!==viewerId){epoch.current++;setChanged(true);setList(null);setDetail(null);setProviderId('');setEventId('');setMessage('Le compte a changé. Recharge la page.');}
  });
  return ()=>{epoch.current++;data.subscription.unsubscribe();};
 },[viewerId]);
 useEffect(()=>{void refresh();},[viewerId]);
 async function request(path:string,body?:object){
  const response=await fetch('/api/admin-notices'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Foreas-Viewer':viewerId},
   ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
  const value=await response.json();
  if(!response.ok||value.viewer_id!==viewerId)throw Error(value?.error?.code==='NOTICE_REVISION_CONFLICT'?'Ce courriel a changé. Relis son état avant de continuer.':'La demande n’a pas été confirmée. Actualise pour vérifier son état.');
  return value.data;
 }
 async function run(action:(stamp:number)=>Promise<void>){
  if(lock.current||changed)return;lock.current=true;const stamp=epoch.current;setBusy(true);setMessage('');
  try{await action(stamp);}catch(e){if(valid(stamp))setMessage(e instanceof Error&&['Ce courriel a changé. Relis son état avant de continuer.','La demande n’a pas été confirmée. Actualise pour vérifier son état.','Le courriel reçu ne correspond pas à cette demande.'].includes(e.message)?e.message:'La réponse reçue ne permet pas de confirmer cette demande. Actualise pour vérifier.');}
  finally{lock.current=false;if(valid(stamp))setBusy(false);}
 }
 function refresh(cursor?:string){return run(async stamp=>{
  const value=noticeListSchema.parse(await request(cursor?'?cursor='+encodeURIComponent(cursor):''));if(!valid(stamp))return;
  setList(previous=>cursor&&previous?{items:[...previous.items,...value.items],next_cursor:value.next_cursor}:value);setDetail(null);
 });}
 function inspect(id:string){return run(async stamp=>{
  const value=noticeDetailSchema.parse(await request('?id='+id));if(!valid(stamp))return;if(value.id!==id)throw Error('Le courriel reçu ne correspond pas à cette demande.');
  setDetail(value);setProviderId('');
 });}
 function act(action:NoticeAction['action']){if(!detail)return;const selected=detail;return run(async stamp=>{
  const body=noticeActionSchema.parse({id:selected.id,revision:selected.revision,operation_id:crypto.randomUUID(),action,...(action==='reconcile'?{provider_id:providerId}:{})});
  const result=noticeResultSchema.parse(await request('',body));if(!valid(stamp))return;
  setMessage(resultLabel[result.status]);setDetail(null);setList(null);
 });}
 function recover(){return run(async stamp=>{
  const result=noticeRecoveredSchema.parse(await request('',{event_id:eventId.trim()}));if(!valid(stamp))return;
  setMessage(result.items.length?`${result.items.length} courriel(s) retrouvé(s). Actualise la liste pour les vérifier.`:'Aucun courriel applicable à cet événement.');setList(null);setDetail(null);
 });}
 return <div className="space-y-xl" aria-busy={busy}>
  {message&&<p role="status" className="partner-notice">{message}</p>}
  <section className="partner-panel"><h2 className="font-display text-h1">Retrouver un courriel</h2>
   <p>Charge les courriels récents, puis ouvre celui à vérifier.</p><button className="partner-button" disabled={busy||changed} onClick={()=>refresh()}>{busy?'Vérification…':'Actualiser la liste'}</button>
   {list?.items.length===0&&<p>Aucun courriel enregistré dans ce suivi.</p>}
   {list&&<ul className="mt-xl divide-y divide-glass-border">{list.items.map(row=><li key={row.id} className="py-lg flex flex-wrap items-center justify-between gap-md">
    <div className="min-w-0"><h3 className="font-display text-h2">{noticeLabels[row.category]}</h3><p>{noticeStatus(row)}</p><p className="text-caption text-text-secondary">{date(row.created_at)}, heure de Paris</p></div>
    <button className="partner-button" disabled={busy||changed} onClick={()=>inspect(row.id)}>Vérifier ce courriel</button></li>)}</ul>}
   {list?.next_cursor&&<button className="partner-button" disabled={busy||changed} onClick={()=>refresh(list.next_cursor!)}>Voir les précédents</button>}
  </section>
  {detail&&<section className="partner-panel" aria-label="Courriel sélectionné"><h2 className="font-display text-h1">{noticeLabels[detail.category]}</h2>
   <dl className="mt-lg space-y-md"><div><dt className="text-caption text-text-secondary">Destinataire</dt><dd className="break-all">{detail.recipient}</dd></div>
    <div><dt className="text-caption text-text-secondary">Objet</dt><dd>{detail.subject}</dd></div><div><dt className="text-caption text-text-secondary">État</dt><dd>{noticeStatus(detail)}</dd></div>
    <div><dt className="text-caption text-text-secondary">Première tentative</dt><dd>{date(detail.first_attempt_at)}</dd></div></dl>
   <p className="text-caption text-text-secondary">Situation vérifiée le {date(detail.relevance.checked_at)}, heure de Paris.</p>
   <p>{detail.relevance.state==='relevant'?'Le destinataire et la situation correspondent encore à ce message.':detail.relevance.state==='obsolete'?'La situation a changé. Ce message est devenu inutile.':'La situation actuelle n’a pas pu être confirmée. Aucun nouvel envoi n’est proposé.'}</p>
   {detail.can_retry&&<button className="partner-button is-primary" disabled={busy||changed} onClick={()=>act('send')}>Réessayer ce courriel</button>}
   {detail.can_obsolete&&<button className="partner-button" disabled={busy||changed} onClick={()=>act('obsolete')}>Classer comme devenu inutile</button>}
   {detail.can_reconcile&&<div className="mt-xl"><label htmlFor="notice-provider" className="block">Référence du courriel dans Resend</label>
    <p className="text-caption text-text-secondary">Le service vérifiera ce courriel avant de confirmer son acceptation. Cette action n’envoie rien.</p>
    <input id="notice-provider" value={providerId} onChange={e=>setProviderId(e.target.value)} disabled={busy||changed} className="mt-md w-full min-h-12 rounded-lg bg-obsidian border border-glass-border-high p-md"/>
    <button className="partner-button" disabled={busy||changed||!noticeActionSchema.safeParse({id:detail.id,revision:detail.revision,operation_id:detail.id,action:'reconcile',provider_id:providerId}).success} onClick={()=>act('reconcile')}>Vérifier le reçu d’envoi</button></div>}
   {!detail.can_retry&&!detail.can_obsolete&&!detail.can_reconcile&&<p>Relis les confirmations disponibles ou actualise plus tard. Aucun envoi forcé n’est possible depuis cet écran.</p>}
   <details className="mt-xl"><summary className="cursor-pointer min-h-12 font-display text-h2">Historique des 20 dernières opérations</summary>
    {!detail.history.length&&<p>Aucune opération de reprise enregistrée.</p>}
    <ul className="space-y-lg">{detail.history.map(row=><li key={row.id}><p>{date(row.created_at)} — {resultLabel[row.state]??'Opération en cours de vérification.'}</p>
     {row.observations.map((e,i)=><p key={i} className="break-all text-caption text-text-secondary">Réponse du service : {e.provider_id}. Observée le {date(e.observed_at)}.</p>)}</li>)}</ul></details>
  </section>}
  <details className="partner-panel"><summary className="font-display text-h1 cursor-pointer">Retrouver un ancien événement</summary>
   <p>Indique sa référence Stripe. Seuls ses courriels seront recherchés. Aucun paiement ni effet sur le compte ne sera rejoué.</p>
   <label htmlFor="notice-event" className="block">Référence de l’événement Stripe</label><input id="notice-event" value={eventId} onChange={e=>setEventId(e.target.value)} disabled={busy||changed}
    className="mt-md w-full min-h-12 rounded-lg bg-obsidian border border-glass-border-high p-md"/>
   <button className="partner-button" disabled={busy||changed||!/^evt_[A-Za-z0-9_]{1,200}$/.test(eventId.trim())} onClick={recover}>Retrouver ses courriels</button>
  </details>
 </div>;
}
