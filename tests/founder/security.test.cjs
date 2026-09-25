const {test}=require('node:test'),assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const {load}=require('./load.cjs');
const sharedModules=new Map();
const {authenticateFounder,FounderAccessError,mfaTimestamp}=load('lib/founder/access.ts',{},sharedModules);
const {handleFounderRequest}=load('lib/founder/handler.ts',{},sharedModules);
const {verifyMissionAuthority}=require('../../lib/founder/brain/auth');
const {hash}=require('../../lib/founder/brain/model');
const {canApproveAction,actionDeadline}=load('lib/founder/action.ts');
const owner='b7862c1f-71f9-415e-87b7-954a6970228c',sid='33333333-3333-4333-8333-333333333333',other='22222222-2222-4222-8222-222222222222';
const now=Date.parse('2026-09-09T01:00:00Z'), identity={subject:owner,ownerId:owner};
function fixture(o={}){
 const calls=[];const claims={sub:owner,aal:'aal2',amr:[{method:'mfa/totp',timestamp:now/1000-10}],iat:now/1000,exp:now/1000+3600,session_id:sid,...o.claims};
 const role={user_id:owner,role:'admin',is_active:true,revoked_at:null,...o.role};
 const q={select(){return this},eq(){return this},in(){return this},is(){return this},abortSignal(){return this},maybeSingle:async()=>({data:o.noRole?null:role,error:o.roleError?{}:null})};
 const client={auth:{getSession:async()=>({data:{session:o.noSession?null:{access_token:'exact-fixture'}},error:null}),getUser:async t=>{calls.push(['user',t]);return {data:{user:{id:o.user||owner}},error:o.userError?{}:null}},getClaims:async t=>{calls.push(['claims',t]);return {data:{claims},error:o.claimsError?{}:null}}},from:()=>q,rpc:(n,args)=>{calls.push([n,args]);return {abortSignal:async()=>({data:o.revoked?false:true,error:o.storageError?{}:null})}}};
 return {client,calls,claims};
}
for(const [name,o,code] of [
 ['absent',{noSession:true},'unauthenticated'],['user refused',{userError:true},'unauthenticated'],['signature refused',{claimsError:true},'unauthenticated'],['mismatched signed subject',{claims:{sub:other}},'unauthenticated'],['expired jwt',{claims:{exp:now/1000}},'unauthenticated'],['other admin',{user:other,claims:{sub:other}},'forbidden'],['inactive',{role:{is_active:false}},'forbidden'],['revoked role',{role:{revoked_at:'2026-09-08'}},'forbidden'],['missing role',{noRole:true},'forbidden'],['ambiguous role',{roleError:true},'unavailable'],['system',{role:{role:'system'}},'forbidden'],['ended auth session',{revoked:true},'unauthenticated'],['session lookup unavailable',{storageError:true},'unavailable'],['aal1',{claims:{aal:'aal1'}},'mfa_required'],['no mfa timestamp',{claims:{amr:[]}},'mfa_required'],['fresh jwt old mfa',{claims:{amr:[{method:'mfa/totp',timestamp:now/1000-300}]}},'mfa_required'],['client claimed mfa',{claims:{amr:[{method:'totp',timestamp:now/1000-2}],mfaAt:new Date(now).toISOString()}},'mfa_required'],['future mfa',{claims:{amr:[{method:'mfa/totp',timestamp:now/1000+1}]}},'mfa_required']
])test('founder guard: '+name,async()=>{await assert.rejects(authenticateFounder(fixture(o).client,identity,300000,()=>now),e=>e instanceof FounderAccessError&&e.code===code);});
test('real successful MFA date reused and exact token checked',async()=>{const f=fixture();const r=await authenticateFounder(f.client,identity,300000,()=>now);assert.equal(r.actor.authenticatedAt,'2026-09-09T00:59:50.000Z');assert.equal(r.sessionId,sid);assert.deepEqual(f.calls.slice(0,2),[['user','exact-fixture'],['claims','exact-fixture']]);});
test('approval age is 120 seconds, exact expiry refused',()=>{const c=fixture({claims:{amr:[{method:'mfa/totp',timestamp:now/1000-120}]}}).claims;assert.throws(()=>mfaTimestamp(c,now,120000));assert.ok(mfaTimestamp(c,now,300000));});
const makeMission=()=>({id:'mission-one',objective:'Lire le robot',status:'waiting',control:'run',mode:'prepare',planVersion:1,steps:[{id:'stop',capability:'n8n.workflow.deactivate',status:'waiting',result:null,error:null,needs:[{id:'approval:one',kind:'approval',description:'Accord nécessaire'}]}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
function makeAction(){const at=Date.now();const manifest={operation:'deactivate',capabilityId:'n8n.workflow.deactivate',desiredActive:false,missionId:'mission-one',stepId:'stop',planVersion:1,instanceId:'fixture-only',workflowId:'robot-one',expectedVersionId:'version-a',preparedAt:new Date(at-1000).toISOString(),executeBefore:new Date(at+120000).toISOString()};return {id:'44444444-4444-4444-8444-444444444444',missionId:'mission-one',stepId:'stop',planVersion:1,manifest,manifestHash:hash(manifest),expiresAt:manifest.executeBefore,revokedAt:null,approval:null};}
function environment(o={}){
 const seen=[],nonces=new Set();let authCalls=0;let mission=makeMission(),action=makeAction();
 const authority={audience:'fixture-isolated-missions',ownerId:'test-founder',gateways:{admin:{subject:owner,secret:randomBytes(32).toString('base64url')}},forbiddenSecrets:[]};
 const deps={configured:true,sensitiveEnabled:true,origin:'https://partners.foreas.xyz',authenticate:async sensitive=>{authCalls++;if(o.authError)throw new FounderAccessError(o.authError);return {actor:{ownerId:'test-founder',channel:'admin',subject:owner,assurance:'mfa',authenticatedAt:new Date(Date.now()-1000).toISOString()},sessionId:o.changed&&authCalls>2?other:sid,expiresAt:Date.now()+200000};},gatewayOptions:{brainOrigin:'https://brain.fixture.invalid',authority,transport:async(url,init)=>{
  const raw=Buffer.from(init.body||'');await verifyMissionAuthority({method:init.method,path:new URL(url).pathname,body:raw,attestation:init.headers['x-mission-authority']},{...authority,consumeNonce:async c=>{if(nonces.has(c.nonce))return false;nonces.add(c.nonce);return true;}});
  seen.push({url,body:init.body,headers:init.headers});if(o.transport) return o.transport(url,init,seen,mission,action);
  if(url.endsWith('/approve'))return Response.json({action:{...action,approval:{approvedAt:new Date().toISOString(),expiresAt:action.expiresAt,revokedAt:null,consumedAt:null}},execution:'not_confirmed'});
  if(url.endsWith('/actions'))return Response.json({actions:[action]});
  if(url.endsWith('/missions'))return init.method==='POST'?Response.json({mission,replay:false}):Response.json({missions:[mission],coverage:{limit:50,exhaustive:false}});
  return Response.json({mission});
 }}};
 return {deps,seen,action,mission,nonces};
}
function req(path,body,headers={}){return new Request('https://partners.foreas.xyz/api/founder/'+path,{method:body===undefined?'GET':'POST',headers:{'x-foreas-founder':'1','origin':'https://partners.foreas.xyz','content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});}
const call=(env,path,body,headers)=>handleFounderRequest(req(path,body,headers),path.split('/'),env.deps);
for(const error of ['unauthenticated','forbidden','mfa_required','unavailable'])test('no signature after '+error,async()=>{const env=environment({authError:error});const r=await call(env,'missions');assert.ok(!r.ok);assert.equal(env.seen.length,0);});
test('read signed with no forwarding of cookies or old authority',async()=>{const e=environment();const r=await call(e,'missions');assert.equal(r.status,200);assert.equal(e.seen.length,1);assert.deepEqual(Object.keys(e.seen[0].headers).sort(),['accept','content-type','x-mission-authority']);assert.match(r.headers.get('cache-control'),/no-store/);});
test('closed configuration makes no request',async()=>{const e=environment();e.deps.configured=false;assert.equal((await call(e,'missions')).status,503);assert.equal(e.seen.length,0);});
for(const [name,body,headers] of [['forged actor',{requestId:'one',objective:'Lire',actor:{subject:owner}},{}],['cross origin',{requestId:'one',objective:'Lire'},{origin:'https://hostile.invalid'}],['duplicate authority',{requestId:'one',objective:'Lire'},{'x-mission-authority':'one,two'}]])test(name+' refused before signing',async()=>{const e=environment();assert.ok(!(await call(e,'missions',body,headers)).ok);assert.equal(e.seen.length,0);});
test('late response cleared when session changed',async()=>{const e=environment({changed:true});const r=await call(e,'missions');assert.equal(r.status,401);assert.ok(!JSON.stringify(await r.json()).includes('Lire le robot'));});
test('lost create retries the same request and objective, with a fresh nonce',async()=>{const e=environment({transport:async(url,init,seen,m)=>{if(seen.length===1)throw Error('lost');return Response.json({mission:m,replay:true});}});const body={requestId:'same-id',objective:'  Lire le robot  '};assert.equal((await call(e,'missions',body)).status,200);assert.equal(e.seen.length,2);assert.equal(e.seen[0].body,e.seen[1].body);assert.equal(e.nonces.size,2);assert.equal(JSON.parse(e.seen[0].body).objective,body.objective);});
test('lost command is never retried',async()=>{const e=environment({transport:async()=>{throw Error('lost');}});const r=await call(e,'missions/mission-one/commands',{type:'pause'});assert.equal(r.status,409);assert.equal((await r.json()).code,'outcome_unknown');assert.equal(e.seen.length,1);});
test('action exact hash required, changed card cannot approve',async()=>{const e=environment();const r=await call(e,`missions/mission-one/actions/${e.action.id}/approve`,{manifestHash:'0'.repeat(64)});assert.equal(r.status,409);assert.equal(e.seen.filter(v=>v.url.endsWith('/approve')).length,0);});
test('approval response never proves execution',async()=>{const e=environment();const r=await call(e,`missions/mission-one/actions/${e.action.id}/approve`,{manifestHash:e.action.manifestHash});assert.equal(r.status,200);assert.equal((await r.json()).execution,'not_confirmed');});
test('card refuses expiry, changed version, transfer and consumed approval',()=>{const m=makeMission(),a=makeAction();assert.equal(canApproveAction(a,m),true);assert.equal(canApproveAction(a,m,actionDeadline(a)),false);assert.equal(canApproveAction(a,{...m,planVersion:2}),false);assert.equal(canApproveAction({...a,manifest:{...a.manifest,operation:'transfer'}},m),false);assert.equal(canApproveAction({...a,approval:{approvedAt:new Date().toISOString(),expiresAt:a.expiresAt,revokedAt:null,consumedAt:new Date().toISOString()}},m),false);});
test('Telegram delivery is authenticated, signed and read only',async()=>{const delivery={state:'sent',updatedAt:new Date().toISOString(),lastMessageId:123,matchesCurrentMission:true};const e=environment({transport:async(url,init)=>{assert.equal(init.method,'GET');assert.ok(url.endsWith('/telegram-delivery'));return Response.json({delivery});}});const r=await call(e,'missions/mission-one/telegram-delivery');assert.equal(r.status,200);assert.deepEqual((await r.json()).delivery,delivery);assert.equal(e.seen.length,1);});
test('Telegram projection cannot include raw messages or claim inconsistent success',async()=>{for(const delivery of [{state:'unknown',updatedAt:new Date().toISOString(),lastMessageId:123,matchesCurrentMission:true},{state:'sent',updatedAt:new Date().toISOString(),lastMessageId:123,matchesCurrentMission:true,text:'private raw receipt'}]){const e=environment({transport:async()=>Response.json({delivery})});assert.equal((await call(e,'missions/mission-one/telegram-delivery')).status,503);}});
const {telegramDeliveryLabel}=load('components/founder/telegramDelivery.ts');
test('only current sent Telegram state is confirmed, without human read claim',()=>{const d={state:'sent',lastMessageId:123,updatedAt:new Date().toISOString(),matchesCurrentMission:true};assert.equal(telegramDeliveryLabel(d),'Réponse Telegram confirmée.');assert.match(telegramDeliveryLabel({...d,matchesCurrentMission:false}),/mise à jour attendue/);assert.match(telegramDeliveryLabel({...d,state:'unknown',matchesCurrentMission:false}),/vérifier/);assert.match(telegramDeliveryLabel(null),/indisponible/);});
test('malformed JSON receives request refusal without signing',async()=>{const e=environment();const r=await handleFounderRequest(new Request('https://partners.foreas.xyz/api/founder/missions',{method:'POST',headers:{'x-foreas-founder':'1',origin:'https://partners.foreas.xyz','content-type':'application/json'},body:'{broken'}),['missions'],e.deps);assert.equal(r.status,400);assert.equal(e.seen.length,0);});

test('consumed approval and mismatched current step cannot be approved',()=>{const a=makeAction(),m=makeMission();assert.equal(canApproveAction(a,{...m,steps:[{...m.steps[0],capability:'stripe.balance.read'}]}),false);assert.equal(canApproveAction({...a,approval:{approvedAt:new Date().toISOString(),expiresAt:a.expiresAt,revokedAt:new Date().toISOString(),consumedAt:new Date().toISOString()}},m),false);});
const {codeFixture}=require('./code.fixture.cjs');
function codeEnvironment(o={}){
 const f=codeFixture();let read=false;
 const e=environment({transport:async(url,init,seen)=>{
  if(url.endsWith('/code-review')){read=true;return o.reviewResponse?o.reviewResponse(f,seen):Response.json({review:f.review});}
  return Response.json({mission:o.mission||f.mission});
 }});
 e.deps.codeReviewEnabled=o.enabled!==false;
 const auth=e.deps.authenticate;e.deps.authenticate=async s=>{if(read&&o.revoke)throw new FounderAccessError('forbidden');return auth(s);};
 return {...e,...f,path:'missions/mission-private/plans/1/steps/correction-code/code-review'};
}
test('code review closed does not contact brain',async()=>{const e=codeEnvironment({enabled:false});const r=await call(e,e.path);assert.equal(r.status,503);assert.equal((await r.json()).code,'code_review_closed');assert.equal(e.seen.length,0);});
test('exact protected code review is read only and not stored in response caches',async()=>{const e=codeEnvironment();const r=await call(e,e.path);assert.equal(r.status,200);assert.deepEqual((await r.json()).review,e.review);assert.match(r.headers.get('cache-control'),/no-store/);assert.ok(e.seen.every(c=>c.body===undefined));assert.ok(e.seen.filter(c=>c.url.endsWith('/code-review')).length===1);});
test('code review absent remains absent, not completed',async()=>{const e=codeEnvironment({reviewResponse:()=>Response.json({review:null})});const r=await call(e,e.path);assert.equal(r.status,200);assert.deepEqual(await r.json(),{review:null});});
test('role revoked during code lookup prevents disclosure',async()=>{const e=codeEnvironment({revoke:true});const r=await call(e,e.path);assert.equal(r.status,403);assert.ok(!JSON.stringify(await r.json()).includes('export const'));});
test('old source version is refused before private read',async()=>{const e=codeEnvironment({mission:{...codeFixture().mission,planVersion:2}});const r=await call(e,e.path);assert.equal(r.status,409);assert.equal((await r.json()).code,'code_review_changed');assert.equal(e.seen.filter(c=>c.url.endsWith('/code-review')).length,0);});
test('upstream revocation stays a refusal rather than an empty dossier',async()=>{const e=codeEnvironment({reviewResponse:()=>Response.json({error:'code_review_access_revoked'},{status:403})});const r=await call(e,e.path);assert.equal(r.status,403);assert.equal(e.seen.filter(c=>c.url.endsWith('/code-review')).length,1);});
for(const [name,mutate] of [
 ['foreign owner',r=>r.ownerId='other-owner'],['wrong coordinates',r=>r.stepId='other-step'],['source tampering',r=>r.artifact.changes[0].beforeContent='tampered'],
 ['failed check',r=>r.artifact.verification.checks[0].exitCode=1],['worker key',r=>r.workerSecret='private-key'],['applied claim',r=>r.artifact.applied=true],
 ['raw script hash',r=>r.artifactHash='0'.repeat(64)]
])test('private review rejects '+name+' without partial result or retry',async()=>{
 const e=codeEnvironment({reviewResponse:f=>{const r=structuredClone(f.review);mutate(r);return Response.json({review:r});}});
 const res=await call(e,e.path);assert.equal(res.status,503);const v=await res.json();assert.equal(v.code,'code_review_unverified');assert.ok(!('review' in v));assert.equal(e.seen.filter(c=>c.url.endsWith('/code-review')).length,1);
});
test('paused and cancelled dossiers remain readable without automatic resume',async()=>{
 for(const jobState of ['paused','cancelled']){const e=codeEnvironment({reviewResponse:f=>Response.json({review:{...f.review,jobState}})});const r=await call(e,e.path);assert.equal(r.status,200);assert.equal((await r.json()).review.jobState,jobState);assert.ok(e.seen.every(c=>c.body===undefined));}
});
test('only retry a lost code read, same coordinates, fresh signature',async()=>{
 let n=0;const e=codeEnvironment({reviewResponse:f=>{if(!n++)throw Error('lost');return Response.json({review:f.review});}});
 assert.equal((await call(e,e.path)).status,200);const seen=e.seen.filter(c=>c.url.endsWith('/code-review'));assert.equal(seen.length,2);assert.equal(seen[0].url,seen[1].url);assert.notEqual(seen[0].headers['x-mission-authority'],seen[1].headers['x-mission-authority']);
});
test('code preparation uses the policy hash contract, not the displayed resource hash',async()=>{
 const f=codeFixture(),scope=f.scope;assert.notEqual(hash(scope.resources),scope.scopeHash);
 const e=environment({transport:async()=>Response.json({scopes:{'code.change.prepare':scope},grants:[]})});
 const r=await call(e,'access');assert.equal(r.status,200);assert.equal((await r.json()).scopes['code.change.prepare'].scopeHash,scope.scopeHash);
});
test('code preparation refuses increased trials and modified files under the same hash',async()=>{
 for(const modify of [r=>r.maxModelCallsPerJob=4,r=>r.editablePaths.push('other.ts')]){
  const f=codeFixture();modify(f.scope.resources);
  const e=environment({transport:async()=>Response.json({scopes:{'code.change.prepare':f.scope},grants:[]})});
  assert.equal((await call(e,'access')).status,503);
 }
});

test('canonical founder identity rejects any different owner before reading Auth',async()=>{
 for(const wrong of [{subject:owner,ownerId:'foreas-founder-pending'},{subject:owner,ownerId:other},{subject:other,ownerId:owner}]){
  const f=fixture();await assert.rejects(authenticateFounder(f.client,wrong,300000,()=>now),e=>e.code==='configuration');assert.equal(f.calls.length,0);
 }
 const f=fixture(),proof=await authenticateFounder(f.client,identity,300000,()=>now);assert.equal(proof.actor.subject,owner);assert.equal(proof.actor.ownerId,owner);
});
test('configuration fixes the shared founder and stays closed on an absent or different owner',()=>{
 const {founderConfiguration}=load('lib/founder/config.ts',{'server-only':{}});
 const env={BRAS_DROIT_OWNER_ID:owner,BRAS_DROIT_ADMIN_SUBJECT:owner,BRAS_DROIT_AUDIENCE:'fixture-audience',FOREAS_FOUNDER_BRAIN_ORIGIN:'https://brain.fixture.invalid',BRAS_DROIT_ADMIN_HMAC:'fixture-never-sent',
  FOREAS_FOUNDER_MISSIONS_ENABLED:'true',FOREAS_FOUNDER_APPROVAL_ENABLED:'true',FOREAS_FOUNDER_PAYOUT_ENABLED:'true',FOREAS_FOUNDER_CODE_REVIEW_ENABLED:'true'};
 const good=founderConfiguration(env);assert.equal(good.configured,true);assert.equal(good.identity.ownerId,owner);assert.equal(good.authority.ownerId,owner);assert.equal(good.authority.gateways.admin.subject,owner);
 for(const change of [{BRAS_DROIT_OWNER_ID:undefined},{BRAS_DROIT_OWNER_ID:'foreas-founder-pending'},{BRAS_DROIT_OWNER_ID:other},{BRAS_DROIT_ADMIN_SUBJECT:other},{BRAS_DROIT_OWNER_ID:owner+' '}]){
  const c=founderConfiguration({...env,...change});assert.equal(c.configured,false);assert.equal(c.sensitiveEnabled,false);assert.equal(c.payoutEnabled,false);assert.equal(c.codeReviewEnabled,false);assert.deepEqual(c.identity,{subject:owner,ownerId:owner});
 }
});
