import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../../app/api/partner-data/action/route.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function route(){
  const requests=[];const module={exports:{}};
  const mocks={
    'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},
    '@/lib/partner/server':{backendOrigin:()=> 'https://test.invalid',partnerSession:async()=> 'synthetic-access',partnerViewer:async()=> 'viewer-B'},
  };
  vm.runInNewContext(js,{module,exports:module.exports,require:name=>{if(!(name in mocks))throw Error('Forbidden import');return mocks[name]},AbortSignal,
    fetch:async(url,options)=>{requests.push({url,options});return {status:200,json:async()=>({contract_version:'partner.v1',data:{ok:true}})}}});
  const request=(viewer,body={action:'activate'},origin='https://portal.invalid')=>({nextUrl:{origin:'https://portal.invalid'},headers:new Headers({'origin':origin,...(viewer?{'X-Foreas-Viewer':viewer}:{})}),json:async()=>body});
  return {POST:module.exports.POST,request,requests};
}
test('une action d’un ancien compte est refusée avant tout effet métier',async()=>{
  const h=route();const r=await h.POST(h.request('viewer-A'));assert.equal(r.status,409);assert.equal(r.body.error.code,'IDENTITY_CONFLICT');assert.equal(h.requests.length,0);
});
test('une action sans identité d’écran ne passe pas par défaut',async()=>{
  const h=route();assert.equal((await h.POST(h.request(null))).status,409);assert.equal(h.requests.length,0);
});
test('le navigateur ne peut pas choisir un dossier dans le corps de l’action',async()=>{
  const h=route();assert.equal((await h.POST(h.request('viewer-B',{action:'activate',partner_id:'other'}))).status,400);assert.equal(h.requests.length,0);
});
test('la session courante seule porte l’action et sa réponse',async()=>{
  const h=route();const r=await h.POST(h.request('viewer-B'));assert.equal(r.status,200);assert.equal(r.body.viewer_id,'viewer-B');assert.equal(h.requests.length,1);
  assert.equal(h.requests[0].url,'https://test.invalid/api/partner/activate');assert.equal(h.requests[0].options.body,'{}');assert.equal(h.requests[0].options.headers.Authorization,'Bearer synthetic-access');
});
