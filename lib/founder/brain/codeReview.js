"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeReviewError = void 0;
exports.readCodeReview = readCodeReview;
exports.codeReviewView = codeReviewView;
const model_js_1 = require("./model.js");
const codePreparation_js_1 = require("./codePreparation.js");
const codeJobs_js_1 = require("./codeJobs.js");
class CodeReviewError extends Error {
    constructor() { super("code_review_invalid"); this.name = "CodeReviewError"; }
}
exports.CodeReviewError = CodeReviewError;
const bad = () => { throw new CodeReviewError(); };
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).sort().join(",") === keys;
const id = (v) => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
function timestamp(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)
        || !Number.isFinite(Date.parse(v)))
        return false;
    const [year, month, day] = v.slice(0, 10).split("-").map(Number);
    return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
/** The expected coordinates come from the authenticated server request. */
function readCodeReview(raw, expected) {
    if (raw === null)
        return null;
    try {
        if (!exact(raw, "artifact,artifactHash,brief,jobId,jobState,jobUpdatedAt,missionId,mode,ownerId,planVersion,policy,policyHash,readAt,stepId,version")
            || raw.version !== 1 || typeof raw.ownerId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(raw.ownerId)
            || !id(raw.missionId) || typeof raw.stepId !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(raw.stepId)
            || !Number.isSafeInteger(raw.planVersion) || Number(raw.planVersion) < 1
            || Object.entries(expected).some(([key, value]) => raw[key] !== value)
            || typeof raw.jobId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(raw.jobId)
            || !["prepare", "test"].includes(String(raw.mode))
            || !["queued", "running", "paused", "ready", "needs_attention", "cancelled"].includes(String(raw.jobState))
            || typeof raw.brief !== "string" || !raw.brief.trim() || raw.brief.length > 4000
            || !timestamp(raw.jobUpdatedAt) || !timestamp(raw.readAt)
            || typeof raw.policyHash !== "string" || !/^[a-f0-9]{64}$/.test(raw.policyHash)
            || typeof raw.artifactHash !== "string" || !/^[a-f0-9]{64}$/.test(raw.artifactHash)
            || Buffer.byteLength((0, model_js_1.canonical)(raw)) > 2 * 1024 * 1024 + 64 * 1024)
            return bad();
        const policy = (0, codePreparation_js_1.readCodeProject)(raw.policy);
        if (policy.ownerId !== expected.ownerId || (0, codePreparation_js_1.codePolicyHash)(policy) !== raw.policyHash)
            return bad();
        const artifact = (0, codeJobs_js_1.readCodeJobArtifact)(raw.artifact, { id: raw.jobId, ownerId: expected.ownerId, projectId: policy.id,
            policy, policyHash: raw.policyHash, brief: raw.brief });
        if ((0, codePreparation_js_1.codeHash)((0, model_js_1.canonical)(artifact)) !== raw.artifactHash || !timestamp(artifact.createdAt)
            || Date.parse(raw.jobUpdatedAt) > Date.parse(raw.readAt) + 30000
            || Date.parse(artifact.createdAt) > Date.parse(raw.readAt) + 30000)
            return bad();
        return structuredClone({ ...raw, policy, artifact });
    }
    catch {
        return bad();
    }
}
function codeReviewView(job, now) {
    if (job.artifact === null && job.artifactHash === null)
        return null;
    return readCodeReview({ version: 1, ownerId: job.ownerId, missionId: job.missionId, stepId: job.stepId, planVersion: job.planVersion,
        jobId: job.id, mode: job.mode, jobState: job.state, jobUpdatedAt: job.updatedAt, brief: job.brief, policy: job.policy,
        policyHash: job.policyHash, artifact: job.artifact, artifactHash: job.artifactHash, readAt: now.toISOString() }, { ownerId: job.ownerId, missionId: job.missionId, stepId: job.stepId, planVersion: job.planVersion });
}
