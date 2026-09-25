import test from 'node:test';
import assert from 'node:assert/strict';
import loader from './load.cjs';
const {loadPartnerModule}=loader;
const {referralForSharing,formatMoney,formatDate,summarySchema,commissionsSchema,previewEnabled,previewSnapshot,audienceForCategory}=loadPartnerModule('lib/partner/model.ts');
const {audiences,kitAssets,kitDocument,messagePack,kitId}=loadPartnerModule('lib/partner/kit.ts');
const emptyLedger={evidence_version:'commission-evidence.v1',observed_at:'2026-09-09T08:00:00Z',items:[],pagination:{limit:25,next_cursor:null},coverage:{ledger:'parrainage_droits',legacy_reconciled:false,transfer_basis:'recorded_provider_confirmation',bank_receipt:'not_tracked',transfer_reversals:'not_reconciled'}};
const me={organization:{id:'test-only',name:'Test',type:'centre'},program:'driver_referral',target:'drivers',admission:{state:'active',approved_at:null},capabilities:{can_read_commissions:true,can_recruit:true,can_manage_payout:true},referral:{code:'TEST-ONLY',url:'https://www.foreas.xyz/r/TEST-ONLY'},terms:{required_version:'v1',accepted_version:'v1',acceptance_required:false}};
for(const [name,patch] of [['sans code',{referral:null}],['en attente',{admission:{state:'pending'}}],['en pause',{admission:{state:'paused'}}],['sans droit de recruter',{capabilities:{can_recruit:false}}],['accord manquant',{terms:{required_version:'v1',accepted_version:null,acceptance_required:true}}],['aucune version publiée',{terms:{required_version:null,accepted_version:null,acceptance_required:false}}],['accord différent',{terms:{required_version:'v2',accepted_version:'v1',acceptance_required:false}}]])test(`aucun lien ${name}`,()=>assert.equal(referralForSharing({...me,...patch}),null));
test('lien serveur conforme conservé exactement',()=>assert.equal(referralForSharing(me),me.referral.url));
for(const url of ['http://www.foreas.xyz/r/TEST-ONLY','https://evil.example/r/TEST-ONLY','https://www.foreas.xyz/r/AUTRE','https://www.foreas.xyz/r/TEST-ONLY?partner_id=autre','https://www.foreas.xyz/r/TEST-ONLY#autre','https://evil.example@www.foreas.xyz/r/TEST-ONLY'])test(`lien non fiable refusé ${url}`,()=>assert.equal(referralForSharing({...me,referral:{code:me.referral.code,url}}),null));
test('un petit montant conserve ses centimes',()=>assert.match(formatMoney(1250),/12,50/));
test('date absente ou invalide jamais transformée en aujourd’hui',()=>{assert.equal(formatDate(null),'Date non communiquée');assert.equal(formatDate('faux'),'Date non communiquée');});
test('pas de faux gains dans l’aperçu',()=>{const s=previewSnapshot();assert.equal(s.me.status,'unavailable');assert.equal(s.summary.status,'unavailable');assert.equal(s.commissions.status,'unavailable');});
test('aperçu fermé en production même si le drapeau est présent',()=>{const old=process.env.NODE_ENV,flag=process.env.FOREAS_PARTNER_DEMO;try{process.env.NODE_ENV='production';process.env.FOREAS_PARTNER_DEMO='1';assert.equal(previewEnabled(),false);process.env.NODE_ENV='development';assert.equal(previewEnabled(),true);delete process.env.FOREAS_PARTNER_DEMO;assert.equal(previewEnabled(),false);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;if(flag===undefined)delete process.env.FOREAS_PARTNER_DEMO;else process.env.FOREAS_PARTNER_DEMO=flag;}});
test('registre incomplet ou monnaie différente refusés',()=>{assert.equal(summarySchema.safeParse({currency:'EUR',totals_cents:{paid:0}}).success,false);assert.equal(commissionsSchema.safeParse({items:[],pagination:{limit:25,next_cursor:null},coverage:{ledger:'old',legacy_reconciled:false}}).success,false);});
test('droits vides valides restent distincts d’une erreur',()=>{assert.equal(commissionsSchema.safeParse(emptyLedger).success,true);});
test('quinze supports avec identifiants uniques et montants exacts',()=>{const ids=audiences.flatMap(a=>kitAssets.map(k=>kitId(a.id,k.asset)));assert.equal(new Set(ids).size,15);for(const a of audiences){const h=kitDocument(a.id,'guide.html',null,true);assert.ok(h.includes('5 € par mensualité réellement payée et admissible'));assert.ok(h.includes('50 € une seule fois'));assert.ok(h.includes('Aperçu local'));assert.ok(!h.includes('FOREAS-NEW'));}});
test('nouveau guide à 10 € et ancien guide à 5 € selon les conditions',()=>{for(const a of audiences){const h=kitDocument(a.id,'guide.html',null,true,'second_paid_month');assert.ok(h.includes('10 € par mensualité réellement payée et admissible'));assert.ok(h.includes('deuxième mois payé du même abonnement'));assert.ok(h.includes('20 € de droits'));assert.ok(h.includes('Conditions 2026-09-24.1'));assert.ok(!h.includes('5 € par mensualité'));const legacy=kitDocument(a.id,'guide.html',null,false);assert.ok(legacy.includes('5 € par mensualité réellement payée et admissible'));assert.ok(!legacy.includes('Conditions 2026-09-24.1'));}});
test('HTML du lien échappé et scénarios rémunérés transparents',()=>{const h=kitDocument('centre','fiche-chauffeur.html','https://www.foreas.xyz/r/TEST?x="<script>',false);assert.ok(!h.includes('<script>'));const m=messagePack('flotte',me.referral.url);assert.ok(m.includes('Lien de recommandation rémunéré'));assert.ok(m.includes(me.referral.url));assert.ok(!m.includes('revenu garanti de'));});

