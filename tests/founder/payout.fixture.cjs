const {hash}=require('../../lib/founder/brain/model');
exports.payoutFixture=function(now=Date.now()){
 const iso=ms=>new Date(ms).toISOString(),ownerId='test-founder';
 const resources={accountId:'acct_FixtureOnly',destinationId:'ba_FixtureOnly',destinationLast4:'4242',destinationCountry:'FR',destinationFingerprintHash:hash('fixture-bank'),
  currency:'eur',livemode:true,sourceType:'card',maxAmountMinor:250000,apiVersion:'2026-08-26.dahlia',scope:'platform',method:'standard'};
 const {livemode,method,scope:scopeKind,...rest}=resources;
 const scopeHash=hash({kind:'stripe.payout.readiness.v1',ownerId,...rest,expectedLivemode:livemode,method,scope:scopeKind});
 const scope={scopeHash,description:'Lire ce compte et cette banque. Aucun argent envoyé.',resources};
 const input={accountId:resources.accountId,currency:'eur',amountMinor:200050,destinationId:resources.destinationId,destinationLast4:'4242',destinationCountry:'FR',
  destinationFingerprintHash:resources.destinationFingerprintHash,sourceType:'card',apiVersion:resources.apiVersion,livemode:true,preparedAt:iso(now-1000),expiresAt:iso(now+299000)};
 const output={preparation:input,availableMinor:900000,sourceAvailableMinor:800000,method:'standard',scope:'platform',orderCreated:false,fundsArrivalConfirmed:false,feesVerified:false,simulation:false};
 const preparation={id:'source-payout',objective:'Prépare un versement Stripe de 2 000,50 euros vers mon compte bancaire.',status:'succeeded',control:'run',mode:'prepare',planVersion:1,createdAt:iso(now-2000),updatedAt:iso(now),
  steps:[{id:'prepare',capability:'stripe.payout.prepare',status:'succeeded',needs:[],error:null,result:{summary:'Préparation terminée. Aucun argent envoyé.',output,
   evidence:[{kind:'draft',source:'https://api.stripe.com/v1/account',accountId:input.accountId,observedAt:input.preparedAt,reference:hash(input),data:output}]}}]};
 const mission={id:'payout-mission',objective:'Versement exact préparé',status:'waiting',control:'run',mode:'prepare',planVersion:1,createdAt:iso(now-500),updatedAt:iso(now),
  steps:[{id:'payout',capability:'stripe.payout.create',status:'waiting',needs:[{id:'approval:payout',kind:'approval',description:'Un accord récent est nécessaire.'}],result:null,error:null}]};
 const manifest={schemaVersion:1,operation:'payout',capabilityId:'stripe.payout.create',capabilityVersion:2,ownerId,missionId:mission.id,planVersion:1,stepId:'payout',effectiveMode:'live',inputHash:hash({fixture:'saved-step-input'}),apiOrigin:'https://api.stripe.com',
  apiVersion:input.apiVersion,accountId:input.accountId,destinationId:input.destinationId,destinationLast4:input.destinationLast4,destinationCountry:input.destinationCountry,destinationFingerprintHash:input.destinationFingerprintHash,
  amountMinor:input.amountMinor,currency:'eur',livemode:true,sourceType:'card',method:'standard',scope:'platform',preparedAt:input.preparedAt,executeBefore:input.expiresAt,
  financialReview:{scopeHash,evidenceHash:hash('fixture-review'),reviewedAt:iso(now-3600000),expiresAt:iso(now+150000),bankReadVerified:true,standardPayoutFeeMinor:0,currency:'eur'},
  feeAssessment:'reviewed_standard_no_additional_fee',feeCapEnforcedByProvider:false,feesObservedAfterPayout:false,expectedTotalDebitMinor:input.amountMinor,fundsArrivalConfirmed:false,
  impact:'Demander à Stripe un versement de 2000,50 € vers la banque finissant par 4242.',limitation:'La revue tarifaire doit être actuelle. Stripe ne reçoit aucun plafond de frais. Le reçu d’ordre ne prouve pas l’arrivée en banque.'};
 const action={id:'44444444-4444-4444-8444-444444444444',missionId:mission.id,stepId:'payout',planVersion:1,manifest,manifestHash:hash(manifest),expiresAt:manifest.financialReview.expiresAt,revokedAt:null,approval:null};
 const receipt={accountId:input.accountId,payoutId:'po_FixtureOnly',amountMinor:input.amountMinor,currency:'eur',destinationId:input.destinationId,destinationLast4:input.destinationLast4,providerStatus:'paid',dispatchId:'55555555-5555-4555-8555-555555555555',observedAt:iso(now),orderCreated:true,fundsArrivalConfirmed:false,feesVerified:false,simulation:false};
 const completed={...mission,status:'succeeded',steps:[{...mission.steps[0],status:'succeeded',needs:[],result:{summary:'Signalé comme payé par Stripe.',output:receipt,evidence:[{kind:'stripe.payout.observed',source:'https://api.stripe.com/v1/payouts/'+receipt.payoutId,observedAt:receipt.observedAt,reference:receipt.payoutId,accountId:receipt.accountId,data:receipt}]}}]};
 return {scope,input,preparation,mission,action,completed,ownerId};
};
exports.directPayoutFixture=function(now=Date.now()){
 const f=exports.payoutFixture(now),source=f.preparation.steps[0];
 f.mission.objective='Verse 2 000,50 euros sur mon compte';
 f.mission.steps=[source,{...f.mission.steps[0],capability:'stripe.payout.execute_prepared'}];
 f.action.manifest={...f.action.manifest,capabilityId:'stripe.payout.execute_prepared',capabilityVersion:1,
  preparedSource:{stepId:source.id,capabilityVersion:1,inputHash:hash({fixture:'prepared-input'}),proofHash:hash(source.result.evidence[0])}};
 f.action.manifestHash=hash(f.action.manifest);
 return f;
};
