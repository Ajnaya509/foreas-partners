// La fonction partenaire actuelle est exécutée. Seuls ses accès externes sont simulés.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function fixture({status=200,body={ok:true,status:'rejected'},admin=true,throws=false}={}){
  const requests=[], refreshed=[];const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/(admin)/admin/partner-pending/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    module,exports:module.exports,AbortSignal,
    require:name=>{
      if(name==='@/lib/queries/admin')return {isCurrentUserAdmin:async()=>admin};
      if(name==='@/lib/partner/server')return {backendOrigin:()=> 'https://fictif.invalid',partnerSession:async()=> 'session-fictive'};
      if(name==='@/lib/partner/admission')return {parseAdmission:()=>{throw Error('Autre fonction hors test');}};
      if(name==='next/cache')return {revalidatePath:path=>refreshed.push(path)};
      throw Error('Dépendance non simulée');
    },
    fetch:async(url,options)=>{requests.push({url,options});if(throws)throw Error('panne fictive');return {status,json:async()=>body};},
  });
  return {...module.exports,requests,refreshed};
}
for(const [name,options] of [
  ['lecture serveur échouée',{throws:true}],
  ['réponse serveur en échec',{status:500}],
  ['réponse seulement acceptée',{status:202}],
  ['succès non confirmé',{body:{ok:false,status:'rejected'}}],
  ['statut absent',{body:{ok:true}}],
  ['statut différent',{body:{ok:true,status:'pending'}}],
  ['corps absent',{body:null}],
])test(`refus partenaire actuel : ${name} ne produit aucun faux succès`,async()=>{
  const f=fixture(options);assert.equal((await f.rejectApplication('application-fictive')).ok,false);assert.equal(f.refreshed.length,0);
});
test('refus partenaire actuel : confirmation explicite conserve le nouveau service et ses trois actualisations',async()=>{
  const f=fixture();assert.equal((await f.rejectApplication('application/fictive')).ok,true);
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'https://fictif.invalid/api/admin/partner-applications/application%2Ffictive/reject');
  assert.equal(f.requests[0].options.method,'POST');assert.equal(f.refreshed.length,3);
});
test('refus partenaire actuel : garde fermée interdit tout appel serveur',async()=>{
  const f=fixture({admin:false});assert.equal((await f.rejectApplication('application-fictive')).ok,false);assert.equal(f.requests.length,0);assert.equal(f.refreshed.length,0);
});
test('refus partenaire actuel : identifiant invalide interdit tout appel serveur',async()=>{
  const f=fixture();assert.equal((await f.rejectApplication('')).ok,false);assert.equal(f.requests.length,0);
});
