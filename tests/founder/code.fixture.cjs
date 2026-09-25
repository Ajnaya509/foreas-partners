const {canonical}=require('../../lib/founder/brain/model');
const {codeHash,codePolicyHash}=require('../../lib/founder/brain/codePreparation');
const {readCodeReview}=require('../../lib/founder/brain/codeReview');
exports.codeFixture=function(ownerId='test-founder'){
 const at=new Date().toISOString(),brief='Corriger la page de démonstration',jobId='77777777-7777-4777-8777-777777777777';
 const policy={ownerId,id:'project-fixture',revision:'a'.repeat(40),imageId:'sha256:'+'b'.repeat(64),editablePaths:['src/page.ts'],contextPaths:['tests/page.test.ts'],checks:[{id:'page-test',argv:['/usr/bin/node','tests/page.test.ts']}]};
 const before='export const page = "ancienne";',content='export const page = "<img src=x onerror=alert(1)>";',policyHash=codePolicyHash(policy),sourceHash=codeHash(before),candidateHash=codeHash(content);
 const checks=[{id:'page-test',exitCode:0,timedOut:false,oomKilled:false,stdoutHash:codeHash('ok'),stderrHash:codeHash('')}];
 const artifact={version:1,ownerId,projectId:policy.id,revision:policy.revision,requestId:'code:'+jobId,objectiveHash:codeHash(brief),policyHash,sourceHash,candidateHash,
  changes:[{path:'src/page.ts',beforeContent:before,beforeSha256:codeHash(before),content}],
  baseline:{snapshotHash:sourceHash,policyHash,imageId:policy.imageId,checks:[{...checks[0],exitCode:1}]},
  verification:{snapshotHash:candidateHash,policyHash,imageId:policy.imageId,checks},rounds:1,createdAt:at,applied:false,semanticReviewRequired:true};
 const review={version:1,ownerId,missionId:'mission-private',stepId:'correction-code',planVersion:1,jobId,mode:'prepare',jobState:'ready',jobUpdatedAt:at,brief,policy,policyHash,artifact,artifactHash:codeHash(canonical(artifact)),readAt:at};
 readCodeReview(review,{ownerId,missionId:review.missionId,stepId:review.stepId,planVersion:1});
 const mission={id:review.missionId,objective:brief,status:'succeeded',control:'run',mode:'prepare',planVersion:1,createdAt:at,updatedAt:at,
  steps:[{id:review.stepId,capability:'code.change.prepare',status:'succeeded',needs:[],error:null,result:{summary:'Une correction est préparée.',output:{projectId:policy.id,revision:policy.revision,jobId,artifactId:review.artifactHash,changedPaths:['src/page.ts'],checksPassed:1,applied:false,semanticReviewRequired:true},evidence:[{kind:'draft',source:'simulation:code-worker',reference:jobId,observedAt:at,data:{applied:false}}]}}]};
 return {review,mission,scope:{scopeHash:policyHash,description:'Préparer une correction avec trois essais au plus.',resources:{projectId:policy.id,revision:policy.revision,imageId:policy.imageId,editablePaths:policy.editablePaths,contextPaths:policy.contextPaths,checks:policy.checks,maxModelCallsPerJob:3,applied:false}}};
};
exports.workerFixture=function(now=Date.now()){
 const at=new Date(now).toISOString();
 return {projectId:'project-fixture',state:'recent',receivedAt:at,validUntil:new Date(now+60000).toISOString(),report:{reportedAt:at,phase:'ready',issue:null,active:false,model:'claude-fixture',maximumCallMicroUsd:100000,budget:{date:at.slice(0,10),calls:1,chargedOrReservedMicroUsd:100000,dailyCalls:10,dailyMicroUsd:1000000}},
  nextAction:null,budgetCurrency:'USD',budgetScope:'service-local-UTC-excluding-tax',providerInvoiceVerified:false,source:'worker-report',independentlyVerified:false,applied:false};
};
