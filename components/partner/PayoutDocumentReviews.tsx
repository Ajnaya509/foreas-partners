'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {payoutReviewActionSchema,payoutReviewListSchema,payoutReviewResultSchema,payoutReviewResultMatches,type PayoutReviewList,type PayoutReviewAction} from '@/lib/partner/payout-reviews';
const money=(n:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n/100);
const date=(v:string)=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(v));
const field='block mt-sm mb-lg w-full min-h-12 rounded-lg bg-obsidian border border-glass-border-high p-md';
export function PayoutDocumentReviews({viewerId}:{viewerId:string}){
 const [list,setList]=useState<PayoutReviewList|null>(null),[selected,setSelected]=useState<PayoutReviewList['items'][number]|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[changed,setChanged]=useState(false);
 const epoch=useRef(0),lock=useRef(false),viewer=useRef(viewerId);
 if(viewer.current!==viewerId){viewer.current=viewerId;epoch.current++;}
 const valid=(e:number)=>epoch.current===e&&viewer.current===viewerId;
 useEffect(()=>{const {data}=createClient().auth.onAuthStateChange((_event,session)=>{
  if(session?.user.id!==viewerId){epoch.current++;setChanged(true);setList(null);setSelected(null);setMessage('Le compte a changé. Recharge la page.');}
 });return ()=>{epoch.current++;data.subscription.unsubscribe();};},[viewerId]);
 useEffect(()=>{void refresh();},[viewerId]);
 async function request(query:string,body?:PayoutReviewAction){
  const response=await fetch('/api/admin-payout-reviews'+query,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Foreas-Viewer':viewerId},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
  const r=await response.json();
  if(!response.ok||r.viewer_id!==viewerId)throw Error('UNCONFIRMED');return r.data;
 }
 async function run(fn:(stamp:number)=>Promise<void>,mutation=false){
  if(lock.current||changed)return;lock.current=true;setBusy(true);setMessage('');const stamp=epoch.current;
  try{await fn(stamp);}catch{if(valid(stamp)){setMessage('La demande n’a pas été confirmée. Actualise pour vérifier la situation.');if(mutation){setSelected(null);setList(null);}}}
  finally{lock.current=false;if(valid(stamp))setBusy(false);}
 }
 function refresh(next?:PayoutReviewList['next'],candidateAfter?:string){return run(async stamp=>{
  const params=next?'?'+new URLSearchParams({after_created:next.created_at,after_id:next.id}):candidateAfter?'?'+new URLSearchParams({candidate_after:candidateAfter}):'';
  const r=payoutReviewListSchema.parse(await request(params));if(!valid(stamp))return;
  setList(old=>next&&old?{...r,items:[...old.items,...r.items]}:r);setSelected(null);
 });}
 async function mutate(body:PayoutReviewAction,stamp:number,batch?:PayoutReviewList['items'][number]){
  const result=payoutReviewResultSchema.parse(await request('',body));if(!valid(stamp))return;
  if(body.action==='approve'&&!batch||!payoutReviewResultMatches(body,result,viewerId,batch))throw Error('MISMATCH');
  setSelected(null);setList(null);
  setMessage(result.action==='approve'?'Validation enregistrée pour le prochain versement. Aucun argent envoyé depuis cet écran.':result.action==='revoke'?'Validation retirée. Les pièces devront être vérifiées à nouveau.':result.batch?'Montant préparé. Actualise pour vérifier ses pièces.':'Aucun nouveau montant préparé. Actualise pour vérifier les réservations et le compte de paiement.');
 }
 function approve(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected)return;const batch=selected,form=new FormData(event.currentTarget);
  return run(async stamp=>{
   const file=form.get('invoice_file'),value=String(form.get('invoice_amount')??'').trim().replace(',','.');
   if(!(file instanceof File)||file.size<1||file.size>20*1024*1024||!/^\d{1,9}(?:\.\d{1,2})?$/.test(value))throw Error('INVALID');
   const [euros,centimes='']=value.split('.'),amount=Number(euros)*100+Number(centimes.padEnd(2,'0'));
   if(amount!==batch.amount_cents){setMessage('Le total de la facture doit correspondre au montant préparé. Vérifie la pièce.');return;}
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
   if(!valid(stamp))return;
   const action=payoutReviewActionSchema.parse({action:'approve',request_id:crypto.randomUUID(),batch_id:batch.id,
    invoice_reference:form.get('invoice_reference'),invoice_sha256:hash,invoice_date:form.get('invoice_date'),dossier_reference:form.get('dossier_reference'),
    amount_cents:amount,currency:'EUR',documents_checked:form.get('documents_checked')==='on'});
   await mutate(action,stamp,batch);
  },true);
 }
 return <div className="space-y-xl text-text-secondary" aria-busy={busy}>
  {message&&<p role="status" className="partner-notice">{message}</p>}
  <button className="partner-button" disabled={busy||changed} onClick={()=>refresh()}>{busy?'Vérification…':'Actualiser la situation'}</button>
  {list&&<p className="text-caption">Lecture du {date(list.observed_at)}, heure de Paris.</p>}
  {busy&&!list&&<div className="partner-panel" role="status">Chargement des montants à vérifier…</div>}
  {list&&<section className="partner-panel"><h2 className="font-display text-h1 text-text-primary">1. Préparer un montant</h2>
   <p>Le montant est réservé pour ce partenaire. Cette action n’envoie pas d’argent.</p>
   {!list.candidates.length&&<p>Aucun nouveau montant disponible. Les montants déjà réservés sont ci-dessous.</p>}
   <ul className="divide-y divide-glass-border">{list.candidates.map(row=><li key={row.sponsor_type+row.sponsor_id} className="py-lg space-y-sm">
    <p><strong className="tabular-nums text-text-primary">{money(row.amount_cents)}</strong> · {row.rights_count} commission{row.rights_count>1?'s':''}</p>
    {row.rights_count>500&&<p>La préparation inclut au plus 500 commissions. Le reste sera traité ensuite.</p>}
    <p className="text-caption break-all">{row.sponsor_type==='partner'?'Partenaire':'Chauffeur'} : {row.sponsor_id}</p>
    {row.destination?<button className="partner-button" disabled={busy||changed} onClick={()=>run(stamp=>mutate({action:'prepare',sponsor_type:row.sponsor_type,sponsor_id:row.sponsor_id},stamp),true)}>Préparer les commissions</button>:<p>Le compte de paiement doit être complété.</p>}
   </li>)}</ul>{list.candidates_next&&<button className="partner-button" disabled={busy||changed} onClick={()=>refresh(null,list.candidates_next!)}>Voir les autres montants disponibles</button>}
  </section>}
  {list&&<section className="partner-panel"><h2 className="font-display text-h1 text-text-primary">2. Vérifier les pièces</h2>
   {!list.items.length&&<p>Aucun montant préparé sur cette page.</p>}
   <ul className="divide-y divide-glass-border">{list.items.map(row=><li key={row.id} className="py-lg space-y-sm">
    <p><strong className="tabular-nums text-text-primary">{money(row.amount_cents)}</strong> · {row.review?'Pièces validées':'Pièces à vérifier'}</p>
    <p className="text-caption break-all">{row.sponsor_type==='partner'?'Partenaire':'Chauffeur'} : {row.sponsor_id}</p>
    <button className="partner-button" disabled={busy||changed} onClick={()=>{setSelected(row);setMessage('');}}>Vérifier ce montant</button>
   </li>)}</ul>{list.next&&<button className="partner-button" disabled={busy||changed} onClick={()=>refresh(list.next)}>Voir les suivants</button>}
  </section>}
  {selected&&<section className="partner-panel" key={selected.id} aria-label="Montant sélectionné"><h2 className="font-display text-h1 text-text-primary">3. Valider {money(selected.amount_cents)}</h2>
   <p className="text-caption break-all">{selected.sponsor_type==='partner'?'Partenaire':'Chauffeur'} : {selected.sponsor_id}</p>
   <p>La validation permet au prochain traitement de verser ce montant. Elle ne déclenche aucun paiement depuis cet écran.</p>
   {selected.review?<><p>Facture : {selected.review.invoice_reference}. Vérifiée le {date(selected.review.reviewed_at)}.</p>
    <p className="break-all">Dossier : {selected.review.dossier_reference}</p>
    <form onSubmit={e=>{e.preventDefault();const reason=new FormData(e.currentTarget).get('reason');if(selected.review)void run(stamp=>mutate(payoutReviewActionSchema.parse({action:'revoke',review_id:selected.review!.id,reason}),stamp),true);}}>
     <label htmlFor="review-reason">Raison du retrait</label><input id="review-reason" name="reason" required maxLength={1000} className={field} disabled={busy||changed}/>
     <button className="partner-button" disabled={busy||changed}>Retirer cette validation</button><p>Si le transfert est déjà parti, le retrait sera refusé. Il faudra vérifier son résultat.</p>
    </form></>:<form onSubmit={approve}>
    <label htmlFor="invoice-reference">Numéro de facture du partenaire</label><input id="invoice-reference" name="invoice_reference" required maxLength={200} className={field} disabled={busy||changed}/>
    <label htmlFor="invoice-date">Date de facture</label><input id="invoice-date" name="invoice_date" type="date" required className={field} disabled={busy||changed}/>
    <label htmlFor="invoice-amount">Total de la facture en euros</label><input id="invoice-amount" name="invoice_amount" inputMode="decimal" required className={field} disabled={busy||changed}/>
    <label htmlFor="invoice-file">Pièce que tu as vérifiée</label><input id="invoice-file" name="invoice_file" type="file" accept="application/pdf,image/png,image/jpeg" required className={field} disabled={busy||changed}/>
    <p>Fichier de 20 Mo maximum. Son empreinte est conservée pour l’identifier. Le fichier reste sur ton appareil.</p>
    <label htmlFor="dossier-reference">Dossier où les pièces sont conservées</label><input id="dossier-reference" name="dossier_reference" required maxLength={500} className={field} disabled={busy||changed}/>
    <label className="flex gap-md items-start py-lg"><input name="documents_checked" type="checkbox" required disabled={busy||changed} className="mt-xs"/><span>J’ai vérifié l’identité du partenaire, sa situation fiscale, la facture et le montant dû. Les pièces sont conservées dans le dossier indiqué.</span></label>
    <button className="partner-button is-primary" disabled={busy||changed}>{busy?'Vérification…':'Valider pour le prochain versement'}</button>
   </form>}
  </section>}
 </div>;
}
