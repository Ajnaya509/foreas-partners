const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function source(file,mocks={}){
  const filename=path.join(root,file);
  const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  const localRequire=id=>id==='server-only'?{}:id in mocks?mocks[id]:id.startsWith('.')?source(path.relative(root,path.resolve(path.dirname(filename),id))+'.ts',mocks):require(id);
  vm.runInThisContext('(function(require,module,exports){'+output+'\n})',{filename})(localRequire,module,module.exports);
  return module.exports;
}
const policy=source('lib/partner-enrollment/policy.ts');
const base={PARTNER_ENROLLMENT_ENABLED:'true',PARTNER_ENROLLMENT_MODE:'live',NEXT_PUBLIC_SUPABASE_URL:'https://fihvdvlhftcxhlnocqiq.supabase.co',PARTNER_ENROLLMENT_ORIGIN:'https://partners.foreas.xyz',RESEND_API_KEY:'test-only-not-a-real-key',PARTNER_ENROLLMENT_ADMIN_EMAIL:'owner@example.test'};
const before={...process.env};
test.after(()=>{for(const k of Object.keys(base))if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];});
Object.assign(process.env,base);
const server=source('lib/partner-enrollment/server.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'confirmed',email_confirmed_at:null,user_metadata:{partner:true}}},error:null})}})},'@supabase/supabase-js':{createClient:()=>{throw new Error('No external database in this test');}}});
test('new partner policy is 10 EUR and waits for the second paid month',()=>{
  assert.equal(policy.MONTHLY_COMMISSION_CENTS,1000);
  assert.match(policy.TERMS,/Sans deuxième mois payé, le premier mois n’est pas payable/);
  assert.match(policy.TERMS,/20 € admissibles/);
  assert.match(policy.TERMS,/arrêter de participer à tout moment/);
  assert.equal(server.termsHash().length,64);
});
test('test credentials cannot activate new partners on the production database',()=>{
  process.env.PARTNER_ENROLLMENT_MODE='test';
  assert.throws(()=>server.settings(),/PROGRAMME_NOT_OPEN/);
  process.env.PARTNER_ENROLLMENT_MODE='live';
  process.env.PARTNER_ENROLLMENT_ORIGIN='https://partners.foreas.xyz.attacker.invalid/';
  assert.throws(()=>server.settings(),/PROGRAMME_NOT_OPEN/);
  process.env.PARTNER_ENROLLMENT_ORIGIN=base.PARTNER_ENROLLMENT_ORIGIN;
});
test('user-editable metadata cannot replace email verification',async()=>{
  await assert.rejects(server.currentUser(),/EMAIL_UNCONFIRMED/);
});
test('Stripe return and submitted details alone never mean ready',()=>{
  assert.equal(server.connectStatus({details_submitted:true,payouts_enabled:true,capabilities:{transfers:'pending'},requirements:{}}),'incomplete');
  assert.equal(server.connectStatus({details_submitted:true,payouts_enabled:true,capabilities:{transfers:'active'},requirements:{currently_due:['individual.verification.document']}}),'incomplete');
  assert.equal(server.connectStatus({details_submitted:true,payouts_enabled:true,capabilities:{transfers:'active'},requirements:{pending_verification:['individual']}}),'pending');
  assert.equal(server.connectStatus({details_submitted:true,payouts_enabled:true,capabilities:{transfers:'active'},requirements:{}}),'ready');
});
test('email uses the official logo, escapes profile text and never invents a password',()=>{
  const mail=source('lib/partner-enrollment/mail.ts',{'./server':server});
  const result=mail.brandedMail('new@example.test','Bienvenue','Bonjour <img src=x>',['Ton code : FE123'],{label:'Mon espace',url:'https://partners.foreas.xyz/partner'});
  assert.match(result.html,/email\/foreas-noir\.png/);
  assert.match(result.html,/&lt;img src=x&gt;/);
  assert.doesNotMatch(result.html,/<img src=x>/);
  assert.match(result.text,/Ton code : FE123/);
  assert.doesNotMatch(result.text,/mot de passe temporaire/i);
});
