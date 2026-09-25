const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),pkg=createRequire(path.join(root,'package.json')),ts=pkg('typescript'),React=pkg('react'),renderer=pkg('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
const A='11111111-1111-4111-8111-111111111111',D='dddddddd-dddd-4ddd-8ddd-dddddddddddd',B='22222222-2222-4222-8222-222222222222';
const profile={id:D,auth_user_id:A,first_name:'Personne',last_name:'Fictive',referral_code:'FOREAS-TEST',referral_code_new:null};
function harness(){
 let user={id:A},authError=null,row={data:{...profile},error:null},observer,verification=null,copyWork=null;
 const reads=[],copies=[],events={refresh:0,unsub:0};const browser={auth:{
 getUser:async()=>verification?await verification:{data:{user},error:authError},
 onAuthStateChange:cb=>{observer=cb;return{data:{subscription:{unsubscribe(){events.unsub++;observer=undefined}}}}}
 }};
 const server={auth:{getUser:async()=>({data:{user},error:authError})},from:table=>{
  const query={table,select:null,filters:[]};reads.push(query);return{select(value){query.select=value;return this},eq(key,value){query.filters.push([key,value]);return this},async maybeSingle(){return row}};
 }};
 const mocks={'server-only':{},react:{...React,cache:fn=>fn},'react/jsx-runtime':pkg('react/jsx-runtime'),zod:pkg('zod'),
 'lucide-react':{Copy:()=>null,MessageCircle:()=>null},
 'next/navigation':{useRouter:()=>({refresh(){events.refresh++}}),redirect:to=>{throw Error('REDIRECT '+to)}},
 '@/lib/supabase/server':{createClient:async()=>server},'@/lib/supabase/client':{createClient:()=>browser}};
 const modules=new Map();
 function load(rel){let filename=path.join(root,rel);if(!fs.existsSync(filename))filename=['.ts','.tsx'].map(ext=>filename+ext).find(fs.existsSync);if(!filename)throw Error('MISSING '+rel);if(modules.has(filename))return modules.get(filename);
 const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{module:m,exports:m.exports,require:name=>{
 if(name in mocks)return mocks[name];if(name.startsWith('@/'))return load(name.slice(2));if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(filename),name)));throw Error('FORBIDDEN '+name);
 },console,URL,encodeURIComponent,navigator:{clipboard:{writeText:async text=>{copies.push(text);if(copyWork)await copyWork}}}} ,{filename});
 modules.set(filename,m.exports);return m.exports;}
 return{load,reads,copies,events,setUser:v=>user=v,setAuthError:e=>authError=e,setRow:r=>row=r,setVerification:v=>verification=v,setCopyWork:v=>copyWork=v,
 emit:(id,event='SIGNED_IN')=>observer?.(event,id?{user:{id}}:null)};
}
async function mount(h,props={viewerId:A,code:'FOREAS-TEST'},strict=false){
 const Panel=h.load('components/driver/ReferralPanel.tsx').DriverReferralPanel;let tree;
 await renderer.act(async()=>{tree=renderer.create(strict?React.createElement(React.StrictMode,null,React.createElement(Panel,props)):React.createElement(Panel,props));});
 return{tree,Panel,close:()=>renderer.act(async()=>tree.unmount())};
}
const output=tree=>JSON.stringify(tree.toJSON());
const button=(tree,label)=>tree.root.findAllByType('button').find(b=>b.children.filter(x=>typeof x==='string').join('').includes(label));
test('le profil est relié par auth_user_id, jamais par égalité des deux identifiants',async()=>{
 const h=harness(),r=await h.load('lib/driver/referral-server.ts').getDriverReferralContext();
 assert.equal(r.status,'ready');assert.equal(r.profile.id,D);assert.equal(r.viewerId,A);
 assert.deepEqual(h.reads[0].filters,[['auth_user_id',A]]);
 assert.doesNotMatch(h.reads[0].select,/earnings|total_|stripe|email|\*/);
});
test('absence ou erreur Auth ne lit aucun chauffeur',async()=>{
 for(const fail of ['absent','erreur']){const h=harness();if(fail==='absent')h.setUser(null);else h.setAuthError({message:'indisponible'});
 assert.equal((await h.load('lib/driver/referral-server.ts').getDriverReferralContext()).code,'AUTH_REQUIRED');assert.equal(h.reads.length,0);}
});
test('profil absent, refusé, incomplet ou appartenant à B reste indisponible',async()=>{
 for(const row of [{data:null,error:null},{data:profile,error:{message:'refus'}},{data:{...profile,auth_user_id:B},error:null},{data:{id:D},error:null}]){
 const h=harness();h.setRow(row);assert.equal((await h.load('lib/driver/referral-server.ts').getDriverReferralContext()).code,'PROFILE_UNAVAILABLE');}
});
test('normalisation du vrai code sans remplacement inventé',()=>{
 const normalize=harness().load('lib/driver/referral.ts').driverReferralCode;
 assert.equal(normalize({...profile,referral_code:' foreas-test '}),'FOREAS-TEST');
 for(const code of [null,'','join','FOREAS','FOREAS-NEW','../../test','foreas?email=x','a'.repeat(33)])assert.equal(normalize({...profile,referral_code:code}),null);
 assert.equal(normalize({...profile,referral_code:null,referral_code_new:'FOREAS-SECOND'}),'FOREAS-SECOND');
});
test('page sans session redirige vers la bonne entrée chauffeur',async()=>{
 const h=harness();h.setUser(null);await assert.rejects(()=>h.load('app/(driver)/driver/parrainage/page.tsx').default(),/role=driver&next=%2Fdriver%2Fparrainage/);
});
test('page sans profil rend indisponible, sans faux lien ni zéro',async()=>{
 const h=harness();h.setRow({data:null,error:null});let tree;
 await renderer.act(async()=>{tree=renderer.create(await h.load('app/(driver)/driver/parrainage/page.tsx').default())});
 assert.match(output(tree),/parrainage est indisponible/);assert.doesNotMatch(output(tree),/FOREAS-NEW|\/r\/join|0,00/);
 await renderer.act(async()=>tree.unmount());
});
test('vérification initiale : le code privé n’apparaît pas avant réponse',async()=>{
 const h=harness();let resolve;h.setVerification(new Promise(r=>resolve=r));const m=await mount(h);
 assert.doesNotMatch(output(m.tree),/FOREAS-TEST|wa\.me/);
 await renderer.act(async()=>resolve({data:{user:{id:A}},error:null}));
 assert.match(output(m.tree),/FOREAS-TEST/);await m.close();
});
test('compte B : aucune invitation du compte A affichée',async()=>{
 const h=harness();h.setUser({id:B});const m=await mount(h);
 assert.match(output(m.tree),/Reconnecte-toi/);assert.doesNotMatch(output(m.tree),/FOREAS-TEST|wa\.me/);await m.close();
});
test('copie réelle : succès seulement après résolution et une seule copie simultanée',async()=>{
 const h=harness();let resolve;h.setCopyWork(new Promise(r=>resolve=r));const m=await mount(h);
 const click=button(m.tree,'Copier mon lien').props.onClick;
 await renderer.act(async()=>{void click();void click()});assert.equal(h.copies.length,1);assert.doesNotMatch(output(m.tree),/Lien copié/);
 await renderer.act(async()=>resolve());assert.match(output(m.tree),/Lien copié/);
 assert.equal(h.copies[0],'https://www.foreas.xyz/r/FOREAS-TEST');await m.close();
});
test('copie refusée : aide à sélectionner le texte, pas de faux succès',async()=>{
 const h=harness();
 let reject;h.setCopyWork(new Promise((_,r)=>reject=r));const m=await mount(h);
 await renderer.act(async()=>{void button(m.tree,'Copier mon lien').props.onClick();reject(new Error('refus fictif'));});
 assert.match(output(m.tree),/copie a échoué/);assert.doesNotMatch(output(m.tree),/Lien copié/);await m.close();
});
test('déconnexion pendant copie : la réponse tardive ne réaffiche rien',async()=>{
 const h=harness();let resolve;h.setCopyWork(new Promise(r=>resolve=r));const m=await mount(h);
 await renderer.act(async()=>{void button(m.tree,'Copier mon lien').props.onClick();h.emit(null,'SIGNED_OUT')});
 await renderer.act(async()=>resolve());assert.match(output(m.tree),/Reconnecte-toi/);assert.doesNotMatch(output(m.tree),/Lien copié|FOREAS-TEST/);await m.close();
});
test('ancienne vérification après déconnexion ne restaure pas le code',async()=>{
 const h=harness();let resolve;h.setVerification(new Promise(r=>resolve=r));const m=await mount(h);
 await renderer.act(async()=>h.emit(null,'SIGNED_OUT'));
 await renderer.act(async()=>resolve({data:{user:{id:A}},error:null}));
 assert.doesNotMatch(output(m.tree),/FOREAS-TEST/);await m.close();
});
test('nouveau code remonte une nouvelle vue, ancien succès ignoré',async()=>{
 const h=harness();let resolve;h.setCopyWork(new Promise(r=>resolve=r));const m=await mount(h);
 await renderer.act(async()=>{void button(m.tree,'Copier mon lien').props.onClick();m.tree.update(React.createElement(m.Panel,{viewerId:A,code:'FOREAS-OTHER'}))});
 await renderer.act(async()=>resolve());assert.match(output(m.tree),/FOREAS-OTHER/);assert.doesNotMatch(output(m.tree),/Lien copié|FOREAS-TEST/);await m.close();
});
test('WhatsApp prépare le bon message sans ancien lien à bénéficiaire unique',async()=>{
 const h=harness(),m=await mount(h),link=m.tree.root.findAllByType('a').find(a=>a.props.href.startsWith('https://wa.me/'));
 const text=new URL(link.props.href).searchParams.get('text');assert.match(text,/https:\/\/www\.foreas\.xyz\/r\/FOREAS-TEST/);assert.match(text,/garde ce code/);assert.doesNotMatch(text,/\/pay\/|payment_link|10 €/);
 assert.equal(link.props.target,'_blank');assert.match(link.props.rel,/noopener/);await m.close();
});
test('code absent : pas de partage, actualisation utilisable',async()=>{
 const h=harness(),m=await mount(h,{viewerId:A,code:null});assert.doesNotMatch(output(m.tree),/wa\.me|Copier mon lien|\/r\/join/);
 await renderer.act(async()=>button(m.tree,'Actualiser mon parrainage').props.onClick());assert.equal(h.events.refresh,1);await m.close();
});
test('rémunération canonique ; relevé indisponible, jamais anciens compteurs',async()=>{
 const h=harness(),m=await mount(h);assert.match(output(m.tree),/5 € pour chaque mensualité/);assert.match(output(m.tree),/50 € une seule fois/);assert.match(output(m.tree),/relevé est indisponible/);
 assert.doesNotMatch(output(m.tree),/10€|4€|2€|N1|N2|N3|0,00|commissions à vie|4 paiements/);await m.close();
});
test('double montage de développement ne garde qu’un observateur actif',async()=>{
 const h=harness(),m=await mount(h,undefined,true);assert.match(output(m.tree),/FOREAS-TEST/);
 await renderer.act(async()=>h.emit(B));assert.doesNotMatch(output(m.tree),/FOREAS-TEST/);await m.close();assert.ok(h.events.unsub>=1);
});
