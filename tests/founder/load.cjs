const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
exports.load=function load(file,overrides={},cache=new Map()){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);
 const normal=m.require.bind(m);m.require=id=>{
  if(Object.hasOwn(overrides,id))return overrides[id];
  const base=id.startsWith('@/')?path.resolve(id.slice(2)):id.startsWith('.')?path.resolve(path.dirname(file),id):null;
  if(base){if(fs.existsSync(base+'.ts'))return load(base+'.ts',overrides,cache);if(fs.existsSync(base+'.tsx'))return load(base+'.tsx',overrides,cache);}
  return normal(id);
 };
 const source=fs.readFileSync(file,'utf8');m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;
};
