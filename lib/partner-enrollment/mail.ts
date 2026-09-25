import 'server-only';
import {randomUUID} from 'node:crypto';
import {adminDb,settings,enrollment} from './server';
const EMAIL=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type Mail={from:string;to:string;subject:string;html:string;text:string;reply_to:string};
export function mailSettings(){
  const key=process.env.RESEND_API_KEY;const owner=process.env.PARTNER_ENROLLMENT_ADMIN_EMAIL?.trim();
  if(!key||!owner||!EMAIL.test(owner))throw new Error('PROGRAMME_NOT_OPEN');
  return {key,owner,from:process.env.PARTNER_ENROLLMENT_FROM||'FOREAS <contact@foreas.xyz>'};
}
export function brandedMail(to:string,subject:string,heading:string,paragraphs:string[],cta?:{label:string;url:string}):Mail{
  const {from}=mailSettings();
  const action=cta?`<p style="margin:28px 0"><a href="${escape(cta.url)}" style="display:inline-block;background:#1d1d1f;color:#fff;border-radius:12px;padding:16px 24px;text-decoration:none;font-weight:600">${escape(cta.label)}</a></p>`:'';
  return {from,to,subject,reply_to:'contact@foreas.xyz',
    text:[heading,...paragraphs,cta?`${cta.label} : ${cta.url}`:'','FOREAS, toujours plus loin.','Une question ? contact@foreas.xyz','© 2026 FOREAS. Tous droits réservés.'].filter(Boolean).join('\n\n'),
    html:`<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#1d1d1f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:36px 16px"><table role="presentation" style="width:100%;max-width:580px;margin:auto;background:#fff;border:1px solid #e6e6eb;border-radius:20px" cellspacing="0" cellpadding="0"><tr><td style="padding:36px"><img src="https://partners.foreas.xyz/email/foreas-noir.png" width="180" alt="FOREAS" style="display:block;width:180px;max-width:100%;height:auto;margin-bottom:36px"><p style="font-size:12px;letter-spacing:1.5px;color:#6d3ad5">ESPACE PARTENAIRE</p><h1 style="font-size:28px;line-height:1.2;margin:12px 0 22px">${escape(heading)}</h1>${paragraphs.map(p=>`<p style="font-size:16px;line-height:1.6;color:#454550">${escape(p)}</p>`).join('')}${action}<p style="margin-top:30px;border-top:1px solid #ececf0;padding-top:24px;font-size:14px;color:#676771">Une question ? <a href="mailto:contact@foreas.xyz" style="color:#6538c9">contact@foreas.xyz</a></p></td></tr></table><p style="text-align:center;color:#777780;font-size:12px;margin-top:22px">FOREAS, toujours plus loin.<br>© 2026 FOREAS. Tous droits réservés.</p></td></tr></table></body></html>`};
}
export async function sendMail(mail:Mail,key:string):Promise<string>{
  const {key:apiKey}=mailSettings();
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(mail),signal:AbortSignal.timeout(15000)});
    const body=await response.json();if(!response.ok||typeof body.id!=='string')throw new Error('MAIL_UNAVAILABLE');return body.id;
  }catch(error){if(error instanceof Error&&error.message==='MAIL_UNAVAILABLE')throw error;throw new Error('MAIL_CONFIRMATION_UNCERTAIN');}
}
/** Generates its own link; no password is generated, stored, logged or sent. */
export async function sendSignIn(email:string){
  mailSettings();const {origin}=settings();
  const {data,error}=await adminDb().auth.admin.generateLink({type:'magiclink',email,options:{redirectTo:origin+'/inscription'}});
  if(error||!data.properties?.hashed_token)throw new Error('MAIL_UNAVAILABLE');
  const url=new URL('/inscription/confirmation',origin);url.searchParams.set('h',data.properties.hashed_token);url.searchParams.set('t',data.properties.verification_type);
  const mail=brandedMail(email,'Ton accès à l’espace partenaire FOREAS','Ton espace commence ici.',[
    'Confirme ton adresse pour créer ton espace partenaire ou reprendre ton inscription.',
    'Ce lien est personnel et à usage unique. Le bouton ouvre une page de confirmation : ta connexion ne démarre qu’après ton clic sur cette page.',
    'Si tu utilises déjà FOREAS, tu retrouveras le même compte. Tu peux ignorer ce message si tu ne l’as pas demandé.',
  ],{label:'Continuer mon inscription',url:url.href});
  await sendMail(mail,'partner-access/'+randomUUID());
}
async function mailFor(userId:string,kind:'owner'|'welcome'):Promise<Mail>{
  const e=await enrollment(userId);if(!e)throw new Error('SERVICE_UNAVAILABLE');
  const {data,error}=await adminDb().auth.admin.getUserById(userId);if(error||!data.user.email)throw new Error('SERVICE_UNAVAILABLE');
  if(kind==='owner')return brandedMail(mailSettings().owner,'Nouvelle inscription partenaire FOREAS','Un partenaire rejoint FOREAS.',[
    `Prénom ou nom : ${e.name}`,`Activité : ${e.profile}`,`Compte : ${data.user.email}`,
    `Inscription : ${new Date(e.created_at).toLocaleDateString('fr-FR')}`,`Référence : ${e.partner_id}`,
    'Son accès s’active à la fin du parcours, après acceptation des conditions et vérification Stripe. Cette notification ne déclenche aucun versement.',
  ]);
  const {data:p,error:pError}=await adminDb().from('partners').select('referral_code,status').eq('id',e.partner_id).eq('user_id',userId).single();
  if(pError||!p?.referral_code||p.status!=='active'||e.status!=='ready')throw new Error('SERVICE_UNAVAILABLE');
  return brandedMail(data.user.email,'Bienvenue dans ton espace partenaire FOREAS','Ton lien est prêt à partager.',[
    `Bonjour ${e.name}, ton espace partenaire est ouvert.`,
    `Ton identifiant : ${data.user.email}`,`Ton code partenaire : ${p.referral_code}`,
    `Ton lien personnel : https://www.foreas.xyz/r/${encodeURIComponent(p.referral_code)}`,
    'Tu retrouves ton lien, les supports disponibles et l’aide dans ton espace. Le même compte te permet de te connecter dans l’application FOREAS.',
    'Ta commission mensuelle est de 10 € par mois payé admissible. Aucun versement mensuel ne part avant le paiement confirmé du deuxième mois du chauffeur.',
    'Tu peux arrêter de participer à tout moment. Ton mot de passe reste personnel et ne sera jamais envoyé par email.',
  ],{label:'Ouvrir mon espace',url:settings().origin+'/partner'});
}
/** Request, recipient and key are frozen before sending. Uncertain attempts stop after 20h. */
export async function deliverEnrollmentMail(userId:string){
  const db=adminDb();const {data:rows,error}=await db.from('partner_enrollment_mail').select('*').eq('user_id',userId).in('state',['pending','failed','sending']).order('created_at');
  if(error)throw new Error('SERVICE_UNAVAILABLE');
  let incomplete=false;
  for(const row of rows||[]){
    const now=Date.now();if(row.retry_at&&Date.parse(row.retry_at)>now||row.lease_until&&Date.parse(row.lease_until)>now)continue;
    if(row.first_attempt_at&&now-Date.parse(row.first_attempt_at)>20*3600000){await db.from('partner_enrollment_mail').update({state:'uncertain'}).eq('id',row.id).neq('state','sent');incomplete=true;continue;}
    const message=row.message||await mailFor(userId,row.kind);const lease=randomUUID();
    let query=db.from('partner_enrollment_mail').update({state:'sending',message,recipient:message.to,lease_id:lease,lease_until:new Date(now+2*60000).toISOString(),first_attempt_at:row.first_attempt_at||new Date(now).toISOString()}).eq('id',row.id).eq('state',row.state);
    query=row.lease_id?query.eq('lease_id',row.lease_id):query.is('lease_id',null);
    const {data:claimed,error:claimError}=await query.select('id').maybeSingle();if(claimError)throw new Error('SERVICE_UNAVAILABLE');if(!claimed)continue;
    let provider:string|null=null;
    try{provider=await sendMail(message,row.business_key);}catch{}
    const {error:finishError}=await db.from('partner_enrollment_mail').update(provider?{state:'sent',sent_at:new Date().toISOString(),provider_id:provider,lease_id:null,lease_until:null,retry_at:null}:{state:'failed',retry_at:new Date(Date.now()+5*60000).toISOString(),lease_id:null,lease_until:null}).eq('id',row.id).eq('lease_id',lease);
    if(finishError)throw new Error('SERVICE_UNAVAILABLE');
    if(!provider)incomplete=true;
  }
  if(incomplete)throw new Error('MAIL_CONFIRMATION_UNCERTAIN');
}
