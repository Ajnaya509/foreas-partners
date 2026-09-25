const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react'),renderer=require('react-test-renderer'),{load}=require('./load.cjs');
global.IS_REACT_ACT_ENVIRONMENT=true;
const owner='11111111-1111-4111-8111-111111111111',sid='33333333-3333-4333-8333-333333333333';
const token=id=>'e30.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.fixture';
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):n&&typeof n==='object'?text(n.children):'';
const m={id:'mission-private',objective:'Objectif privé contrôlé',status:'waiting',control:'run',mode:'prepare',planVersion:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),steps:[{id:'read',capability:'n8n.workflow.read',status:'waiting',needs:[{id:'missing',kind:'access',description:'Compte exact à raccorder'}],result:null,error:null}]};
async function fixture(options={}){
 let callback;const calls=[],jar=options.jar||new Map();const oldFetch=global.fetch,oldStore=global.sessionStorage;
 global.sessionStorage={getItem:k=>jar.get(k)||null,setItem:(k,v)=>jar.set(k,v),removeItem:k=>jar.delete(k)};
 global.fetch=async(url,init)=>{calls.push({url,init});if(options.fetch){const r=await options.fetch(url,init,calls);if(r)return r;}
  if(url.endsWith('/status'))return Response.json({available:options.available!==false,sensitiveAvailable:false,expiresAt:Date.now()+200000,message:'Accès vérifié'});
  if(url.endsWith('/missions'))return init.method==='POST'?Response.json({mission:m,replay:false}):Response.json({missions:options.missions||[],coverage:{exhaustive:false}});
  if(url.endsWith('/telegram-delivery'))return Response.json({delivery:null});
  if(url.endsWith('/actions'))return Response.json({actions:[]});
  if(url.endsWith('/mission-private'))return Response.json({mission:m});
  throw Error('Unexpected fixture request '+url);
 };
 const component=load('components/founder/FounderChat.tsx',{
  '@/lib/supabase/client': { createClient() {
    return { auth: { onAuthStateChange(fn) {
      callback=fn;
      if(!options.delayedSession)fn('INITIAL_SESSION',{user:{id:owner},access_token:token(sid)});
      return {data:{subscription:{unsubscribe(){}}}};
    } } };
  } },
  '@/lib/founder/check-access':{checkFounderAccess:async()=>({status:'allowed',userId:owner}),checkFounderApprovalAccess:async()=>({status:'allowed',userId:owner})},
  '@/app/auth/admin-mfa/AdminMfaForm':{AdminMfaForm:p=>React.createElement('button',{'data-mfa':true,onClick:p.onVerified},'MFA de test')},
  './founder.module.css':{__esModule:true,default:new Proxy({},{get:(_,name)=>String(name)})}
 }).FounderChat;
 let tree;await renderer.act(async()=>{tree=renderer.create(React.createElement(component,{userId:owner}),{createNodeMock:e=>e.type==='dialog'?{showModal(){},close(){}}:null});});
 return {tree,calls,jar,event:async(type,user=owner,id=sid)=>renderer.act(async()=>callback(type,user?{user:{id:user},access_token:token(id)}:null)),async close(){await renderer.act(async()=>tree.unmount());global.fetch=oldFetch;global.sessionStorage=oldStore;}};
}
const button=(f,label)=>f.tree.root.findAllByType('button').find(b=>text(b.toJSON?.()||b.props.children).includes(label));
const click=async b=>renderer.act(async()=>b.props.onClick());
test('closed service presents no active send or false capability',async()=>{const f=await fixture({available:false});try{assert.match(text(f.tree.toJSON()),/Que veux-tu que je prenne en charge/);assert.match(text(f.tree.toJSON()),/attend son raccordement/);assert.equal(f.tree.root.findByProps({'aria-label':'Envoyer la demande'}).props.disabled,true);assert.equal(f.calls.length,1);}finally{await f.close();}});
test('all 14 administration pages remain reachable in the panel',async()=>{const f=await fixture();try{await click(f.tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Toute l’administration'));const links=f.tree.root.findByType('dialog').findAllByType('a');assert.equal(links.length,14);assert.ok(links.some(a=>a.props.href==='/admin/partners'));assert.ok(links.some(a=>a.props.href==='/admin/communaute'));}finally{await f.close();}});
test('pending create preserves exact request identity after a lost reply',async()=>{let attempts=0;const f=await fixture({fetch:async(url,init)=>{if(url.endsWith('/missions')&&init.method==='POST'){attempts++;if(attempts===1)throw Error('lost');}}});try{
 await renderer.act(async()=>f.tree.root.findByType('textarea').props.onChange({target:{value:'  Garde cet objectif exact  '}}));
 await renderer.act(async()=>f.tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(f.tree.root.findByType('textarea').props.readOnly,true);assert.equal(f.jar.size,1);
 await renderer.act(async()=>f.tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 const posts=f.calls.filter(c=>c.init.method==='POST');assert.equal(posts.length,2);assert.equal(posts[0].init.body,posts[1].init.body);assert.equal(JSON.parse(posts[0].init.body).objective,'  Garde cet objectif exact  ');assert.equal(f.jar.size,0);
 }finally{await f.close();}});
test('logout clears mission and draft, discards a delayed private response',async()=>{
 let release,seen;const held=new Promise(r=>release=r),started=new Promise(r=>seen=r);
 const f=await fixture({missions:[m],fetch:async url=>{if(url.endsWith('/mission-private')){seen();await held;return Response.json({mission:m});}}});
 try{
  await renderer.act(async()=>f.tree.root.findByType('textarea').props.onChange({target:{value:'Brouillon secret'}}));
  let pending;await renderer.act(async()=>{pending=button(f,'Objectif privé contrôlé').props.onClick();});await started;
  await f.event('SIGNED_OUT',null);await renderer.act(async()=>{release();await pending;});
  assert.doesNotMatch(text(f.tree.toJSON()),/Objectif privé contrôlé|Brouillon secret|Compte exact/);assert.equal(f.tree.root.findByType('textarea').props.value,'');assert.equal(f.tree.root.findByProps({'aria-label':'Envoyer la demande'}).props.disabled,true);
 }finally{release();await f.close();}
});
test('same user with a different session closes the screen',async()=>{const f=await fixture({missions:[m]});try{await f.event('SIGNED_IN',owner,'55555555-5555-4555-8555-555555555555');assert.doesNotMatch(text(f.tree.toJSON()),/Objectif privé contrôlé/);assert.match(text(f.tree.toJSON()),/verrouillé/);}finally{await f.close();}});
test('MFA interruption keeps the draft and does not submit automatically',async()=>{const f=await fixture({fetch:async(url,init,calls)=>url.endsWith('/status')&&calls.length===1?Response.json({code:'mfa_required',message:'Vérifie ton accès'},{status:428}):null});try{assert.ok(f.tree.root.findByProps({'data-mfa':true}));await click(f.tree.root.findByProps({'data-mfa':true}));assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);}finally{await f.close();}});

test('delayed initial identity still restores exact pending request',async()=>{const jar=new Map([['foreas-founder-request:'+owner+':'+sid,JSON.stringify({requestId:'stored-request',objective:'Saved after loss'})]]);const f=await fixture({jar,delayedSession:true});try{await f.event('INITIAL_SESSION');assert.equal(f.tree.root.findByType('textarea').props.value,'Saved after loss');assert.equal(f.tree.root.findByType('textarea').props.readOnly,true);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);}finally{await f.close();}});
test('blocked browser storage does not prevent private screen clearing',async()=>{const f=await fixture({missions:[m]});try{global.sessionStorage.removeItem=()=>{throw Error('blocked storage');};await f.event('SIGNED_OUT',null);assert.doesNotMatch(text(f.tree.toJSON()),/Objectif privé contrôlé/);assert.equal(f.tree.root.findByType('textarea').props.disabled,true);}finally{await f.close();}});
test('double submit sends one create request',async()=>{const f=await fixture();try{await renderer.act(async()=>f.tree.root.findByType('textarea').props.onChange({target:{value:'Only once'}}));await renderer.act(async()=>{const form=f.tree.root.findByType('form');form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});});assert.equal(f.calls.filter(c=>c.init.method==='POST').length,1);}finally{await f.close();}});
test('Telegram tracking failure leaves the mission visible',async()=>{const f=await fixture({missions:[m],fetch:async url=>url.endsWith('/telegram-delivery')?Response.json({code:'unavailable'},{status:503}):null});try{await click(button(f,'Objectif privé contrôlé'));assert.match(text(f.tree.toJSON()),/Suivi de la mission/);assert.match(text(f.tree.toJSON()),/Suivi Telegram indisponible/);}finally{await f.close();}});
const {codeFixture,workerFixture}=require('./code.fixture.cjs');
const {renderToStaticMarkup}=require('react-dom/server');
test('code panel escapes HTML and shows historical cancellation without any execution control',()=>{
 const {review}=codeFixture();review.jobState='cancelled';
 const {CodeReviewPanel}=load('components/founder/CodeReviewPanel.tsx',{'./founder.module.css':{__esModule:true,default:{}}});
 const html=renderToStaticMarkup(React.createElement(CodeReviewPanel,{review}));
 assert.ok(html.includes('&lt;img'));assert.ok(!/<img\b/.test(html));assert.match(html,/Aucun changement appliqué/);assert.match(html,/Travail annulé/);assert.match(html,/Avant/);assert.match(html,/Proposition/);assert.doesNotMatch(html,/<button|<script|<iframe|onclick=/i);
});
async function reviewFixture(options={}){
 const data=codeFixture();return fixture({missions:[data.mission],fetch:async(url,init,calls)=>{
  if(url.endsWith('/status'))return Response.json({available:true,sensitiveAvailable:false,codeReviewAvailable:options.enabled!==false,expiresAt:Date.now()+200000,message:'Vérifié'});
  if(url.endsWith('/code-review'))return options.fetch?options.fetch(url,init,calls,data):Response.json({review:data.review});
  if(url.endsWith('/mission-private'))return Response.json({mission:data.mission});
 }});
}
test('private panel displays proof, source text and no write action',async()=>{
 const f=await reviewFixture();try{await click(button(f,'Corriger la page de démonstration'));await click(button(f,'Voir la proposition'));
 assert.match(text(f.tree.toJSON()),/Correction prête à relire/);assert.match(text(f.tree.toJSON()),/export const page/);assert.match(text(f.tree.toJSON()),/Aucun changement appliqué/);
 assert.ok(!f.calls.some(c=>c.init.method==='POST'));assert.ok(![...f.jar.values()].some(v=>v.includes('export const')));
 await click(button(f,'Revenir à la mission'));assert.doesNotMatch(text(f.tree.toJSON()),/export const page/);
 }finally{await f.close();}
});
test('closed code reader explains the missing opening without a private request',async()=>{
 const f=await reviewFixture({enabled:false});try{await click(button(f,'Corriger la page de démonstration'));await click(button(f,'Voir la proposition'));assert.match(text(f.tree.toJSON()),/lecture des propositions n’est pas encore ouverte/);assert.equal(f.calls.filter(c=>c.url.endsWith('/code-review')).length,0);}finally{await f.close();}
});
test('absent and invalid dossiers keep distinct messages',async()=>{
 for(const response of [()=>Response.json({review:null}),()=>Response.json({code:'code_review_unverified',message:'Le dossier n’a pas pu être vérifié.'},{status:503})]){
  const f=await reviewFixture({fetch:response});try{await click(button(f,'Corriger la page de démonstration'));await click(button(f,'Voir la proposition'));assert.match(text(f.tree.toJSON()),/proposition n’est pas encore disponible|dossier n’a pas pu être vérifié/);assert.doesNotMatch(text(f.tree.toJSON()),/export const page/);}finally{await f.close();}
 }
});
test('late private review discarded after logout and after panel close',async()=>{
 for(const closeOnly of [false,true]){
  let release,started;const held=new Promise(r=>release=r),ready=new Promise(r=>started=r);
  const f=await reviewFixture({fetch:async(_url,_init,_calls,data)=>{started();await held;return Response.json({review:data.review});}});
  try{await click(button(f,'Corriger la page de démonstration'));let pending;await renderer.act(async()=>{pending=button(f,'Voir la proposition').props.onClick();});await ready;
   if(closeOnly)await click(button(f,'Revenir à la mission'));else await f.event('SIGNED_OUT',null);
   await renderer.act(async()=>{release();await pending;});assert.doesNotMatch(text(f.tree.toJSON()),/export const page|Lecture du dossier protégé/);
  }finally{release();await f.close();}
 }
});
test('same user new session clears an already displayed private dossier',async()=>{const f=await reviewFixture();try{await click(button(f,'Corriger la page de démonstration'));await click(button(f,'Voir la proposition'));assert.match(text(f.tree.toJSON()),/export const/);await f.event('SIGNED_IN',owner,'55555555-5555-4555-8555-555555555555');assert.doesNotMatch(text(f.tree.toJSON()),/export const|Corriger la page/);}finally{await f.close();}});
const {workerStatus}=load('components/founder/workerStatus.ts');
test('worker current state expires at exact deadline and cannot revive on clock reversal',()=>{
 const now=Date.now(),v=workerFixture(now);
 assert.equal(workerStatus(v,now+59999).effectiveState,'recent');assert.equal(workerStatus(v,now+60000).effectiveState,'stale');assert.equal(workerStatus(v,now-1).effectiveState,'stale');assert.equal(workerStatus({...v,state:'stale'},now).effectiveState,'stale');
});
test('worker missing budget remains absent and contradictory readiness is rejected',()=>{
 const now=Date.now(),v=workerFixture(now);
 assert.equal(workerStatus({...v,report:{...v.report,budget:null}}),null);
 const needs={...v,report:{...v.report,phase:'needs_attention',issue:'configuration',budget:null}};
 assert.equal(workerStatus(needs).report.budget,null);
 assert.equal(workerStatus({...v,report:{...v.report,budget:{...v.report.budget,calls:10}}}),null);
 assert.equal(workerStatus({...v,validUntil:new Date(now+3600000).toISOString()}),null);
 assert.equal(workerStatus({...v,providerInvoiceVerified:true}),null);
});
test('worker old budget is historical and never presented as Stripe balance or current readiness',()=>{
 const v=workerFixture(),{WorkerStatusCard}=load('components/founder/WorkerStatusCard.tsx',{'./founder.module.css':{__esModule:true,default:{}}});
 const html=renderToStaticMarkup(React.createElement(WorkerStatusCard,{output:v,now:Date.parse(v.validUntil)}));
 assert.match(html,/État ancien/);assert.match(html,/Dernier budget déclaré/);assert.match(html,/USD hors taxes/);assert.match(html,/Ce n’est pas le solde Stripe/);
 const unknown=renderToStaticMarkup(React.createElement(WorkerStatusCard,{output:{...v,state:'unknown',report:null,receivedAt:null,validUntil:null},now:Date.now()}));assert.match(unknown,/État inconnu/);assert.match(unknown,/Budget indisponible/);
});
async function financialFixture({direct=false,...options}={}){
 const data=require('./payout.fixture.cjs')[direct?'directPayoutFixture':'payoutFixture']();
 let current=direct?data.mission:data.preparation;
 const f=await fixture({missions:[current],fetch:async(url,init,calls)=>{
  if(options.fetch){const r=await options.fetch(url,init,calls,data);if(r)return r;}
  if(url.endsWith('/status'))return Response.json({available:true,sensitiveAvailable:true,payoutAvailable:options.available!==false,expiresAt:Date.now()+200000});
  if(url.endsWith('/action-missions')){current=data.mission;return Response.json({mission:current,replay:false});}
  if(url.endsWith('/actions/preview'))return Response.json({action:data.action});
  if(url.endsWith('/approve'))return Response.json({execution:'not_confirmed',action:data.action});
  if(url.endsWith('/actions'))return Response.json({actions:current.id===data.mission.id?[data.action]:[]});
  if(url.endsWith('/'+data.mission.id)||url.endsWith('/'+data.preparation.id))return Response.json({mission:current});
 }});
 return {...f,data,current};
}
test('direct financial UI stays in one mission and approves only its second step',async()=>{
 const f=await financialFixture({direct:true});try{
  await click(button(f,f.current.objective));const html=text(f.tree.toJSON());
  assert.match(html,/Accord nécessaire/);assert.match(html,/Préparation de/);assert.equal(button(f,'Préparer la fiche de versement'),undefined);
  await click(button(f,'Lire la fiche avant accord'));const preview=f.calls.find(c=>c.url.endsWith('/preview'));assert.deepEqual(JSON.parse(preview.init.body),{stepId:'payout'});
  await click(button(f,'Autoriser ce versement de'));const approvals=f.calls.filter(c=>c.url.endsWith('/approve'));assert.equal(approvals.length,1);assert.deepEqual(JSON.parse(approvals[0].init.body),{manifestHash:f.data.action.manifestHash});
  assert.equal(f.calls.filter(c=>c.url.endsWith('/action-missions')).length,0);assert.doesNotMatch(text(f.tree.toJSON()),/versement terminé|argent reçu/);
 }finally{await f.close();}
});
test('explicit preparation preserves its derived request through lost reply and clears it on logout',async()=>{
 let lost=true;const f=await financialFixture({fetch:async url=>{if(url.endsWith('/action-missions')&&lost){lost=false;throw Error('fixture lost');}}});
 try{await click(button(f,f.current.objective));await click(button(f,'Préparer la fiche de versement'));assert.match(text(f.tree.toJSON()),/réponse manque/);
  await click(button(f,'Préparer la fiche de versement'));const calls=f.calls.filter(c=>c.url.endsWith('/action-missions'));assert.equal(calls.length,2);assert.equal(calls[0].init.body,calls[1].init.body);
  assert.deepEqual(Object.keys(JSON.parse(calls[0].init.body)).sort(),['requestId','sourceStepId']);assert.ok(f.jar.size>0);
  await f.event('SIGNED_OUT',null);assert.equal(f.jar.size,0);assert.doesNotMatch(text(f.tree.toJSON()),/4242|2.?000,50|acct_FixtureOnly/);
 }finally{await f.close();}
});
test('financial MFA refresh rereads the card and never automatically approves it',async()=>{
 let once=true;const f=await financialFixture({direct:true,fetch:async url=>{if(url.endsWith('/approve')&&once){once=false;return Response.json({code:'mfa_required',message:'Confirme ton identité'},{status:428});}}});
 try{await click(button(f,f.current.objective));await click(button(f,'Autoriser ce versement de'));assert.ok(f.tree.root.findByProps({'data-mfa':true}));
  await click(f.tree.root.findByProps({'data-mfa':true}));assert.equal(f.calls.filter(c=>c.url.endsWith('/approve')).length,1);assert.match(text(f.tree.toJSON()),/Relis la fiche actuelle/);
 }finally{await f.close();}
});

test('saved Telegram voice objective stays exact and never triggers approval while being read',async()=>{
 const mission={...m,objective:'Verse depuis Stripe 2 000,50 euros sur mon compte'};
 const f=await fixture({missions:[mission],fetch:async url=>url.endsWith('/'+mission.id)?Response.json({mission}):null});
 try{await click(button(f,mission.objective));assert.match(text(f.tree.toJSON()),/Verse depuis Stripe 2 000,50 euros sur mon compte/);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);
  await click(f.tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Aide et limites'));assert.match(text(f.tree.toJSON()),/suivi écrit/);assert.match(text(f.tree.toJSON()),/micro de cet écran/);
 }finally{await f.close();}
});

const oldGrant=()=>({id:'77777777-7777-4777-8777-777777777777',ownerId:owner,issuedBy:owner,capabilityId:'stripe.balance.read',scopeHash:'a'.repeat(64),issuedAt:new Date(Date.now()-7200000).toISOString(),expiresAt:new Date(Date.now()-3600000).toISOString(),revokedAt:null});
test('an old grant can be withdrawn from the UI after its scope disappears',async()=>{
 const grant=oldGrant();const f=await fixture({fetch:async(url,init)=>{
  if(url.endsWith('/access'))return Response.json({scopes:{},grants:[grant]});
  if(url.endsWith('/access/'+grant.id+'/revoke')){grant.revokedAt=new Date().toISOString();return Response.json({revoked:true});}
 }});
 try{await click(button(f,'Accès et autorisations'));assert.match(text(f.tree.toJSON()),/Anciens accès/);assert.match(text(f.tree.toJSON()),/a expiré/);
  await click(button(f,'Retirer cet ancien accès'));const posts=f.calls.filter(c=>c.init.method==='POST');assert.equal(posts.length,1);assert.equal(posts[0].url,'/api/founder/access/'+grant.id+'/revoke');assert.equal(posts[0].init.body,'{}');
  assert.match(text(f.tree.toJSON()),/Accès retiré/);assert.equal(button(f,'Retirer cet ancien accès'),undefined);assert.equal(f.jar.size,0);
 }finally{await f.close();}
});
test('lost access approval rereads the retained agreement instead of offering an automatic repeat',async()=>{
 const {hash}=require('../../lib/founder/brain/model');const resources={accountId:'acct_UIFixture',currency:'eur',scope:'platform',livemode:true},scope={resources,scopeHash:hash(resources),description:'Lire le compte de démonstration'};let grants=[];
 const f=await fixture({fetch:async(url,init)=>{
  if(url.endsWith('/access')){if(init.method==='POST'){const body=JSON.parse(init.body);grants=[{...oldGrant(),scopeHash:body.scopeHash,expiresAt:new Date(Date.now()+1800000).toISOString()}];throw Error('lost after saved grant');}return Response.json({scopes:{'stripe.balance.read':scope},grants});}
 }});
 try{await click(button(f,'Accès et autorisations'));await click(button(f,'Autoriser cette lecture'));assert.equal(f.calls.filter(c=>c.init.method==='POST').length,1);
  assert.ok(button(f,'Retirer cet accès'));assert.equal(button(f,'Autoriser cette lecture'),undefined);assert.equal(f.calls.at(-1).init.method,'GET');
 }finally{await f.close();}
});
test('lost access withdrawal followed by a failed reread clears stale action buttons',async()=>{
 const grant=oldGrant();let uncertain=false;const f=await fixture({fetch:async(url,init)=>{
  if(url.endsWith('/access')){if(uncertain)throw Error('reread unavailable');return Response.json({scopes:{},grants:[grant]});}
  if(url.endsWith('/revoke')){uncertain=true;throw Error('lost revoke response');}
 }});
 try{await click(button(f,'Accès et autorisations'));await click(button(f,'Retirer cet ancien accès'));
  assert.equal(f.calls.filter(c=>c.init.method==='POST').length,1);assert.equal(button(f,'Retirer cet ancien accès'),undefined);assert.match(text(f.tree.toJSON()),/Relis-le avant une nouvelle décision/);assert.ok(button(f,'Relire les accès'));
 }finally{await f.close();}
});

const {missionControlFixture}=require('./mission-control.fixture.cjs');
test('opening a validated control target performs exactly one protected read and no command',async()=>{
 const sample=missionControlFixture(),f=await fixture({missions:[sample.mission],fetch:async url=>url.endsWith('/'+sample.mission.id)?Response.json({mission:sample.mission}):url.endsWith('/'+sample.target.id)?Response.json({mission:sample.target}):null});
 try{await click(button(f,sample.mission.objective));assert.match(text(f.tree.toJSON()),/Commande enregistrée/);assert.match(text(f.tree.toJSON()),/Dernier état observé :\s+En attente/);assert.doesNotMatch(text(f.tree.toJSON()),/Étapes terminées/);
  const before=f.calls.length;await click(button(f,'Voir cette mission'));const calls=f.calls.slice(before);assert.equal(calls.length,1);assert.equal(calls[0].init.method,'GET');assert.equal(calls[0].url,'/api/founder/missions/'+sample.target.id);assert.match(text(f.tree.toJSON()),/Travail de la mission cible/);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);
 }finally{await f.close();}
});
test('lost or forbidden target read never repeats the control and never presents an unverified target',async()=>{
 for(const status of [503,403]){
  const sample=missionControlFixture(),f=await fixture({missions:[sample.mission],fetch:async url=>url.endsWith('/'+sample.mission.id)?Response.json({mission:sample.mission}):url.endsWith('/'+sample.target.id)?Response.json({code:'unavailable',message:'Lecture indisponible'},{status}):null});
  try{await click(button(f,sample.mission.objective));const before=f.calls.length;await click(button(f,'Voir cette mission'));assert.equal(f.calls.length-before,1);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);assert.doesNotMatch(text(f.tree.toJSON()),/Travail de la mission cible/);
   if(status===403){assert.equal(button(f,'Voir cette mission'),undefined);assert.equal(f.tree.root.findByType('textarea').props.disabled,true);}else assert.match(text(f.tree.toJSON()),/Lecture indisponible/);
  }finally{await f.close();}
 }
});
test('target read arriving after logout is discarded without any automatic command',async()=>{
 const sample=missionControlFixture();let release,seen;const held=new Promise(r=>release=r),started=new Promise(r=>seen=r);
 const f=await fixture({missions:[sample.mission],fetch:async url=>{if(url.endsWith('/'+sample.mission.id))return Response.json({mission:sample.mission});if(url.endsWith('/'+sample.target.id)){seen();await held;return Response.json({mission:sample.target});}}});
 try{await click(button(f,sample.mission.objective));let pending;await renderer.act(async()=>{pending=button(f,'Voir cette mission').props.onClick();});await started;await f.event('SIGNED_OUT',null);await renderer.act(async()=>{release();await pending;});assert.doesNotMatch(text(f.tree.toJSON()),/Travail de la mission cible|Work_Target-ABC/);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);
 }finally{release();await f.close();}
});
test('a malformed successful control remains unavailable and has no target button',async()=>{
 const sample=missionControlFixture();sample.result.output.current.missionId='DifferentTarget';const f=await fixture({missions:[sample.mission],fetch:async url=>url.endsWith('/'+sample.mission.id)?Response.json({mission:sample.mission}):null});
 try{await click(button(f,sample.mission.objective));assert.match(text(f.tree.toJSON()),/Résultat indisponible/);assert.equal(button(f,'Voir cette mission'),undefined);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,0);}finally{await f.close();}
});

