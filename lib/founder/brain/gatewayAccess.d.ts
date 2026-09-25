import type { ReadGrant } from "./readGrants.js";
import type { JsonObject } from "./types.js";
/** Public descriptions of server-owned scopes. This module creates no authority. */
export declare const GATEWAY_ACCESS_CAPABILITIES: readonly ["stripe.balance.read", "n8n.workflow.read", "code.change.prepare", "stripe.payout.prepare", "social.metrics.read"];
export type GatewayAccessCapability = typeof GATEWAY_ACCESS_CAPABILITIES[number];
export interface GatewayAccessScope {
    scopeHash: string;
    description: string;
    resources: JsonObject;
}
export interface GatewayAccessView {
    scopes: Partial<Record<GatewayAccessCapability, GatewayAccessScope>>;
    grants: ReadGrant[];
}
export interface GatewayAccessIssue {
    capabilityId: GatewayAccessCapability;
    scopeHash: string;
    durationMinutes: number;
}
export declare function readGatewayAccessIssue(value: unknown): GatewayAccessIssue;
export declare function readGatewayAccessGrant(value: unknown, ownerId: string): ReadGrant;
export declare function readGatewayAccess(value: unknown, ownerId: string): GatewayAccessView;
