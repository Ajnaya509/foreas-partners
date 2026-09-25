const test=require('node:test'),assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const {load}=require('./load.cjs'),{codeFixture}=require('./code.fixture.cjs'),{payoutFixture}=require('./payout.fixture.cjs');
const {hash}=require('../../lib/founder/brain/model'),{verifyMissionAuthority}=require('../../lib/founder/brain/auth');
const {MissionGatewayError}=require('../../lib/founder/brain/gateway');
const {createAccessGateway}=load('lib/founder/access-gateway.ts');
const shared=new Map(),{FounderAccessError}=load('lib/founder/access.ts',{},shared),{handleFounderRequest}=load('lib/founder/handler.ts',{},shared);
const owner='b7862c1f-71f9-415e-87b7-954a6970228c',sid='33333333-3333-4333-8333-333333333333',grantId='77777777-7777-4777-8777-777777777777';
const error=code=>e=>e instanceof MissionGatewayError&&e.code===code;
function fixture(){
 const scope=r=>({resources:r,scopeHash:hash(r),description:'Lecture exacte de démonstration'}),bank=payoutFixture().scope,bankResources=bank.resources,{livemode,...rest}=bankResources;
 bank.scopeHash=hash({kind:'stripe.payout.readiness.v1',ownerId:owner,...rest,expectedLivemode:livemode});
 const scopes={'stripe.balance.read':scope({accountId:'acct_TestOnly',currency:'eur',scope:'platform',livemode:true}),
  'n8n.workflow.read':scope({instanceId:'instance_test',apiBaseUrl:'https://n8n.example.test/api/v1',workflowIds:['robot_test']}),
  'code.change.prepare':codeFixture(owner).scope,'stripe.payout.prepare':bank};
 const e={calls:[],nonces:new Set(),view:{scopes,grants:[]},actor:{ownerId:owner,channel:'admin',subject:owner,assurance:'mfa',authenticatedAt:new Date().toISOString()},authCount:0,posted:false};
 const authority={ownerId:owner,audience:'local-access-integration',gateways:{admin:{subject:owner,secret:randomBytes(32).toString('base64url')},telegram:{subject:'123456',secret:randomBytes(32).toString('base64url')}},forbiddenSecrets:[]};
 e.options={brainOrigin:'https://brain.example.test',authority,attempts:1,timeoutMs:1000,authenticate:async()=>{e.authCount++;if(e.authenticate)return e.authenticate(e.authCount);return e.actor;},transport:async(url,init)=>{
  await verifyMissionAuthority({method:init.method,path:new URL(url).pathname,body:Buffer.from(init.body||''),attestation:init.headers['x-mission-authority']},{...authority,consumeNonce:async v=>{if(e.nonces.has(v.nonce))return false;e.nonces.add(v.nonce);return true;}});
  e.calls.push({url,method:init.method,body:init.body,headers:init.headers});if(e.transport){const r=await e.transport(url,init);if(r)return r;}
  if(init.method==='GET')return Response.json(e.view);
  if(url.endsWith('/revoke'))return Response.json({revoked:true});
  e.posted=true;const b=JSON.parse(init.body),at=Date.now(),grant={id:grantId,ownerId:owner,issuedBy:owner,capabilityId:b.capabilityId,scopeHash:b.scopeHash,issuedAt:new Date(at).toISOString(),expiresAt:new Date(at+b.durationMinutes*60000).toISOString(),revokedAt:null};
  e.view.grants=[grant];return Response.json({grant});
 }};
 e.adapter=()=>createAccessGateway(e.options);
 e.body=(id='stripe.balance.read')=>({capabilityId:id,scopeHash:e.view.scopes[id].scopeHash,durationMinutes:30});
 e.deps={configured:true,sensitiveEnabled:false,origin:'https://partners.foreas.xyz',gatewayOptions:e.options,authenticate:async()=>{
  if(e.authRefusal)throw new FounderAccessError(e.authRefusal);return {actor:e.actor,sessionId:sid,expiresAt:Date.now()+200000};
 }};
 e.http=(path,body)=>handleFounderRequest(new Request(e.deps.origin+'/api/founder/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',origin:e.deps.origin,'x-foreas-founder':'1'},body:body===undefined?undefined:JSON.stringify(body)}),path.split('/'),e.deps);
 return e;
}
test('thin App adapter uses the official signatures for all four exact access cards',async()=>{
 const e=fixture(),view=await e.adapter().list();assert.deepEqual(Object.keys(view.scopes),Object.keys(e.view.scopes));
 for(const id of Object.keys(view.scopes)){
  const body=e.body(id),r=await e.adapter().issue(body);assert.equal(r.grant.capabilityId,id);assert.equal(r.grant.scopeHash,body.scopeHash);
 }
 assert.ok(e.calls.every(c=>c.url==='https://brain.example.test/founder/v1/missions/access'));
 assert.ok(e.calls.every(c=>Object.keys(c.headers).sort().join(',')==='accept,content-type,x-mission-authority'));
 assert.equal(e.calls.filter(c=>c.method==='POST').length,4);assert.equal(e.nonces.size,e.calls.length);
});
test('changed account, robot, bank or project cannot reuse an old access card',async()=>{
 for(const id of ['stripe.balance.read','n8n.workflow.read','stripe.payout.prepare','code.change.prepare']){
  const e=fixture(),body=e.body(id);const r=e.view.scopes[id].resources;
  if(id==='stripe.balance.read')r.accountId='acct_Changed';else if(id==='n8n.workflow.read')r.workflowIds=['changed'];else if(id==='stripe.payout.prepare')r.destinationId='ba_Changed';else r.revision='f'.repeat(40);
  await assert.rejects(e.adapter().issue(body),error('response_invalid'));assert.equal(e.calls.filter(c=>c.method==='POST').length,0);
 }
 const e=fixture(),body=e.body();delete e.view.scopes['stripe.balance.read'];await assert.rejects(e.adapter().issue(body),error('request_invalid'));
});
test('access identity is read again after its scope and a revoked role prevents emission',async()=>{
 const e=fixture();e.authenticate=async n=>{if(n>1)throw Error('session ended');return e.actor;};
 await assert.rejects(e.adapter().issue(e.body()),error('authority_refused'));assert.equal(e.calls.length,1);
 const route=fixture();route.transport=async()=>{route.authRefusal='forbidden';return Response.json(route.view);};
 const response=await route.http('access',route.body());assert.equal(response.status,403);assert.equal(route.calls.filter(c=>c.method==='POST').length,0);
});
test('an unknown issue outcome is not reissued and its retained grant is read back',async()=>{
 const e=fixture();let lost=true;e.transport=async(url,init)=>{
  if(init.method==='POST'&&lost){lost=false;const b=JSON.parse(init.body),at=Date.now();e.view.grants=[{id:grantId,ownerId:owner,issuedBy:owner,capabilityId:b.capabilityId,scopeHash:b.scopeHash,issuedAt:new Date(at).toISOString(),expiresAt:new Date(at+1800000).toISOString(),revokedAt:null}];throw Error('lost response after persistence');}
 };
 await assert.rejects(e.adapter().issue(e.body()),error('outcome_unknown'));assert.equal(e.calls.filter(c=>c.method==='POST').length,1);
 assert.equal((await e.adapter().list()).grants[0].id,grantId);assert.equal(e.calls.filter(c=>c.method==='POST').length,1);
});
test('revoke an old expired grant even with no current scope or ability to issue',async()=>{
 const e=fixture(),at=Date.now()-7200000;
 e.view={scopes:{},grants:[{id:grantId,ownerId:owner,issuedBy:owner,capabilityId:'historical.removed.read',scopeHash:'a'.repeat(64),issuedAt:new Date(at).toISOString(),expiresAt:new Date(at+1800000).toISOString(),revokedAt:null}]};
 assert.equal((await e.adapter().list()).grants.length,1);e.calls=[];
 assert.deepEqual(await e.adapter().revoke(grantId),{revoked:true});assert.equal(e.calls.length,1);assert.equal(e.calls[0].method,'POST');assert.equal(e.calls[0].body,'{}');
});
test('Telegram, missing MFA and server access refusals cannot pass through the App adapter',async()=>{
 for(const actor of [{channel:'telegram',assurance:'owner',subject:'123456'},{assurance:'owner'},{authenticatedAt:new Date(Date.now()-3600000).toISOString()}]){
  const e=fixture();e.actor={...e.actor,...actor};
  for(const fn of [()=>e.adapter().list(),()=>e.adapter().issue(e.body()),()=>e.adapter().revoke(grantId)])await assert.rejects(fn(),error('authority_refused'));
  assert.equal(e.calls.length,0);
 }
 for(const status of [401,403]){const e=fixture();e.transport=async()=>Response.json({error:'refused'},{status});assert.equal((await e.http('access')).status,403);}
});
test('one deadline covers pre-read and write; a late unknown write is never retried',async()=>{
 const e=fixture();e.options.timeoutMs=120;e.transport=async(url,init)=>{
  await new Promise(r=>setTimeout(r,init.method==='GET'?65:85));
  return init.method==='GET'?Response.json(e.view):Response.json({grant:null});
 };
 await assert.rejects(e.adapter().issue(e.body()),error('outcome_unknown'));assert.equal(e.calls.filter(c=>c.method==='POST').length,1);
});
test('invalid grant receipts, duplicate IDs and more than 500 grants stay unconfirmed',async()=>{
 for(const change of [{issuedBy:'other'},{revokedAt:new Date().toISOString()},{ownerId:'other'},{expiresAt:new Date(Date.now()+1801000).toISOString()}]){
  const e=fixture();e.transport=async(_url,init)=>{if(init.method==='POST'){const b=JSON.parse(init.body),at=Date.now();return Response.json({grant:{id:grantId,ownerId:owner,issuedBy:owner,capabilityId:b.capabilityId,scopeHash:b.scopeHash,issuedAt:new Date(at).toISOString(),expiresAt:new Date(at+1800000).toISOString(),revokedAt:null,...change}});}};
  await assert.rejects(e.adapter().issue(e.body()),error('outcome_unknown'));assert.equal(e.calls.filter(c=>c.method==='POST').length,1);
 }
 const e=fixture();await e.adapter().issue(e.body());const g=e.view.grants[0];for(const count of [2,501]){e.view.grants=Array(count).fill(g);await assert.rejects(e.adapter().list(),error('response_invalid'));}
});