test('social mission uses the dedicated dated card and clears it on logout',async()=>{
 const social=require('./social.fixture.json'),originalNow=Date.now;Date.now=()=>Date.parse(social.boundResponse.metrics.observedAt);
 let f;try{
  const mission={...m,id:'mission-social',objective:'Chiffres du robot social',mode:'test',status:'succeeded',steps:[{id:'lecture-sociale',capability:'social.metrics.read',status:'succeeded',needs:[],result:social.capabilityResult,error:null}]};
  f=await fixture({missions:[mission],fetch:async url=>url.endsWith('/mission-social')?Response.json({mission}):undefined});await click(button(f,'Chiffres du robot social'));
  let shown=text(f.tree.toJSON());assert.match(shown,/Essai fictif du robot social/);assert.match(shown,/Vrais prospects vérifiés :\s+inconnu/);assert.match(shown,/Registre relu/);assert.match(shown,/jours précédents/);
  await f.event('SIGNED_OUT',null);shown=text(f.tree.toJSON());assert.doesNotMatch(shown,/robot.fixture|account-fixture|Messages acceptés|Chiffres du robot social/);
 }finally{if(f)await f.close();Date.now=originalNow;}
});
test('the fifth access UI sends its exact scope once and clears actions if the receipt reread fails',async()=>{
 const {socialMetricsScopeHash}=require('../../lib/founder/brain/socialMetrics'),resources={...require('./social.fixture.json').boundResponse.scope,ownerId:owner};
 const scope={description:'Lecture privée du robot exact',resources,scopeHash:socialMetricsScopeHash(resources)};let posted=false;
 const f=await fixture({fetch:async(url,init)=>{
  if(url.endsWith('/access')){if(init.method==='POST'){posted=true;throw Error('reply lost');}if(posted)throw Error('reread lost');return Response.json({scopes:{'social.metrics.read':scope},grants:[]});}
 }});
 try{
  await click(button(f,'Accès et autorisations'));let shown=text(f.tree.toJSON());assert.match(shown,/Lire le registre du robot social/);assert.match(shown,/aucun envoi ni changement de quota/);
  await click(button(f,'Autoriser cette lecture'));const posts=f.calls.filter(c=>c.init.method==='POST');assert.equal(posts.length,1);
  assert.deepEqual(JSON.parse(posts[0].init.body),{capabilityId:'social.metrics.read',scopeHash:scope.scopeHash,durationMinutes:30});
  shown=text(f.tree.toJSON());assert.match(shown,/suivi des accès est indisponible/);assert.equal(button(f,'Autoriser cette lecture'),undefined);assert.ok(button(f,'Relire les accès'));
 }finally{await f.close();}
});
