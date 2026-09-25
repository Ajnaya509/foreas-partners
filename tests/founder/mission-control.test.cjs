const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('./load.cjs');
const {missionControlFixture}=require('./mission-control.fixture.cjs');
const {missionControlResult}=load('components/founder/missionControlResult.ts');
const {missionLabel}=load('components/founder/presentation.ts');
const {MissionControlCard}=load('components/founder/MissionControlCard.tsx',{'./founder.module.css':{__esModule:true,default:{}}});
const render=f=>renderToStaticMarkup(React.createElement(MissionControlCard,{step:f.step,sourceMissionId:f.mission.id,busy:false,openTarget:()=>{throw Error('render must not navigate');}}));
test('successful control does not complete a target still waiting for access; offset and microsecond dates survive',()=>{
 const f=missionControlFixture(),v=missionControlResult(f.step,f.mission.id),html=render(f);
 assert.ok(v);assert.equal(v.receipt.appliedAt,f.result.output.receipt.appliedAt);assert.equal(missionLabel(f.mission),'Commande enregistrée');
 for(const text of ['Levée de pause','Dernier état observé : En attente','Accès manquant','État mis à jour le','État relu le','Aucun accès ni accord renouvelé','Voir cette mission'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/Étapes terminées|Autoriser ce|Date non confirmée/);
});
test('successful status read preserves uncertain and executing target and does not propose a financial agreement',()=>{
 const f=missionControlFixture('status');Object.assign(f.result.output,{uncertain:true,executing:true});Object.assign(f.result.evidence[0].data,{uncertain:true,executing:true});
 assert.equal(missionLabel(f.mission),'État relu');const html=render(f);
 assert.match(html,/Résultat à vérifier/);assert.match(html,/action déjà partie/);assert.doesNotMatch(html,/Commande enregistrée|Autoriser|Étapes terminées/);
});
test('an old pause receipt and a newer running control are both preserved, including different plan versions',()=>{
 const f=missionControlFixture();const receipt=f.result.output.receipt;Object.assign(receipt,{command:'pause',beforeControl:'run',afterControl:'pause',targetPlanVersion:1});f.result.evidence[0].data.receipt=structuredClone(receipt);
 assert.ok(missionControlResult(f.step,f.mission.id));const html=render(f);
 assert.match(html,/Commande enregistrée/);assert.match(html,/Pause/);assert.match(html,/consigne plus récente/);assert.match(html,/ancienne commande n’est pas répétée/);assert.match(html,/Dernier état observé : En attente/);
});
test('unknown, inconsistent or unverified receipts provide no target navigation',()=>{
 const changes=[
 f=>f.step.result=null,f=>f.step.status='uncertain',f=>f.result.output.receipt.permissionsChanged=true,
 f=>f.result.output.current.missionId='Other_Target',f=>f.result.output.current.missionId='../outside',
 f=>f.result.output.current.status='unknown',f=>f.result.output.current.needs=['secret'],
 f=>f.result.output.current.updatedAt='invalid',f=>f.result.output.receipt.afterControl='pause',
 f=>f.result.output.extra=true,f=>f.result.evidence=[],f=>f.result.evidence[0].data.current.control='cancel',
 f=>f.result.evidence[0].reference='control:wrong',f=>f.result.evidence[0].observedAt='2026-09-09T09:00:00Z',
 f=>f.mission.id=f.result.output.current.missionId
 ];
 for(const change of changes){const f=missionControlFixture();change(f);assert.equal(missionControlResult(f.step,f.mission.id),null);assert.doesNotMatch(render(f),/Voir cette mission|<button/);}
});
test('evidence is data rendered as escaped text only in optional details',()=>{
 const f=missionControlFixture();f.result.summary='<img src=x onerror=alert(1)> ';const html=render(f);
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|onClick|onclick/);assert.ok(html.indexOf('&lt;img')>html.indexOf('<details>'));
});