const {parseAdmission}=loadPartnerModule('lib/partner/admission.ts');
const prepared={ok:false,partner_id:'test-only',referral_code:null,admission:{state:'awaiting_identity',invitation:'not_requested'}};
test('une admission préparée reste en attente même en réponse positive',()=>{assert.equal(parseAdmission(202,prepared)?.admission.state,'awaiting_identity');assert.equal(parseAdmission(200,prepared),null);assert.equal(parseAdmission(202,{...prepared,ok:true})?.admission.state,'awaiting_identity');});
test('aucun partenaire actif sans état et réponse concordants',()=>{const active={...prepared,ok:true,admission:{state:'active',invitation:'uncertain'}};assert.equal(parseAdmission(200,active)?.admission.invitation,'uncertain');assert.equal(parseAdmission(202,active),null);assert.equal(parseAdmission(200,{ok:true}),null);assert.equal(parseAdmission(200,{...active,ok:false}),null);});

const {safePortalNext,loginErrorMessage}=loadPartnerModule('lib/partner/navigation.ts');
test('le retour de connexion refuse les destinations externes',()=>{for(const value of ['https://other.example','//other.example','/\\other.example','javascript:alert(1)','/unknown'])assert.equal(safePortalNext(value),'/partner');assert.equal(safePortalNext('/partner/aide'),'/partner/aide');assert.equal(safePortalNext('/driver'),'/driver');assert.equal(safePortalNext('/admin'),'/admin');});


test('la catégorie serveur choisit le support correspondant',()=>{
  for(const [category,audience] of [['training','centre'],['rental','loueur'],['fleet_employer','flotte'],['fleet_admin','flotte'],['cooperative','flotte'],['creator','createur'],['driver','chauffeur']])assert.equal(audienceForCategory(category),audience);
});
test('chaque échec de connexion connu fournit une action claire',()=>{
  for(const code of ['access_denied','link_expired','no_code','auth_failed'])assert.ok(loginErrorMessage(code));
  assert.equal(loginErrorMessage('unexpected'),null);
});

test('services et catégorie inconnue laissent le choix du profil ouvert',()=>{assert.equal(audienceForCategory('services'),null);assert.equal(audienceForCategory('inconnu'),null);assert.equal(audienceForCategory(null),null);});

test('même un relevé vide exige une date et une portée de preuve explicites',()=>{
 assert.equal(commissionsSchema.safeParse(emptyLedger).success,true);
 const {observed_at,...withoutDate}=emptyLedger;
 const {evidence_version,...withoutVersion}=emptyLedger;
 for(const invalid of [withoutDate,withoutVersion,{...emptyLedger,coverage:{...emptyLedger.coverage,bank_receipt:'confirmed'}}])assert.equal(commissionsSchema.safeParse(invalid).success,false);
});
