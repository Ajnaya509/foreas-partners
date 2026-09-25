export interface CodeFile {
    path: string;
    content: string;
    sha256: string;
}
export interface CodeSnapshot {
    projectId: string;
    revision: string;
    files: CodeFile[];
}
export interface CodeCheck {
    id: string;
    argv: string[];
}
/** Private server configuration. Never populated from a chat or model response. */
export interface CodeProject {
    ownerId: string;
    id: string;
    revision: string;
    imageId: string;
    editablePaths: string[];
    contextPaths: string[];
    checks: CodeCheck[];
}
export interface CodeCheckReport {
    snapshotHash: string;
    policyHash: string;
    imageId: string;
    checks: {
        id: string;
        exitCode: number | null;
        timedOut: boolean;
        oomKilled: boolean;
        stdoutHash: string;
        stderrHash: string;
    }[];
}
export interface CodeChange {
    path: string;
    beforeSha256: string | null;
    content: string;
}
export interface CodeArtifact {
    version: 1;
    ownerId: string;
    projectId: string;
    revision: string;
    requestId: string;
    objectiveHash: string;
    policyHash: string;
    sourceHash: string;
    candidateHash: string;
    changes: (CodeChange & {
        beforeContent: string | null;
    })[];
    baseline: CodeCheckReport;
    verification: CodeCheckReport;
    rounds: number;
    createdAt: string;
    applied: false;
    semanticReviewRequired: true;
}
export declare class CodePreparationError extends Error {
    readonly code: "configuration" | "access" | "snapshot" | "proposal" | "checks" | "artifact" | "interrupted" | "busy" | "model_budget";
    constructor(code: "configuration" | "access" | "snapshot" | "proposal" | "checks" | "artifact" | "interrupted" | "busy" | "model_budget");
}
export declare const codeHash: (value: string) => string;
export declare const codePath: (v: unknown) => v is string;
export declare const codeTextAllowed: (text: unknown, max: number) => text is string;
export declare function readCodeProject(raw: CodeProject): CodeProject;
export declare function readCodeSnapshot(value: CodeSnapshot, project: CodeProject): CodeSnapshot;
export declare const codeSnapshotHash: (snapshot: CodeSnapshot) => string;
export declare const codePolicyHash: (project: CodeProject) => string;
export declare function readCodeCheckReport(value: CodeCheckReport, snapshot: CodeSnapshot, project: CodeProject): CodeCheckReport;
export declare function applyCodeProposal(raw: string, source: CodeSnapshot, project: CodeProject): {
    candidate: CodeSnapshot;
    changes: CodeChange[];
};
/** Runs on a dedicated worker. There is no repository write, shell chosen by a
 * model, publication or deployment here. Dependencies are explicit and trusted. */
export declare function createCodePreparer(options: {
    project: CodeProject;
    enabled: () => boolean;
    currentOwnerAccess: (ownerId: string) => Promise<boolean>;
    load: (signal: AbortSignal) => Promise<CodeSnapshot>;
    model: (request: {
        system: string;
        user: string;
        signal: AbortSignal;
    }) => Promise<string>;
    check: (snapshot: CodeSnapshot, project: CodeProject, signal: AbortSignal) => Promise<CodeCheckReport>;
    save: (ownerId: string, artifact: CodeArtifact, signal: AbortSignal) => Promise<{
        id: string;
        sha256: string;
    }>;
    now?: () => Date;
    timeoutMs?: number;
}): {
    active: () => boolean;
    whenIdle: () => Promise<void>;
    prepare(request: {
        ownerId: string;
        projectId: string;
        requestId: string;
        objective: string;
    }, parent: AbortSignal): Promise<{
        projectId: string;
        revision: string;
        artifactId: string;
        candidateHash: string;
        changedPaths: string[];
        checksPassed: number;
        rounds: number;
        applied: false;
        semanticReviewRequired: true;
    }>;
};
