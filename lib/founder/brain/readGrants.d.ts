import type { MissionRpcClient } from "./repository.js";
/** Scope is a SHA-256 digest of the exact non-secret server configuration. */
export interface ReadGrant {
    id: string;
    ownerId: string;
    issuedBy: string;
    capabilityId: string;
    scopeHash: string;
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
}
export interface ReadGrantRepository {
    issue(input: {
        ownerId: string;
        issuedBy: string;
        capabilityId: string;
        scopeHash: string;
        durationMinutes: number;
    }): Promise<ReadGrant>;
    get(ownerId: string, capabilityId: string, scopeHash: string): Promise<ReadGrant | null>;
    revoke(ownerId: string, grantId: string): Promise<boolean>;
    /** All grants for this owner, including expired and revoked grants, newest first. */
    list(ownerId: string): Promise<ReadGrant[]>;
}
export declare class ReadGrantRepositoryError extends Error {
    readonly code: string;
    readonly databaseCode?: string | undefined;
    constructor(code: string, databaseCode?: string | undefined);
}
/** No authority comes from this client. Trusted HTTP checks current owner + MFA,
 * capability risk and scope before issuing; workers re-read the grant before use.
 * No implicit client, local fallback, secret, or write approval is created here. */
export declare function createReadGrantRepository(client: MissionRpcClient): ReadGrantRepository;
