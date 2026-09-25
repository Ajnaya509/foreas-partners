import type { AuthenticatedActor, Capability, JsonObject, Mandate, Mission, MissionMode, MissionStep } from "./types.js";
export declare function canonical(value: unknown, depth?: number): string;
export declare const hash: (value: unknown) => string;
export declare const effectful: (capability: Capability) => boolean;
export declare function inputHash(mission: Mission, step: MissionStep): string;
export declare function containsSecret(text: string): boolean;
export declare function cleanObjective(value: unknown): string;
/**
 * Transport identity only, not authority or a permission to change an existing plan.
 * requestHash keeps its historical plan binding. A retry returns the original record
 * even when a model could propose different steps, without refreshing its mandate.
 */
export declare function sameMissionRequestIdentity(mission: Mission, request: {
    actor: AuthenticatedActor;
    requestId: string;
    objective: string;
    mode: MissionMode;
}): boolean;
export declare class CapabilityRegistry {
    private readonly entries;
    constructor(capabilities: Capability[]);
    get(id: string): Capability | undefined;
    describe(): {
        id: string;
        version: number;
        risk: import("./types.js").Risk;
        description: string;
    }[];
}
export interface StepSpec {
    id: string;
    capabilityId: string;
    input: JsonObject;
    dependsOn: string[];
}
export declare function buildMission(options: {
    actor: AuthenticatedActor;
    requestId: string;
    objective: string;
    mode: MissionMode;
    mandate: Mandate;
    steps: StepSpec[];
    registry: CapabilityRegistry;
    now?: Date;
    id?: string;
}): Mission;
/** Do not send raw supplier records, input hashes or internal authorizations to a client. */
export declare function missionView(record: import("./types.js").StoredMission): JsonObject;
