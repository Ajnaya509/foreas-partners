import { type CodeProject, type CodeArtifact } from "./codePreparation.js";
import { type CodeJob, type CodeJobTarget } from "./codeJobs.js";
/** Private admin projection. Source text is inert data, never a chat instruction. */
export interface CodeReview {
    version: 1;
    ownerId: string;
    missionId: string;
    stepId: string;
    planVersion: number;
    jobId: string;
    mode: "prepare" | "test";
    jobState: CodeJob["state"];
    jobUpdatedAt: string;
    brief: string;
    policy: CodeProject;
    policyHash: string;
    artifact: CodeArtifact;
    artifactHash: string;
    readAt: string;
}
export declare class CodeReviewError extends Error {
    constructor();
}
/** The expected coordinates come from the authenticated server request. */
export declare function readCodeReview(raw: unknown, expected: CodeJobTarget): CodeReview | null;
export declare function codeReviewView(job: CodeJob, now: Date): CodeReview | null;
