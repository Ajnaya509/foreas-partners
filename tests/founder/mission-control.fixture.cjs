exports.missionControlFixture=function(kind='control'){
 const receipt={targetMissionId:'Work_Target-ABC',command:'continue',beforeControl:'pause',afterControl:'run',targetPlanVersion:2,appliedAt:'2026-09-09T08:00:00.123456+01:00',permissionsChanged:false};
 const current={missionId:receipt.targetMissionId,status:'waiting',control:'run',planVersion:2,updatedAt:'2026-09-09T08:00:01.234567+01:00',uncertain:false,executing:false,needs:['access']};
 const observationAt='2026-09-09T07:01:00.000Z',receiptId='77777777-7777-4777-8777-777777777777';
 const result=kind==='control'?{summary:'Levée de pause enregistrée. La mission attend un accès.',output:{receiptId,receipt,current,observationAt},evidence:[{kind:'observation',source:'Pieuvre : registre des commandes',observedAt:observationAt,reference:'control:'+receiptId,data:{receipt:structuredClone(receipt),current:structuredClone(current)}}]}:
 {summary:'État relu. La mission attend un accès.',output:{...current,observationAt},evidence:[{kind:'observation',source:'Pieuvre : mission conservée',observedAt:observationAt,reference:'mission:'+current.missionId,data:structuredClone(current)}]};
 const step={id:'control',capability:kind==='control'?'mission.control':'mission.status.read',status:'succeeded',needs:[],result,error:null};
 const mission={id:'control-source',objective:kind==='control'?'Reprends ma dernière mission.':'Où en est ma dernière mission ?',status:'succeeded',control:'run',mode:'prepare',planVersion:1,createdAt:observationAt,updatedAt:observationAt,steps:[step]};
 const target={id:current.missionId,objective:'Travail de la mission cible',status:'waiting',control:'run',mode:'prepare',planVersion:2,createdAt:observationAt,updatedAt:observationAt,steps:[{id:'read',capability:'n8n.workflow.read',status:'waiting',needs:[{id:'access',kind:'access',description:'Accès encore nécessaire'}],result:null,error:null}]};
 return {step,result,mission,target};
};
