// Execute the actual TypeScript sources in the Node test runner, without changing
// production imports to satisfy Node's different module resolution rules.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),pkg=createRequire(path.join(root,'package.json')),ts=pkg('typescript');
function loadPartnerModule(entry){
 const modules=new Map();
 function load(file){
  const resolved=path.resolve(root,file);
  if(!resolved.startsWith(root+path.sep))throw Error('Source outside test project');
  const source=fs.existsSync(resolved)?resolved:['.ts','.tsx'].map(ext=>resolved+ext).find(fs.existsSync);
  if(!source)throw Error('Missing source: '+file);
  if(modules.has(source))return modules.get(source).exports;
  const module={exports:{}};modules.set(source,module);
  const result=ts.transpileModule(fs.readFileSync(source,'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('TypeScript syntax error in '+file);
  vm.runInNewContext(result.outputText,{module,exports:module.exports,require:name=>{
   if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(source),name)));
   if(name==='zod')return pkg(name);
   throw Error('Unapproved test import: '+name);
  },process,URL,URLSearchParams,Date,Intl,BigInt},{filename:source});
  return module.exports;
 }
 return load(entry);
}
module.exports={loadPartnerModule};
