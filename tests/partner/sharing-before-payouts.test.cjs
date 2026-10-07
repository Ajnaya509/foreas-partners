const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const user={id:'owner',email:'owner@example.test',email_confirmed_at:'2026-10-01'};
const agreement={user_id:'owner',partner_id:'partner',name:'Chandler',mode:'live',status:'ready',accepted_at:'2026-10-01',terms_version:'FOREAS_PARTNER_2026_09_24',connect_state:'incomplete',stripe_account_id:null};
function server(enrollment=agreement,partner={status:'active',referral_code:'FE123'}){
  const calls=[];
  const db={from(table){const result=table==='partner_enrollments'?enrollment:partner;const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:result,error:null}),single:async()=>({data:result,error:null})};return q;},rpc:async(name,args)=>{calls.push({name,args});return {data:{conditional:0,eligible:0,referrals:0,items:[]},error:null};}};
  const filename=path.join(root,'lib/partner-enrollment/server.ts');
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  const mocks={'server-only':{},'@supabase/supabase-js':{createClient:()=>db},'@/lib/supabase/server':{},'./policy':{ENROLLMENT_POLICY:'FOREAS_PARTNER_2026_09_24',TERMS:'Agreement'}};
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(id=>id in mocks?mocks[id]:require(id),mod,mod.exports);
  return {...mod.exports,calls};
}
const previous={...process.env};
const config={PARTNER_ENROLLMENT_ENABLED:'true',PARTNER_ENROLLMENT_MODE:'live',NEXT_PUBLIC_SUPABASE_URL:'https://fihvdvlhftcxhlnocqiq.supabase.co',SUPABASE_SECRET_KEY:'test-only',PARTNER_ENROLLMENT_REFERRAL_READY:'true'};
Object.assign(process.env,config);
test.after(()=>{for(const key of Object.keys(config)){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}});
test('an accepted active partner shares before Stripe is complete',async()=>{
  const result=await server().getState(user);
  assert.equal(result.ready,true);assert.equal(result.payoutsReady,false);
  assert.equal(result.link,'https://www.foreas.xyz/r/FE123');
  assert.equal(result.enrollment.connect_state,'incomplete');
});
test('payout readiness stays separate from sharing readiness',async()=>{
  const result=await server({...agreement,connect_state:'ready'}).getState(user);
  assert.equal(result.ready,true);assert.equal(result.payoutsReady,true);
});
test('missing agreement, a paused enrollment or an inactive partner never reveals a link',async()=>{
  for(const [e,p] of [[{...agreement,accepted_at:null},{status:'active',referral_code:'FE123'}],[{...agreement,status:'paused'},{status:'active',referral_code:'FE123'}],[agreement,{status:'pending',referral_code:'FE123'}]]){
    const result=await server(e,p).getState(user);assert.equal(result.ready,false);assert.equal(result.payoutsReady,false);assert.equal(result.link,null);
  }
});
test('opening sharing checks an existing current agreement and never calls Stripe',async()=>{
  const s=server();await s.activateSharing(user);
  assert.equal(s.calls[0].name,'partner_enrollment_activate');
  for(const e of [{...agreement,accepted_at:null},{...agreement,terms_version:'old'},{...agreement,status:'paused'}]){
    const guarded=server(e);await assert.rejects(guarded.activateSharing(user),/CONDITIONS_REQUIRED/);assert.equal(guarded.calls.length,0);
  }
});
