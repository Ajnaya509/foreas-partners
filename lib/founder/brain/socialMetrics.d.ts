import type { JsonObject } from "./types.js";
export declare const SOCIAL_METRICS_CAPABILITY = "social.metrics.read";
export interface SocialMetricsScope {
    ownerId: string;
    robotRef: string;
    purpose: "FOREAS_HUNTER" | "PRIVATE_HUNTER";
    driverId: string | null;
    providerAccountRef: string;
    channel: "email";
    timezone: string;
    revision: number;
    environment: "live" | "test";
}
export interface SocialMetricsRequest {
    requestId: string;
    missionId: string;
    stepId: string;
    robotRef: string;
    calendarDate: string;
    scopeHash: string;
}
export type SocialMetricsErrorCode = "scope_unknown" | "denied" | "unavailable" | "invalid";
export declare class SocialMetricsError extends Error {
    readonly code: SocialMetricsErrorCode;
    constructor(code: SocialMetricsErrorCode);
}
export declare const socialExact: (v: unknown, keys: string) => v is Record<string, unknown>;
export declare const socialId: (v: unknown) => v is string;
export declare function socialCalendarDate(v: unknown): v is string;
export declare function socialDateAt(epoch: number, timezone: string): string;
export declare function readSocialMetricsScope(value: unknown): SocialMetricsScope;
export declare function socialMetricsScopeHash(raw: unknown): string;
export declare function readSocialMetricsInput(raw: unknown): JsonObject & {
    robotRef: string;
    calendarDate: string;
};
export declare function readSocialMetricsRequest(raw: unknown): SocialMetricsRequest;
export declare const SOCIAL_METRICS_LIMITATIONS: readonly ["Ce registre couvre uniquement ce robot et ses messages email enregistrés.", "Une adresse déclarée externe ne certifie pas une personne ni un prospect réel.", "L’acceptation fournisseur ne prouve ni la livraison, ni la lecture, ni une réponse.", "La journée est celle où l’acceptation a été observée par le serveur.", "Les places réservées et incertaines peuvent venir de jours précédents.", "Les anciens historiques, les autres robots et les autres canaux ne sont pas couverts."];
export interface SocialMetricsObservation {
    scope: SocialMetricsScope;
    request: SocialMetricsRequest;
    metrics: JsonObject;
    receivedAt: string;
}
/** Parse only an authenticated, bound response. This function grants no access. */
export declare function readSocialMetricsObservation(raw: unknown, expected: {
    scope: SocialMetricsScope;
    request: SocialMetricsRequest;
    startedAt: number;
    receivedAt: number;
}): SocialMetricsObservation;
export declare function socialMetricsSummary(observation: SocialMetricsObservation): string;
