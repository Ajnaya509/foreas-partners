import 'server-only';
import { FOUNDER_SUBJECT, FOUNDER_OWNER_ID } from './identity';
import { FounderAccessError } from './access';
export function founderConfiguration(env:NodeJS.ProcessEnv=process.env) {
  const identity = {subject: FOUNDER_SUBJECT, ownerId: FOUNDER_OWNER_ID};
  const identityMatches=env.BRAS_DROIT_OWNER_ID===FOUNDER_OWNER_ID
    &&(env.BRAS_DROIT_ADMIN_SUBJECT===undefined||env.BRAS_DROIT_ADMIN_SUBJECT===FOUNDER_SUBJECT);
  const enabled = env.FOREAS_FOUNDER_MISSIONS_ENABLED === 'true';
  const configured = !!(enabled && identityMatches && env.BRAS_DROIT_AUDIENCE
    && env.FOREAS_FOUNDER_BRAIN_ORIGIN && env.BRAS_DROIT_ADMIN_HMAC);
  const forbiddenSecrets = Object.entries(env).filter(([k,v])=>v && /(?:KEY|SECRET|TOKEN|PASSWORD|HMAC)/i.test(k)
    && k !== 'BRAS_DROIT_ADMIN_HMAC').map(([,v])=>v!);
  return {identity, configured, sensitiveEnabled: configured && env.FOREAS_FOUNDER_APPROVAL_ENABLED === 'true',
    codeReviewEnabled: configured && env.FOREAS_FOUNDER_CODE_REVIEW_ENABLED === 'true',
    payoutEnabled: configured && env.FOREAS_FOUNDER_APPROVAL_ENABLED === 'true' && env.FOREAS_FOUNDER_PAYOUT_ENABLED === 'true',
    origin:env.FOREAS_FOUNDER_BRAIN_ORIGIN || '',
    authority:{ownerId:identity.ownerId, audience:env.BRAS_DROIT_AUDIENCE || '',
      gateways:{admin:{subject:identity.subject,secret:env.BRAS_DROIT_ADMIN_HMAC || ''}}, forbiddenSecrets}};
}
export function requireMissionConfiguration() { const c=founderConfiguration(); if(!c.configured) throw new FounderAccessError('configuration'); return c; }
