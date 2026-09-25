import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {appPassageLink} from '../../lib/partner/handoff.ts';
const key='aaaaaaaa-0000-0000-0000-000000000001';
test('le passage existant conserve exactement la clé complète pour l’app',()=>assert.equal(appPassageLink(key),`foreas://ajnaya?handoff=${key}`));
test('clé courte, absente, répétée ou adresse injectée refusées',()=>{
  for(const value of ['ABC123','',null,undefined,[key,key],'javascript:alert(1)',key+'?next=https://other.invalid'])assert.equal(appPassageLink(value),null);
});
test('lire la vraie page ne réclame aucun passage et ne prétend aucun succès',async()=>{
  const module={exports:{}};const jsx=(type,props)=>({type,props});
  const source=fs.readFileSync(new URL('../../app/handoff/claim/page.tsx',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mocks={'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'},'lucide-react':{ArrowRight:'arrow',Smartphone:'phone'},'@/components/foreas/ForeasLogo':{ForeasLogo:'logo'},'@/lib/partner/handoff':{appPassageLink}};
  let calls=0;
  vm.runInNewContext(js,{module,exports:module.exports,require:name=>{assert.ok(name in mocks,`Unexpected dependency ${name}`);return mocks[name]},fetch:()=>{calls++;throw Error('No network on read')}});
  const tree=await module.exports.default({searchParams:Promise.resolve({token:key})});
  const encoded=JSON.stringify(tree);assert.equal(calls,0);assert.ok(encoded.includes(`foreas://ajnaya?handoff=${key}`));assert.ok(encoded.includes('Aucun passage n’a été validé'));assert.ok(!encoded.includes('claim-handoff'));
  const invalid=JSON.stringify(await module.exports.default({searchParams:Promise.resolve({token:'ABC123'})}));assert.ok(!invalid.includes('foreas://'));assert.ok(invalid.includes('/login'));
});
