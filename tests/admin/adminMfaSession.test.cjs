const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto').webcrypto;
const ssr = require('@supabase/ssr');
const sdk = require('@supabase/supabase-js');
function load(file) {
  const module = {exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    module,exports:module.exports,require:n=>n==='@supabase/ssr'?ssr:n==='@supabase/supabase-js'?sdk:(()=>{throw Error(n)})(),
    Date,URL,crypto,AbortController,setTimeout,clearTimeout,
  });return module.exports;
}
const { createAdminMfaSession }=load('lib/admin-mfa-session.ts');
const { createAdminMfaFlow }=load('lib/admin-mfa-flow.ts');
const A='00000000-0000-4000-8000-000000000001', B='00000000-0000-4000-8000-000000000002';
const token=(id,aal)=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aal,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fictif'].join('.');
const user=id=>({id,aud:'authenticated',factors:[{id:'factor-local',status:'verified',factor_type:'totp'}]});
const session=(id,aal='aal1')=>({access_token:token(id,aal),refresh_token:`refresh-fictif-${id}`,expires_in:3600,token_type:'bearer',user:user(id)});
const response=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const claims=s=>JSON.parse(Buffer.from(s.access_token.split('.')[1],'base64url').toString());
function gate(){let release;return {promise:new Promise(r=>{release=r}),release:()=>release()};}
async function fixture({held=false,timeoutMs=15000,noUpgrade=false,seedFailOnce=false}={}) {
  const jar=new Map(), writes=[], requests=[], states=[];let complete=0;
  const barrier=gate();
  const cookiePort={read:()=>[...jar].map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('; '),write:value=>{
    writes.push(value);const [pair]=value.split(';');const i=pair.indexOf('=');const name=pair.slice(0,i),val=decodeURIComponent(pair.slice(i+1));
    if(/Max-Age=0(?:;|$)/i.test(value))jar.delete(name);else jar.set(name,val);
  }};
  const transportFetch=async (input,init={})=>{
    const url=String(input);requests.push(url);
    if(url.includes('/token?grant_type=password'))return response(session(JSON.parse(init.body).email==='b@example.invalid'?B:A));
    if(url.endsWith('/user')) {const t=new Headers(init.headers).get('authorization').replace('Bearer ','');return response(user(JSON.parse(Buffer.from(t.split('.')[1],'base64url')).sub));}
    if(url.includes('/logout')) return new Response(null,{status:204});
    if(url.endsWith('/challenge'))return response({id:'challenge-local'});
    if(url.endsWith('/verify')){if(held)await barrier.promise;return response(session(A,noUpgrade?'aal1':'aal2'));}
    throw Error('Réseau non simulé interdit');
  };
  const shared=ssr.createBrowserClient('https://local-proof.invalid','cle-publique-fictive',{
    isSingleton:false,cookieOptions:{domain:'.foreas.xyz',path:'/',sameSite:'lax',secure:true},
    global:{fetch:transportFetch},cookies:{getAll:()=>ssr.parseCookieHeader(cookiePort.read()),setAll:items=>items.forEach(c=>cookiePort.write(ssr.serializeCookieHeader(c.name,c.value,c.options)))},
  });
  await shared.auth.setSession(session(A));
  const ownerSession=await shared.auth.getSession();assert.equal(ownerSession.data.session.user.id,A);
  let seedRequests=0;
  const isolatedFetch = async (input, init) => {
    if (String(input).endsWith("/user")) {
      seedRequests++;
      if (seedFailOnce && seedRequests === 1) return new Response(JSON.stringify({message:"indisponible"}), {status:503,headers:{"content-type":"application/json"}});
    }
    return transportFetch(input, init);
  };
  const transport=createAdminMfaSession(shared,A,{url:'https://local-proof.invalid',key:'cle-publique-fictive',cookieDomain:'.foreas.xyz',cookies:cookiePort,fetch:isolatedFetch});
  // Chaque contrôle lit depuis de nouveaux cookies, comme une nouvelle requête serveur.
  const readServer=async()=>{
    const server=ssr.createServerClient('https://local-proof.invalid','cle-publique-fictive',{
      global:{fetch:transportFetch},cookies:{getAll:()=>ssr.parseCookieHeader(cookiePort.read()),setAll:()=>{throw Error('Le contrôle serveur ne doit pas écrire');}},
    });
    const s=(await server.auth.getSession()).data.session;
    if(!s)return {status:'unauthenticated',userId:null};
    const verified=await server.auth.getUser(s.access_token);
    return {status:verified.data.user?.id===A&&claims(s).aal==='aal2'?'allowed':'mfa_required',userId:verified.data.user?.id??null};
  };
  const run=createAdminMfaFlow(shared,A,readServer,s=>states.push(s),()=>complete++,transport,timeoutMs);
  await run.initialize();assert.equal(states.at(-1).phase,seedFailOnce?'loading':'code');
  return {shared,run,transport,cookiePort,jar,writes,requests,states,barrier,readServer,get complete(){return complete;},get seedRequests(){return seedRequests;}};
}
async function waitVerify(f){while(!f.requests.some(u=>u.endsWith('/verify')))await new Promise(r=>setImmediate(r));}

