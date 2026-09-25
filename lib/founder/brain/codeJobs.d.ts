import { type CodeProject, type CodeArtifact } from "./codePreparation.js";
import type { MissionRpcClient } from "./repository.js";
export interface CodeJob {
    id: string;
    ownerId: string;
    missionId: string;
    stepId: string;
    planVersion: number;
    mode: "prepare" | "test";
    projectId: string;
    policyHash: string;
    policy: CodeProject;
    brief: string;
    state: "queued" | "running" | "paused" | "ready" | "needs_attention" | "cancelled";
    generation: number;
    holder: string | null;
    leaseExpiresAt: string | null;
    modelCalls: number;
    artifact: CodeArtifact | null;
    artifactHash: string | null;
    issue: CodeJobIssue | null;
    createdAt: string;
    updatedAt: string;
}
export type CodeJobIssue = "configuration" | "access" | "snapshot" | "proposal" | "checks" | "artifact" | "interrupted" | "model_budget";
export interface CodeJobTarget {
    ownerId: string;
    missionId: string;
    stepId: string;
    planVersion: number;
}
export interface CodeJobs {
    request(target: CodeJobTarget, project: CodeProject): Promise<CodeJob>;
    get(target: CodeJobTarget): Promise<CodeJob | null>;
    claim(project: CodeProject, holder: string, mode?: "prepare" | "test"): Promise<CodeJob | null>;
    authorize(job: CodeJob): Promise<boolean>;
    reserveModel(job: CodeJob): Promise<number>;
    attach(job: CodeJob, artifact: CodeArtifact): Promise<CodeJob>;
    finish(job: CodeJob, state: "ready" | "needs_attention", issue: CodeJobIssue | null): Promise<CodeJob>;
    wake(project: CodeProject): Promise<boolean>;
}
export declare class CodeJobsError extends Error {
    readonly code: string;
    constructor(code: string);
}
/** Private artifact validation, shared by the worker and future protected reader.
 * A model proposal cannot call the job store or manufacture this receipt. */
export declare function readCodeJobArtifact(raw: unknown, job: Pick<CodeJob, "id" | "ownerId" | "projectId" | "policy" | "policyHash" | "brief">): CodeArtifact;
export declare function readCodeJob(value: unknown): CodeJob;
export declare function createCodeJobs(client: MissionRpcClient): CodeJobs;
