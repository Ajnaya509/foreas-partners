import type { Need } from "./types.js";
export declare class CapabilityNeedsError extends Error {
    readonly needs: Need[];
    constructor(needs: Need[]);
}
export declare class MissionValidationError extends Error {
    readonly code: string;
    constructor(code: string);
}