test('vrai SDK : la vérification isolée adopte aal2 lisible dans le client partagé et une nouvelle requête serveur',async()=>{
  const f=await fixture();const before=f.writes.length;await f.run.verify('123456');
  assert.equal(f.complete,1);assert.equal(f.states.at(-1).phase,'done');
  const s=(await f.shared.auth.getSession()).data.session;assert.equal(s.user.id,A);assert.equal(claims(s).aal,'aal2');assert.equal((await f.readServer()).status,'allowed');
  const adopted=f.writes.slice(before);assert.ok(adopted.length);for(const write of adopted){assert.match(write,/Domain=\.foreas.xyz/i);assert.match(write,/Path=\//i);assert.match(write,/Secure/i);assert.match(write,/SameSite=Lax/i);}
  f.run.dispose();
});
for(const change of ['account','logout','unmount','timeout','cookie_without_event'])test(`vrai SDK : ${change} interdit la persistance de verify A tardif`,async()=>{
  const f=await fixture({held:true,timeoutMs:change==='timeout'?20:15000});
  const pending=f.run.verify('123456');await waitVerify(f);
  if(change==='account')await f.shared.auth.signInWithPassword({email:'b@example.invalid',password:'fictif'});
  if(change==='logout') {await f.shared.auth.signOut({scope:'local'});}
  if(change==='unmount')f.run.dispose();
  if(change==='cookie_without_event') {const changed=ssr.createChunks('sb-local-proof-auth-token',`base64-${ssr.stringToBase64URL(JSON.stringify({...session(B),expires_at:Math.floor(Date.now()/1000)+3600}))}`);f.jar.clear();for(const c of changed)f.jar.set(c.name,c.value);}
  if(change==='timeout')await pending;
  const before=f.cookiePort.read(),writes=f.writes.length;
  f.barrier.release();await pending;await new Promise(r=>setImmediate(r));
  assert.equal(f.cookiePort.read(),before);assert.equal(f.writes.length,writes);assert.equal(f.complete,0);
  if(change==='account'||change==='cookie_without_event')assert.equal((await f.shared.auth.getSession()).data.session.user.id,B);
  f.run.dispose();
});

test('vrai SDK : A→B→A ne réarme jamais le parcours ni l’écriture finale',async()=>{
  const f=await fixture({held:true});const p=f.run.verify('123456');await waitVerify(f);
  await f.shared.auth.signInWithPassword({email:'b@example.invalid',password:'fictif'});await f.shared.auth.signInWithPassword({email:'a@example.invalid',password:'fictif'});
  const before=f.cookiePort.read();f.barrier.release();await p;assert.equal(f.cookiePort.read(),before);assert.equal(f.complete,0);assert.equal(claims((await f.shared.auth.getSession()).data.session).aal,'aal1');f.run.dispose();
});

test('vrai SDK : verify sans élévation aal2 conserve strictement les cookies initiaux',async()=>{
  const f=await fixture({noUpgrade:true}); const before=f.cookiePort.read(), writes=f.writes.length;
  await f.run.verify('123456'); assert.equal(f.complete,0); assert.equal(f.cookiePort.read(),before); assert.equal(f.writes.length,writes);
  assert.equal(claims((await f.shared.auth.getSession()).data.session).aal,'aal1'); f.run.dispose();
});

test('vrai SDK : une panne de préparation se réessaie avec un nouveau client privé',async()=>{
  const f=await fixture({seedFailOnce:true}); assert.ok(f.states.at(-1).error); assert.equal(f.seedRequests,1);
  await f.run.initialize(); assert.equal(f.states.at(-1).phase,'code'); assert.ok(f.seedRequests>1);
  await f.run.verify('123456'); assert.equal(f.complete,1); f.run.dispose();
});
