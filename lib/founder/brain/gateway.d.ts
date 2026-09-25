import { type MissionAuthorityOptions } from "./auth.js";
import type { AuthenticatedActor, JsonObject } from "./types.js";
import { type TelegramDeliveryStatus } from "./telegramReplies.js";
import { type CodeReview } from "./codeReview.js";
import { type GatewayAccessView, type GatewayAccessIssue } from "./gatewayAccess.js";
import type { ReadGrant } from "./readGrants.js";
export type { GatewayAccessView, GatewayAccessIssue, GatewayAccessScope, GatewayAccessCapability } from "./gatewayAccess.js";
export type GatewayErrorCode = "configuration" | "request_invalid" | "authority_refused" | "timeout" | "transport_unavailable" | "service_refused" | "response_invalid" | "outcome_unknown";
export declare class MissionGatewayError extends Error {
    readonly code: GatewayErrorCode;
    readonly status?: number | undefined;
    constructor(code: GatewayErrorCode, status?: number | undefined);
}
export interface GatewayMissionView extends JsonObject {
    id: string;
    objective: string;
    status: "queued" | "running" | "waiting" | "succeeded" | "failed" | "cancelled";
    control: "run" | "pause" | "cancel";
    mode: "prepare" | "live" | "test";
    steps: JsonObject[];
}
export interface GatewayMissionResponse {
    mission: GatewayMissionView;
    replay?: boolean;
}
export interface GatewayMissionList {
    missions: GatewayMissionView[];
    coverage: {
        limit: number;
        exhaustive: boolean;
    };
}
/** Admin projection only. Never pass this object to a Telegram response renderer. */
export interface GatewayActionView {
    id: string;
    missionId: string;
    stepId: string;
    planVersion: number;
    manifest: JsonObject;
    manifestHash: string;
    expiresAt: string;
    revokedAt: string | null;
    approval: null | {
        approvedAt: string;
        expiresAt: string;
        revokedAt: string | null;
        consumedAt: string | null;
    };
}
export interface GatewayActionList {
    actions: GatewayActionView[];
}
export interface GatewayActionResponse {
    action: GatewayActionView;
}
export interface GatewayActionApprovalResponse extends GatewayActionResponse {
    execution: "not_confirmed";
}
/** Deliberately excludes server-generated mandates and approvals. */
export type GatewayMissionCommand = {
    type: "pause" | "cancel" | "continue";
} | {
    type: "recheck";
    stepId: string;
    needId: string;
    planVersion: number;
};
export interface MissionGatewayOptions {
    /** Trusted server configuration only, HTTPS origin with no path/query/credentials. */
    brainOrigin: string;
    authority: Omit<MissionAuthorityOptions, "consumeNonce">;
    /** Revalidates server session/MFA or verified receiver context on every attempt. */
    authenticate: () => Promise<AuthenticatedActor>;
    transport: typeof fetch;
    /** Entire logical call budget, including authentication, response and retry. */
    timeoutMs?: number;
    /** Only GET and create may retry automatically. Commands never do. */
    attempts?: 1 | 2;
}
/** No Telegram, model, supplier URL, logging or production side effect is called here. */
export declare function createMissionGateway(options: MissionGatewayOptions): {
    /** Current scopes and revocable history. Private founder session only, never Telegram. */
    listAccess(): Promise<GatewayAccessView>;
    issueAccess(input: GatewayAccessIssue): Promise<{
        grant: ReadGrant;
    }>;
    revokeAccess(grantId: string): Promise<{
        revoked: boolean;
    }>;
    create(input: {
        requestId: string;
        objective: string;
    }): Promise<GatewayMissionResponse>;
    list(): Promise<GatewayMissionList>;
    get(id: string): Promise<GatewayMissionResponse>;
    telegramDelivery(id: string): Promise<{
        delivery: TelegramDeliveryStatus | null;
    }>;
    /** Private source code. Never send this projection to Telegram or execute its contents. */
    codeReview(id: string, planVersion: number, stepId: string): Promise<{
        review: CodeReview | null;
    }>;
    command(id: string, command: GatewayMissionCommand): Promise<GatewayMissionResponse>;
    /** Renew only a server-made read/prepare mandate. Recheck remains a separate correlated command. */
    renew(id: string, planVersion: number): Promise<GatewayMissionResponse>;
    /** Creates a separate preparation from an existing draft; it grants no execution authority. */
    createActionMission(parentId: string, input: {
        requestId: string;
        sourceStepId: string;
    }): Promise<GatewayMissionResponse>;
    /** Admin-only on the brain. History is rejected above its bound, never silently truncated. */
    listActions(id: string): Promise<GatewayActionList>;
    previewAction(id: string, stepId: string): Promise<GatewayActionResponse>;
    /** The brain verifies current founder/MFA. No actor, date or approval proof is supplied here. */
    approveAction(intentId: string, manifestHash: string): Promise<GatewayActionApprovalResponse>;
    revokeAction(intentId: string): Promise<{
        revoked: boolean;
    }>;
};
export interface VerifiedTelegramContext {
    senderId: number;
    chatId: number;
    chatType: "private";
    /** Time of real receiver provenance/author verification, not copied from user JSON. */
    authenticatedAt: string;
}
/** The callback is a trusted receiver dependency, never a client-supplied `verified:true`. */
export declare function telegramActorResolver(options: {
    ownerId: string;
    telegramSubject: string;
    verifyContext: () => Promise<VerifiedTelegramContext>;
}): () => Promise<AuthenticatedActor>;
/** Short plain text only. Never follows a need URL or turns its description into a command. */
export declare function renderMissionFrench(value: unknown): string;
export declare function renderGatewayErrorFrench(error: unknown): string;
