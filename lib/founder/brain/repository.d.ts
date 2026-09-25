import type { MissionRepository } from "./types.js";
/** The service client is supplied by trusted server composition; never constructed here. */
export interface MissionRpcClient {
    rpc(name: string, args: Record<string, unknown>): PromiseLike<{
        data: unknown;
        error: {
            message: string;
            code?: string;
            details?: string;
            hint?: string;
        } | null;
    }>;
}
export declare class MissionRepositoryError extends Error {
    readonly code: string;
    readonly databaseCode?: string | undefined;
    constructor(code: string, databaseCode?: string | undefined);
}
/** RPC-only production repository. A database error never falls back to local memory. */
export declare function createMissionRepository(client: MissionRpcClient): MissionRepository;
