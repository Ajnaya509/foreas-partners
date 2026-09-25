import type { AuthenticatedActor } from "./types.js";
/** Independent of the public/chat API key. Only trusted server gateways sign. */
export declare const MISSION_AUTH_HEADER = "x-mission-authority";
export declare const MISSION_AUTH_MAX_TTL_MS = 60000;
export declare const MISSION_AUTH_MAX_AGE_MS: number;
export declare const MISSION_AUTH_CLOCK_SKEW_MS = 5000;
export declare const MISSION_AUTH_MAX_BODY_BYTES = 1048576;
export type MissionAuthErrorCode = "configuration" | "invalid" | "replayed" | "storage_unavailable";
export declare class MissionAuthError extends Error {
    readonly code: MissionAuthErrorCode;
    constructor(code: MissionAuthErrorCode);
}
export interface MissionNonceClaim {
    ownerId: string;
    audience: string;
    channel: AuthenticatedActor["channel"];
    nonce: string;
    /** Keep this nonce at least until this instant; never delete early. */
    expiresAt: string;
}
export interface MissionGateway {
    /** Exact Supabase user UUID for admin, exact positive Telegram user ID for telegram. */
    subject: string;
    /** Independently generated 32–64 random bytes, encoded as unpadded base64url. */
    secret: string;
}
export interface MissionAuthorityOptions {
    /** Exact service/environment audience, never obtained from the incoming request. */
    audience: string;
    /** Shared founder identity, never inferred from a channel or a request body. */
    ownerId: string;
    gateways: Partial<Record<AuthenticatedActor["channel"], MissionGateway>>;
    /** All configured legacy HTTP, RAG and provider keys, to prevent key reuse. */
    forbiddenSecrets: readonly string[];
    /** Atomic durable insert-if-absent. Strict true means consumed; false means replay. */
    consumeNonce: (claim: MissionNonceClaim) => Promise<boolean>;
    now?: () => number;
}
export interface MissionAuthorityRequest {
    method: string;
    /** Original origin-form request target including its exact query string. */
    path: string;
    /** Original received bytes before JSON parsing; never JSON.stringify(req.body). */
    body: Uint8Array;
    /** One header value; arrays, repeated/comma-joined values and objects are rejected. */
    attestation: unknown;
}
export type MissionAuthorityPrecheckRequest = Pick<MissionAuthorityRequest, "method" | "path" | "attestation">;
type AuthorityConfiguration = Omit<MissionAuthorityOptions, "consumeNonce">;
/**
 * Pure admission filter before reading an HTTP body. Returns no actor or reusable grant.
 * A valid header may still have a wrong/missing body or spent nonce: it is NOT authenticated.
 * The full verifier must repeat these checks against current time/configuration afterward.
 */
export declare function precheckMissionAuthority(request: MissionAuthorityPrecheckRequest, options: AuthorityConfiguration): void;
/**
 * No network, old API key, incoming channel or local nonce-memory fallback.
 * The HTTP adapter must retain and process the same body bytes after verification.
 */
export declare function verifyMissionAuthority(request: MissionAuthorityRequest, options: MissionAuthorityOptions): Promise<AuthenticatedActor>;
/** Server-to-server issuer only: it cannot establish login/MFA; the gateway must. */
export declare function signMissionAuthority(request: Omit<MissionAuthorityRequest, "attestation">, actor: AuthenticatedActor, options: MissionAuthorityOptions, proof?: {
    nonce?: string;
    issuedAt?: string;
    expiresAt?: string;
}): string;
export {};