test('the official fifth grant can be listed, issued and revoked alongside the four existing grants',async()=>{
 const e=fixture(),{socialMetricsScopeHash}=require('../../lib/founder/brain/socialMetrics');
 const resources={...require('./social.fixture.json').boundResponse.scope,ownerId:owner};
 e.view.scopes['social.metrics.read']={description:'Lecture privée du robot exact',resources,scopeHash:socialMetricsScopeHash(resources)};
 const view=await e.adapter().list();assert.equal(Object.keys(view.scopes).length,5);
 const issued=await e.adapter().issue(e.body('social.metrics.read'));assert.equal(issued.grant.scopeHash,socialMetricsScopeHash(resources));
 assert.equal(issued.grant.capabilityId,'social.metrics.read');assert.deepEqual(await e.adapter().revoke(issued.grant.id),{revoked:true});
 for(const id of Object.keys(view.scopes).filter(id=>id!=='social.metrics.read'))assert.equal((await e.adapter().issue(e.body(id))).grant.capabilityId,id);
});
test('a changed social account or revision cannot reuse the old fifth grant scope',async()=>{
 const {socialMetricsScopeHash}=require('../../lib/founder/brain/socialMetrics');
 for(const changed of [{providerAccountRef:'other-account'},{revision:2},{timezone:'UTC'},{environment:'live'},{driverId:'33333333-3333-4333-8333-333333333333'}]){
  const e=fixture(),resources={...require('./social.fixture.json').boundResponse.scope,ownerId:owner};
  e.view.scopes['social.metrics.read']={description:'Lecture sociale exacte',resources,scopeHash:socialMetricsScopeHash(resources)};
  const body=e.body('social.metrics.read');Object.assign(resources,changed);await assert.rejects(e.adapter().issue(body),error('response_invalid'));
  assert.equal(e.calls.filter(c=>c.method==='POST').length,0);
 }
});
