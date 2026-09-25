const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Date, setTimeout, clearTimeout, AbortController,
    require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Dépendance non simulée : ${name}`); },
    fetch: () => { throw new Error('Réseau interdit'); },
  });
  return module.exports;
}
const { readAdminAccess } = load('lib/admin-access.ts');
const { createAdminMfaFlow } = load('lib/admin-mfa-flow.ts');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
function accessClient(options = {}) {
  const calls = [];
  const roles = options.roles ?? [{ user_id: owner, role: 'admin', is_active: true, revoked_at: null }];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: options.noSession ? null : { access_token: 'jeton-fictif' } }, error: options.sessionError }),
      getUser: async token => { calls.push(['getUser', token]); if (options.authThrows) throw new Error('indisponible'); return { data: { user: options.noUser ? null : { id: owner, email: 'fictif@example.test', user_metadata: { role: 'admin', aal: 'aal2' } } }, error: options.authError }; },
      getClaims: async token => { calls.push(['getClaims', token]); return { data: { claims: { sub: options.claimsOwner || owner, aal: options.aal ?? 'aal2' } }, error: options.claimsError }; },
    },
    from: table => {
      calls.push(['from', table]); const filters = [];
      const q = { select: () => q, eq: (k, v) => { filters.push([k, v]); return q; },
        in: (k, vs) => { filters.push([k, vs]); return q; }, is: (k, v) => { filters.push([k, v]); return q; },
        abortSignal: () => q, maybeSingle: async () => {
          const found = roles.filter(r => filters.every(([k, v]) => Array.isArray(v) ? v.includes(r[k]) : r[k] === v));
          return { data: found.length === 1 ? found[0] : null, error: options.roleError || (found.length > 1 ? new Error('ambigu') : null) };
        } };
      return q;
    },
  };
  return { client, calls };
}

for (const [name, options, status] of [
  ['session absente', { noSession: true }, 'unauthenticated'],
  ['session invalide', { authError: true }, 'unauthenticated'],
  ['compte supprimé', { noUser: true }, 'unauthenticated'],
  ['signature refusée', { claimsError: true }, 'unauthenticated'],
  ['sujet de signature différent', { claimsOwner: other }, 'unauthenticated'],
  ['service indisponible', { authThrows: true }, 'unavailable'],
  ['simple connexion', { aal: 'aal1' }, 'mfa_required'],
  ['second facteur confirmé', {}, 'allowed'],
  ['rôle absent', { roles: [] }, 'forbidden'],
  ['rôle autre compte', { roles: [{ user_id: other, role: 'admin', is_active: true, revoked_at: null }] }, 'forbidden'],
  ['rôle révoqué', { roles: [{ user_id: owner, role: 'admin', is_active: true, revoked_at: '2026-09-08' }] }, 'forbidden'],
  ['rôle inactif', { roles: [{ user_id: owner, role: 'admin', is_active: false, revoked_at: null }] }, 'forbidden'],
  ['lecture de rôle échouée', { roleError: true }, 'unavailable'],
  ['rôle technique system', { roles: [{ user_id: owner, role: 'system', is_active: true, revoked_at: null }] }, 'forbidden'],
  ['rôle ambigu', { roles: [{ user_id: owner, role: 'admin', is_active: true, revoked_at: null }, { user_id: owner, role: 'super_admin', is_active: true, revoked_at: null }] }, 'unavailable'],
]) test(`garde serveur : ${name}`, async () => { const c = accessClient(options); assert.equal((await readAdminAccess(c.client)).status, status); });

test('le même jeton est vérifié pour identité et assurance, jamais une métadonnée client', async () => {
  const c = accessClient({ aal: 'aal1' }); assert.equal((await readAdminAccess(c.client)).status, 'mfa_required');
  assert.deepEqual(c.calls.slice(0, 2), [['getUser', 'jeton-fictif'], ['getClaims', 'jeton-fictif']]);
});

test('isCurrentUserAdmin refuse les actions directes sans seconde vérification', async () => {
  const c = accessClient({ aal: 'aal1' });
  const queries = load('lib/queries/admin.ts', { '@/lib/supabase/server': { createClient: async () => c.client }, '@/lib/admin-access': { readAdminAccess } });
  assert.equal(await queries.isCurrentUserAdmin(), false);
});

function gate() { let release; const promise = new Promise(r => { release = r; }); return { promise, release }; }
function flowFixture(options = {}) {
  const states = [], calls = []; let callback; let completed = 0, disposed = 0;
  const control = { owner, status: 'mfa_required', factors: options.factors ?? [{ id: 'facteur-A', status: 'verified', friendly_name: 'Mon appareil' }], failed: null, held: null };
  async function boundary(name, data) {
    calls.push(name);
    if (control.held?.name === name) await control.held.gate.promise;
    return { data, error: control.failed === name ? new Error('échec fictif') : null };
  }
  const client = { auth: {
    getUser: async () => boundary('getUser', { user: { id: control.owner } }),
    onAuthStateChange: fn => { callback = fn; return { data: { subscription: { unsubscribe: () => disposed++ } } }; },
    mfa: {
      listFactors: async () => boundary('listFactors', { totp: control.factors, all: options.allFactors ?? control.factors }),
      enroll: async () => boundary('enroll', { id: 'nouveau-A', totp: { qr_code: '<svg></svg>', secret: 'EXEMPLELOCAL' } }),
      challenge: async data => { calls.push(['challengeArgs', data]); return boundary('challenge', { id: 'challenge-A' }); },
      verify: async data => { calls.push(['verifyArgs', data]); const r = await boundary('verify', {}); if (!r.error && !options.noUpgrade) control.status = 'allowed'; return r; },
      unenroll: async () => { throw new Error('Suppression de facteur interdite'); },
    },
  } };
  const check = async expected => { assert.equal(expected, owner); calls.push('server'); if (control.held?.name === 'server') await control.held.gate.promise; return { userId: control.owner, status: control.status }; };
  const run = createAdminMfaFlow(client, owner, check, s => states.push(JSON.parse(JSON.stringify(s))), () => completed++, { ...client.auth.mfa, adopt: async () => { calls.push('adopt'); }, dispose: () => { calls.push('transportDispose'); } }, options.timeoutMs ?? 15000);
  return { run, control, calls, states, get state() { return states.at(-1); }, get completed() { return completed; }, get disposed() { return disposed; },
    event(user, event = 'SIGNED_IN') { control.owner = user; callback(event, user ? { user: { id: user } } : null); } };
}

test('un appareil existant est conservé et aucun enrôlement automatique n’est effectué', async () => {
  const f = flowFixture(); await f.run.initialize(); assert.equal(f.state.phase, 'code');
  assert.equal(f.state.factorId, 'facteur-A'); assert.equal(f.calls.includes('enroll'), false); assert.equal(f.completed, 0);
});
test('enrôlement initial explicite puis challenge/code réels, sans suppression', async () => {
  const f = flowFixture({ factors: [] }); await f.run.initialize(); assert.equal(f.state.phase, 'enroll');
  await f.run.enroll(); assert.equal(f.state.phase, 'code'); assert.equal(f.state.factorId, 'nouveau-A');
  await f.run.verify('123456'); assert.equal(f.completed, 1); assert.equal(f.state.secret, null);
  assert.ok(f.calls.some(c => Array.isArray(c) && c[0] === 'verifyArgs' && c[1].factorId === 'nouveau-A' && c[1].challengeId === 'challenge-A'));
});
for (const failed of ['listFactors', 'enroll', 'challenge', 'verify']) test(`échec ${failed} : aucun faux succès`, async () => {
  const f = flowFixture({ factors: failed === 'enroll' ? [] : undefined });
  if (failed === 'listFactors') f.control.failed = failed;
  await f.run.initialize(); f.control.failed = failed;
  if (failed === 'enroll') await f.run.enroll(); else await f.run.verify('123456');
  assert.equal(f.completed, 0); assert.ok(f.state.error); assert.notEqual(f.state.phase, 'done');
});
test('une réponse verify sans aal2 confirmé par le serveur ne termine pas le parcours', async () => {
  const f = flowFixture({ noUpgrade: true }); await f.run.initialize(); await f.run.verify('123456'); assert.equal(f.completed, 0); assert.ok(f.state.error);
});
test('un rôle retiré avant le code interdit toute vérification du code', async () => {
  const f = flowFixture(); await f.run.initialize(); f.control.status = 'forbidden'; await f.run.verify('123456');
  assert.equal(f.state.phase, 'closed'); assert.equal(f.calls.includes('challenge'), false); assert.equal(f.completed, 0);
});
for (const step of ['enroll', 'challenge', 'verify']) {
  for (const change of ['account', 'logout', 'unmount']) test(`${change} pendant ${step} : résultat tardif inoffensif`, async () => {
    const f = flowFixture({ factors: step === 'enroll' ? [] : undefined }); await f.run.initialize();
    const hold = gate(); f.control.held = { name: step, gate: hold };
    const pending = step === 'enroll' ? f.run.enroll() : f.run.verify('123456');
    while (!f.calls.includes(step)) await new Promise(r => setImmediate(r));
    if (change === 'account') { f.event(other); f.event(owner); }
    if (change === 'logout') f.event(null, 'SIGNED_OUT');
    if (change === 'unmount') f.run.dispose();
    hold.release(); await pending;
    assert.equal(f.completed, 0);
    if (change !== 'unmount') { assert.equal(f.state.phase, 'closed'); assert.equal(f.state.qrCode, null); assert.equal(f.state.secret, null); }
    else assert.equal(f.disposed, 1);
    if (step === 'challenge') assert.equal(f.calls.includes('verify'), false);
  });
}
test('deux clics de code simultanés ne créent qu’un challenge', async () => {
  const f = flowFixture(); await f.run.initialize(); const held = gate(); f.control.held = { name: 'challenge', gate: held };
  const a = f.run.verify('123456'); const b = f.run.verify('123456');
  while (!f.calls.includes('challenge')) await new Promise(r => setImmediate(r)); held.release(); await Promise.all([a, b]);
  assert.equal(f.calls.filter(c => c === 'challenge').length, 1); assert.equal(f.completed, 1);
});
test('un facteur arbitraire fourni au sélecteur n’est jamais utilisé', async () => {
  const f = flowFixture(); await f.run.initialize(); f.run.selectFactor('facteur-autrui'); await f.run.verify('123456');
  assert.ok(f.calls.some(c => Array.isArray(c) && c[0] === 'challengeArgs' && c[1].factorId === 'facteur-A'));
});
test('un rôle retiré après le challenge est relu avant verify', async () => {
  const f = flowFixture(); await f.run.initialize(); const held = gate(); f.control.held = { name: 'challenge', gate: held };
  const a = f.run.verify('123456'); while (!f.calls.includes('challenge')) await new Promise(r => setImmediate(r));
  f.control.status = 'forbidden'; held.release(); await a; assert.equal(f.calls.includes('verify'), false); assert.equal(f.completed, 0);
});

for (const stage of ['initialize', 'enroll']) test(`un autre facteur vérifié interdit ${stage} TOTP depuis aal1`, async () => {
  const all = stage === 'enroll' ? [] : [{ id: 'phone', factor_type: 'phone', status: 'verified' }];
  const f = flowFixture({ factors: [], allFactors: all });
  await f.run.initialize();
  if (stage === 'enroll') { assert.equal(f.state.phase, 'enroll'); all.push({ id: 'phone', factor_type: 'phone', status: 'verified' }); }
  await f.run.enroll(); assert.equal(f.state.phase, 'closed'); assert.equal(f.calls.includes('enroll'), false); assert.match(f.state.error, /autre moyen/);
});
for (const step of ['getUser', 'server', 'listFactors', 'enroll', 'challenge', 'verify']) test(`attente ${step} bornée et réponse tardive inactive`, async () => {
  const f = flowFixture({ factors: step === 'enroll' ? [] : undefined, timeoutMs: 15 });
  const held = gate();
  if (['getUser','server','listFactors'].includes(step)) f.control.held = { name: step, gate: held };
  const initial = f.run.initialize();
  if (!['getUser','server','listFactors'].includes(step)) { await initial; f.control.held = { name: step, gate: held }; }
  const pending = ['getUser','server','listFactors'].includes(step) ? initial : step === 'enroll' ? f.run.enroll() : f.run.verify('123456');
  await pending; assert.equal(f.state.phase, 'closed'); assert.equal(f.state.busy, false); assert.equal(f.completed, 0);
  held.release(); await new Promise(r => setImmediate(r)); assert.equal(f.completed, 0); assert.equal(f.calls.includes('adopt'), false);
});

test('la page serveur cesse son attente et ne poursuit pas les lectures après son délai', async () => {
  const c = accessClient(); const held = gate();
  c.client.auth.getUser = async () => { await held.promise; return { data: { user: { id: owner } }, error: null }; };
  const result = await readAdminAccess(c.client, 15); assert.equal(result.status, 'unavailable');
  held.release(); await new Promise(r => setImmediate(r)); assert.equal(c.calls.some(c => c[0] === 'getClaims' || c[0] === 'from'), false);
});

test('action directe réelle à aal1 : la garde centrale bloque avant toute écriture', async () => {
  const c = accessClient({ aal: 'aal1' });
  const createClient = async () => c.client;
  const queries = load('lib/queries/admin.ts', { '@/lib/supabase/server': { createClient }, '@/lib/admin-access': { readAdminAccess } });
  const actions = load('app/(admin)/admin/partner-pending/actions.ts', {
    '@/lib/queries/admin': queries, '@/lib/supabase/server': { createClient },
    '@/lib/partner/server': { backendOrigin: () => { throw Error('service interdit'); }, partnerSession: () => { throw Error('session interdite'); } },
    '@/lib/partner/admission': { parseAdmission: () => { throw Error('admission interdite'); } },
    'next/cache': { revalidatePath: () => { throw Error('rafraîchissement interdit'); } },
  });
  const result = await actions.rejectApplication('candidature-fictive');
  assert.equal(result.ok, false);
  assert.equal(c.calls.filter(c => c[0] === 'from').length, 1);
});
