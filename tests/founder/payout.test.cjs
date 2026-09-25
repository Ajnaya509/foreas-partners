const test=require('node:test'),assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./load.cjs'),{payoutFixture,directPayoutFixture}=require('./payout.fixture.cjs');
const {hash}=require('../../lib/founder/brain/model'),{verifyMissionAuthority}=require('../../lib/founder/brain/auth');
const modules=new Map(),{FounderAccessError}=load('lib/founder/access.ts',{},modules);
const {handleFounderRequest}=load('lib/founder/handler.ts',{},modules);
const {canApproveAction,actionDeadline}=load('lib/founder/action.ts');
const cards=load('components/founder/PayoutCards.tsx',{'./founder.module.css':{__esModule:true,default:new Proxy({},{get:(_,k)=>String(k)})}});
const subject='b7862c1f-71f9-415e-87b7-954a6970228c',session='11111111-1111-4111-8111-111111111111';
function environment(){
 const f=payoutFixture(),calls=[],nonces=new Set(),sensitive=[];
 const authority={ownerId:f.ownerId,audience:'fixture-financial',gateways:{admin:{subject,secret:randomBytes(32).toString('base64url')}},forbiddenSecrets:[]};
 const e={...f,calls,nonces,sensitive};
 e.deps={configured:true,sensitiveEnabled:true,payoutEnabled:true,origin:'https://partners.foreas.xyz',authenticate:async s=>{
  sensitive.push(s);if(e.refused)throw new FounderAccessError(e.refused);
  return {actor:{ownerId:f.ownerId,channel:'admin',subject,assurance:'mfa',authenticatedAt:new Date(Date.now()-1000).toISOString()},sessionId:session,expiresAt:Date.now()+240000};
 },gatewayOptions:{brainOrigin:'https://financial.fixture.invalid',authority,transport:async(url,init)=>{
  await verifyMissionAuthority({method:init.method,path:new URL(url).pathname,body:Buffer.from(init.body||''),attestation:init.headers['x-mission-authority']},{...authority,consumeNonce:async v=>{if(nonces.has(v.nonce))return false;nonces.add(v.nonce);return true;}});
  calls.push({url,method:init.method,body:init.body,headers:init.headers});
  if(e.intercept){const r=await e.intercept(url,init);if(r)return r;}
  if(url.endsWith('/access')){
   if(init.method==='GET')return Response.json({scopes:{'stripe.payout.prepare':e.scope},grants:[]});
   const b=JSON.parse(init.body);return Response.json({grant:{id:'66666666-6666-4666-8666-666666666666',ownerId:f.ownerId,issuedBy:subject,...b,durationMinutes:undefined,issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+b.durationMinutes*60000).toISOString(),revokedAt:null}});
  }
  if(url.endsWith('/action-missions'))return Response.json({mission:e.mission,replay:calls.filter(c=>c.url.endsWith('/action-missions')).length>1});
  if(url.endsWith('/preview'))return Response.json({action:e.action});
  if(url.endsWith('/approve'))return Response.json({action:{...e.action,approval:{approvedAt:new Date().toISOString(),expiresAt:e.action.expiresAt,revokedAt:null,consumedAt:null}},execution:'not_confirmed'});
  if(url.endsWith('/revoke'))return Response.json({revoked:true});
  if(url.endsWith('/actions'))return Response.json({actions:[e.action]});
  return Response.json({mission:url.endsWith('/source-payout')?e.preparation:e.mission});
 }}};
 return e;
}
function call(e,path,body){return handleFounderRequest(new Request('https://partners.foreas.xyz/api/founder/'+path,{method:body===undefined?'GET':'POST',headers:{'x-foreas-founder':'1',origin:e.deps.origin,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),path.split('/'),e.deps);}
const approvePath=e=>`missions/${e.mission.id}/actions/${e.action.id}/approve`;
const postCalls=e=>e.calls.filter(c=>c.method==='POST');
const renderAction=(f,props={})=>renderToStaticMarkup(React.createElement(cards.PayoutActionCard,{...f,available:true,busy:false,now:Date.now(),approve(){},revoke(){},close(){},...props}));

test('financial scope uses the owner-bound reviewed bank contract, not its display hash',async()=>{
 const e=environment();assert.notEqual(e.scope.scopeHash,hash(e.scope.resources));
 const r=await call(e,'access');assert.equal(r.status,200);assert.equal((await r.json()).scopes['stripe.payout.prepare'].scopeHash,e.scope.scopeHash);
 e.scope.resources.destinationId='ba_Other';assert.equal((await call(e,'access')).status,503);
});
test('bank read agreement sends only exact scope and duration; no payout or card approval',async()=>{
 const e=environment();const body={capabilityId:'stripe.payout.prepare',scopeHash:e.scope.scopeHash,durationMinutes:30};
 assert.equal((await call(e,'access',body)).status,200);assert.deepEqual(JSON.parse(postCalls(e)[0].body),body);assert.ok(postCalls(e).every(c=>c.url.endsWith('/access')));
 const wrong=environment();assert.equal((await call(wrong,'access',{...body,scopeHash:'0'.repeat(64)})).status,400);assert.equal(postCalls(wrong).length,0);
});
test('financial flag defaults closed, even when other approvals are enabled',async()=>{
 const e=environment();delete e.deps.payoutEnabled;
 const s=await (await call(e,'status')).json();assert.equal(s.sensitiveAvailable,true);assert.equal(s.payoutAvailable,false);
 for(const [path,body] of [['missions/source-payout/action-missions',{requestId:'same-request',sourceStepId:'prepare'}],['missions/payout-mission/actions/preview',{stepId:'payout'}],[approvePath(e),{manifestHash:e.action.manifestHash}]])assert.equal((await call(e,path,body)).status,503);
 assert.equal(postCalls(e).length,0);
});
test('derived mission retries preserve source and request identity with new signatures',async()=>{
 const e=environment();let lost=2;e.intercept=async url=>{if(url.endsWith('/action-missions')&&lost){lost--;throw Error('fixture lost');}};
 const path='missions/source-payout/action-missions',body={requestId:'stable-financial-request',sourceStepId:'prepare'};
 assert.ok(!(await call(e,path,body)).ok);assert.equal((await call(e,path,body)).status,200);
 const posts=postCalls(e);assert.equal(posts.length,3);assert.equal(posts[0].body,posts[1].body);assert.notEqual(posts[0].headers['x-mission-authority'],posts[1].headers['x-mission-authority']);
});
test('server preview preserves exact financial card and uses private no-store responses',async()=>{
 const e=environment(),r=await call(e,'missions/payout-mission/actions/preview',{stepId:'payout'});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual((await r.json()).action,e.action);
 assert.deepEqual(JSON.parse(postCalls(e)[0].body),{stepId:'payout'});assert.ok(e.calls.every(c=>c.url.startsWith('https://financial.fixture.invalid/founder/v1/missions')));
});
test('approval requests fresh founder proof, exact card hash, and never claims execution',async()=>{
 const e=environment(),r=await call(e,approvePath(e),{manifestHash:e.action.manifestHash});assert.equal(r.status,200);assert.equal((await r.json()).execution,'not_confirmed');
 assert.ok(e.sensitive.every(Boolean));assert.deepEqual(JSON.parse(postCalls(e)[0].body),{manifestHash:e.action.manifestHash});
 const stale=environment();stale.refused='mfa_required';assert.equal((await call(stale,approvePath(stale),{manifestHash:stale.action.manifestHash})).status,428);assert.equal(stale.calls.length,0);
});
test('changed bank, scope, owner, card hash, amount or review cannot be approved',async()=>{
 for(const mutate of [e=>e.action.manifest.destinationId='ba_Other',e=>e.action.manifest.ownerId='other-founder',e=>e.action.manifest.financialReview.scopeHash='f'.repeat(64),e=>{e.action.manifest.amountMinor=300000;e.action.manifest.expectedTotalDebitMinor=300000;},e=>e.action.manifest.financialReview.standardPayoutFeeMinor=1,e=>e.action.manifest.financialReview.expiresAt=new Date(Date.now()-1).toISOString()]){
  const e=environment();mutate(e);e.action.manifestHash=hash(e.action.manifest);
  assert.ok(!(await call(e,approvePath(e),{manifestHash:e.action.manifestHash})).ok);assert.equal(postCalls(e).length,0);
 }
 const e=environment();assert.equal((await call(e,approvePath(e),{manifestHash:'a'.repeat(64)})).status,409);assert.equal(postCalls(e).length,0);
});
test('expiry, test mode, changed plan, wrong capability and consumed approval disable agreement',()=>{
 const f=payoutFixture();assert.equal(canApproveAction(f.action,f.mission),true);assert.equal(actionDeadline(f.action),Date.parse(f.action.manifest.financialReview.expiresAt));
 assert.equal(canApproveAction(f.action,f.mission,actionDeadline(f.action)),false);
 assert.equal(canApproveAction(f.action,f.mission,Date.parse(f.action.manifest.preparedAt)-1),false);
 for(const mission of [{...f.mission,mode:'test'},{...f.mission,planVersion:2},{...f.mission,control:'cancel'},{...f.mission,steps:[{...f.mission.steps[0],capability:'n8n.workflow.deactivate'}]}])assert.equal(canApproveAction(f.action,mission),false);
 for(const changes of [{capabilityVersion:1},{currency:'usd'},{method:'instant'},{fundsArrivalConfirmed:true},{feeCapEnforcedByProvider:true},{expectedTotalDebitMinor:1}])assert.equal(canApproveAction({...f.action,manifest:{...f.action.manifest,...changes}},f.mission),false);
 f.action.approval={approvedAt:new Date().toISOString(),expiresAt:f.action.expiresAt,revokedAt:null,consumedAt:new Date().toISOString()};assert.equal(canApproveAction(f.action,f.mission),false);
});
test('closing new financial approvals still permits withdrawing an unused agreement',async()=>{
 const e=environment();e.deps.payoutEnabled=false;e.deps.sensitiveEnabled=false;
 e.action.approval={approvedAt:new Date().toISOString(),expiresAt:e.action.expiresAt,revokedAt:null,consumedAt:null};
 const r=await call(e,`missions/${e.mission.id}/actions/${e.action.id}/revoke`,{});assert.equal(r.status,200);assert.equal((await r.json()).revoked,true);assert.ok(postCalls(e).every(c=>c.url.endsWith('/revoke')));
});
test('financial UI shows exact euros, masked bank, fee limits and distinct approval',()=>{
 const html=renderAction(payoutFixture());assert.match(html,/2[\s\u202f\u00a0]000,50/);assert.match(html,/•••• 4242/);assert.match(html,/Aucun plafond de frais/);assert.match(html,/n’est pas une certification automatique/);
 assert.match(html,/Autoriser ce versement/);assert.doesNotMatch(html,/Autoriser cet arrêt|<input|<textarea|<iframe|argent reçu/);
 assert.doesNotMatch(renderAction(payoutFixture(),{available:false}),/class="primary"/);
 const f=payoutFixture();assert.doesNotMatch(renderAction(f,{now:actionDeadline(f.action)}),/class="primary"/);
});
test('paid receipt is never presented as bank arrival; inconsistent receipt stays unconfirmed',()=>{
 const f=payoutFixture();const render=step=>renderToStaticMarkup(React.createElement(cards.PayoutResultCard,{step,now:Date.now()}));
 const html=render(f.completed.steps[0]);assert.match(html,/Signalé comme payé par Stripe/);assert.match(html,/L’arrivée en banque n’est pas confirmée/);assert.match(html,/frais constatés restent/);
 const bad=structuredClone(f.completed.steps[0]);bad.result.output={...bad.result.output,amountMinor:5};assert.match(render(bad),/preuve ne correspond pas/);assert.doesNotMatch(render(bad),/Ordre envoyé/);
 const uncertain={...f.completed.steps[0],status:'uncertain'};assert.match(render(uncertain),/Résultat inconnu/);assert.doesNotMatch(render(uncertain),/Ordre envoyé/);
 const prep=render(f.preparation.steps[0]);assert.match(prep,/Aucun ordre envoyé/);assert.doesNotMatch(prep,/Autoriser ce versement/);
});
test('direct order keeps its original mission and cannot derive a second financial mission',async()=>{
 const e=environment();Object.assign(e,directPayoutFixture());
 const card=await call(e,'missions/payout-mission/actions/preview',{stepId:'payout'});assert.equal(card.status,200);
 assert.equal((await card.json()).action.manifest.preparedSource.stepId,'prepare');
 assert.equal((await call(e,approvePath(e),{manifestHash:e.action.manifestHash})).status,200);
 assert.equal((await call(e,'missions/payout-mission/action-missions',{requestId:'duplicate-request',sourceStepId:'prepare'})).status,409);
 assert.equal(e.calls.filter(c=>c.url.endsWith('/action-missions')).length,0);
});
test('direct card requires matching retained source, proof hash and source amount',async()=>{
 for(const mutate of [e=>delete e.action.manifest.preparedSource,e=>e.action.manifest.preparedSource.proofHash='0'.repeat(64),e=>e.action.manifest.preparedSource.stepId='missing',e=>e.mission.steps[0].status='waiting',e=>e.mission.steps[0].result.output.preparation.amountMinor=7]){
  const e=environment();Object.assign(e,directPayoutFixture());mutate(e);e.action.manifestHash=hash(e.action.manifest);
  assert.ok(!(await call(e,approvePath(e),{manifestHash:e.action.manifestHash})).ok);assert.equal(postCalls(e).length,0);
 }
 const f=directPayoutFixture();f.action.manifest.capabilityVersion=2;assert.equal(canApproveAction(f.action,f.mission),false);
});
