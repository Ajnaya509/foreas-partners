import { createMissionGateway, type MissionGatewayOptions, type GatewayAccessIssue, type GatewayAccessView } from './brain/gateway';

export type AccessView = GatewayAccessView;
/** App naming only. Validation, authentication, signatures and transport are official. */
export function createAccessGateway(options: MissionGatewayOptions) {
  const gateway=createMissionGateway(options);
  return {
    list:()=>gateway.listAccess(),
    issue:(input:unknown)=>gateway.issueAccess(input as GatewayAccessIssue),
    revoke:(grantId:string)=>gateway.revokeAccess(grantId),
  };
}
