const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {act,create}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
function component(file,mocks){
  const output=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInThisContext('(function(require,module,exports){'+output+'\n})', {filename:file})(id=>id in mocks?mocks[id]:require(id),module,module.exports);
  return module.exports;
}
const mocks={
  'next/link':({children,...props})=>React.createElement('a',props,children),
  './EnrollmentFrame':{EnrollmentFrame:({children})=>React.createElement('main',null,children)},
};
const {ConfirmEmail}=component('components/partner-enrollment/ConfirmEmail.tsx',mocks);
test('confirmation needs a click and opens a fresh signed-in document after success',async()=>{
  const original={window:global.window,fetch:global.fetch};const requests=[],navigations=[];
  global.window={history:{replaceState(){}},location:{replace:url=>navigations.push(url)}};
  global.fetch=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({confirmed:true})};};
  let view;
  try{
    await act(async()=>{view=create(React.createElement(ConfirmEmail,{hash:'a'.repeat(64),type:'magiclink'}));});
    assert.equal(requests.length,0,'Email scanning or simply opening the page cannot consume the link');
    await act(async()=>{await view.root.findByType('button').props.onClick();});
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,'/api/partner-enrollment/confirm');
    assert.equal(requests[0].body.hash,'a'.repeat(64));
    assert.deepEqual(navigations,['/inscription?email=confirme']);
    assert.equal(view.root.findByProps({className:'enrollment-primary'}).props.href,'/inscription?email=confirme','A direct continuation remains available if navigation is delayed');
  }finally{if(view)await act(async()=>view.unmount());Object.assign(global,original);}
});
test('a rejected confirmation keeps the visitor on the page with a recovery action',async()=>{
  const original={window:global.window,fetch:global.fetch};let navigated=false;
  global.window={history:{replaceState(){}},location:{replace:()=>{navigated=true;}}};
  global.fetch=async()=>({ok:false,json:async()=>({error:'Ce lien a expiré.'})});
  let view;
  try{
    await act(async()=>{view=create(React.createElement(ConfirmEmail,{hash:'a'.repeat(64),type:'magiclink'}));});
    await act(async()=>{await view.root.findByType('button').props.onClick();});
    assert.equal(navigated,false);
    assert.equal(view.root.findByProps({role:'alert'}).children.join(''),'Ce lien a expiré.');
    assert.equal(view.root.findByType('button').props.disabled,false);
  }finally{if(view)await act(async()=>view.unmount());Object.assign(global,original);}
});
test('an existing partner can change accounts without modifying the existing partner',async()=>{
  const original={window:global.window,fetch:global.fetch};let posts=0,localSignOut=0,redirect;
  global.window={setTimeout,location:{replace:url=>{redirect=url;},search:''}};
  global.fetch=async(_url,options)=>{if(options?.method==='POST')posts++;return {ok:true,json:async()=>({signedIn:true,userId:'old-partner',legacy:true,email:'existing@example.test'})};};
  const {EnrollmentForm}=component('components/partner-enrollment/EnrollmentForm.tsx',{
    ...mocks,'@/lib/partner-enrollment/policy':{PROFILES:[],TERMS:'',ENROLLMENT_POLICY:'test'},
    '@/lib/supabase/client':{createClient:()=>({auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async options=>{assert.equal(options.scope,'local');localSignOut++;return {error:null};}}})},
  });
  let view;
  try{
    await act(async()=>{view=create(React.createElement(EnrollmentForm,{termsHash:'unused'}));});
    const button=view.root.findAllByType('button').find(item=>item.children.includes('Changer de compte'));
    assert.ok(button);
    await act(async()=>{await button.props.onClick();});
    assert.equal(localSignOut,1);assert.equal(posts,0);assert.equal(redirect,'/inscription');
  }finally{if(view)await act(async()=>view.unmount());Object.assign(global,original);}
});
