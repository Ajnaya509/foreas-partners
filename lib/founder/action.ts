import type { GatewayActionView, GatewayMissionView } from './brain/gateway';
import { isPayoutAction, payoutManifest, payoutPreparation } from './payout';
export function actionDeadline(action: GatewayActionView): number {
  const review=isPayoutAction(action.manifest.capabilityId)?payoutManifest.safeParse(action.manifest):null;
  if(review&&!review.success)return 0;
  const dates=[action.expiresAt,action.manifest.executeBefore, action.approval?.expiresAt,review?.success?review.data.financialReview.expiresAt:undefined].filter(v=>v!==undefined).map(v=>Date.parse(String(v)));
  return dates.every(Number.isFinite) ? Math.min(...dates) : 0;
}
export function canApproveAction(action: GatewayActionView, mission: GatewayMissionView, now=Date.now()): boolean {
  const m=action.manifest, observed=Date.parse(String(m.preparedAt));
  if(isPayoutAction(m.capabilityId)){
    const parsed=payoutManifest.safeParse(m);
    if(!parsed.success||mission.mode==='test')return false;
    const r=parsed.data.financialReview;
    if(parsed.data.preparedSource){
      const source=mission.steps.find(s=>s.id===parsed.data.preparedSource!.stepId);
      const result=source?.result;
      const p=payoutPreparation.safeParse(result&&typeof result==='object'&&!Array.isArray(result)?result.output:undefined);
      if(source?.capability!=='stripe.payout.prepare'||source.status!=='succeeded'||source.id===action.stepId||!p.success||p.data.simulation
        ||Object.entries(p.data.preparation).some(([k,v])=>m[k==='expiresAt'?'executeBefore':k]!==v))return false;
    }
    return action.missionId===mission.id&&action.planVersion===mission.planVersion&&mission.control==='run'
      &&!['succeeded','failed','cancelled'].includes(mission.status)
      &&mission.steps.some(s=>s.id===action.stepId&&s.capability===m.capabilityId&&['waiting','pending'].includes(String(s.status)))
      &&m.missionId===mission.id&&m.stepId===action.stepId&&m.planVersion===mission.planVersion
      &&observed<=now&&Date.parse(r.reviewedAt)<=now&&Date.parse(action.expiresAt)<=Date.parse(r.expiresAt)
      &&Date.parse(action.expiresAt)<=Date.parse(String(m.executeBefore))&&actionDeadline(action)>now
      &&action.revokedAt===null&&(action.approval===null||action.approval.revokedAt!==null&&action.approval.consumedAt===null);
  }
  return action.missionId===mission.id && action.planVersion===mission.planVersion && mission.control==='run'
    && !['succeeded','failed','cancelled'].includes(mission.status) && mission.steps.some(s=>s.id===action.stepId && s.capability==='n8n.workflow.deactivate' && ['waiting','pending'].includes(String(s.status)))
    && m.capabilityId==='n8n.workflow.deactivate' && m.operation==='deactivate' && m.desiredActive===false
    && m.missionId===mission.id && m.stepId===action.stepId && m.planVersion===mission.planVersion
    && typeof m.instanceId==='string' && !!m.instanceId && typeof m.workflowId==='string' && !!m.workflowId && typeof m.expectedVersionId==='string' && !!m.expectedVersionId
    && Number.isFinite(observed) && observed<=now && actionDeadline(action)<=observed+300_000 && actionDeadline(action)>now
    && action.revokedAt===null && (action.approval===null || action.approval.revokedAt!==null && action.approval.consumedAt===null);
}
