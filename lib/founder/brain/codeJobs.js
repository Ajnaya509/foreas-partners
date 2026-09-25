"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeJobsError = void 0;
exports.readCodeJobArtifact = readCodeJobArtifact;
exports.readCodeJob = readCodeJob;
exports.createCodeJobs = createCodeJobs;
const model_js_1 = require("./model.js");
const codePreparation_js_1 = require("./codePreparation.js");
class CodeJobsError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "CodeJobsError";
    }
}
exports.CodeJobsError = CodeJobsError;
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).sort().join(",") === keys;
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const uuid = (v) => typeof v === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const small = (v) => typeof v === "string" && v.length > 0 && v.length <= 128 && !/[\0\r\n]/.test(v);
const date = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));
const issues = ["configuration", "access", "snapshot", "proposal", "checks", "artifact", "interrupted", "model_budget"];
const invalid = () => { throw new CodeJobsError("code_job_invalid_response"); };
/** Private artifact validation, shared by the worker and future protected reader.
 * A model proposal cannot call the job store or manufacture this receipt. */
function readCodeJobArtifact(raw, job) {
    if (!exact(raw, "applied,baseline,candidateHash,changes,createdAt,objectiveHash,ownerId,policyHash,projectId,requestId,revision,rounds,semanticReviewRequired,sourceHash,verification,version")
        || Buffer.byteLength((0, model_js_1.canonical)(raw)) > 2 * 1024 * 1024 || raw.version !== 1 || raw.ownerId !== job.ownerId
        || raw.projectId !== job.projectId || raw.revision !== job.policy.revision || raw.requestId !== `code:${job.id}`
        || raw.policyHash !== job.policyHash || raw.objectiveHash !== (0, codePreparation_js_1.codeHash)(job.brief) || !hash(raw.sourceHash) || !hash(raw.candidateHash)
        || raw.sourceHash === raw.candidateHash || raw.applied !== false || raw.semanticReviewRequired !== true || !date(raw.createdAt)
        || !Number.isInteger(raw.rounds) || Number(raw.rounds) < 1 || Number(raw.rounds) > 3
        || !Array.isArray(raw.changes) || !raw.changes.length || raw.changes.length > 8)
        return invalid();
    const paths = new Set();
    for (const c of raw.changes) {
        if (!exact(c, "beforeContent,beforeSha256,content,path") || !(0, codePreparation_js_1.codePath)(c.path) || !job.policy.editablePaths.includes(c.path)
            || paths.has(c.path) || !(0, codePreparation_js_1.codeTextAllowed)(c.content, 65536)
            || !(c.beforeContent === null || (0, codePreparation_js_1.codeTextAllowed)(c.beforeContent, 262144))
            || c.beforeSha256 !== (c.beforeContent === null ? null : (0, codePreparation_js_1.codeHash)(c.beforeContent)) || c.content === c.beforeContent)
            return invalid();
        paths.add(c.path);
    }
    for (const [key, snapshotHash] of [["baseline", raw.sourceHash], ["verification", raw.candidateHash]]) {
        const r = raw[key];
        if (!exact(r, "checks,imageId,policyHash,snapshotHash") || r.snapshotHash !== snapshotHash || r.policyHash !== job.policyHash
            || r.imageId !== job.policy.imageId || !Array.isArray(r.checks) || r.checks.length !== job.policy.checks.length)
            return invalid();
        for (let i = 0; i < r.checks.length; i++) {
            const c = r.checks[i];
            if (!exact(c, "exitCode,id,oomKilled,stderrHash,stdoutHash,timedOut") || c.id !== job.policy.checks[i].id
                || !(c.exitCode === null || Number.isInteger(c.exitCode) && Number(c.exitCode) >= 0 && Number(c.exitCode) <= 255)
                || typeof c.timedOut !== "boolean" || typeof c.oomKilled !== "boolean" || !hash(c.stdoutHash) || !hash(c.stderrHash)
                || key === "verification" && (c.exitCode !== 0 || c.timedOut || c.oomKilled))
                return invalid();
        }
    }
    return structuredClone(raw);
}
function readCodeJob(value) {
    if (!exact(value, "artifact,artifactHash,brief,createdAt,generation,holder,id,issue,leaseExpiresAt,missionId,mode,modelCalls,ownerId,planVersion,policy,policyHash,projectId,state,stepId,updatedAt")
        || !uuid(value.id) || !small(value.ownerId) || !small(value.missionId) || !small(value.stepId)
        || !Number.isSafeInteger(value.planVersion) || Number(value.planVersion) < 1 || !hash(value.policyHash)
        || !["prepare", "test"].includes(String(value.mode))
        || typeof value.brief !== "string" || !value.brief.trim() || value.brief.length > 4000
        || !["queued", "running", "paused", "ready", "needs_attention", "cancelled"].includes(String(value.state))
        || !Number.isSafeInteger(value.generation) || Number(value.generation) < 0
        || !Number.isInteger(value.modelCalls) || Number(value.modelCalls) < 0 || Number(value.modelCalls) > 3
        || !(value.holder === null || small(value.holder)) || !(value.leaseExpiresAt === null || date(value.leaseExpiresAt))
        || (value.state === "running") !== (value.holder !== null && value.leaseExpiresAt !== null)
        || !date(value.createdAt) || !date(value.updatedAt) || !(value.issue === null || issues.includes(String(value.issue)))
        || !(value.artifactHash === null || hash(value.artifactHash)) || (value.artifact === null) !== (value.artifactHash === null)
        || value.state === "ready" && value.artifact === null)
        return invalid();
    const policy = (0, codePreparation_js_1.readCodeProject)(value.policy);
    if (policy.ownerId !== value.ownerId || policy.id !== value.projectId || (0, codePreparation_js_1.codePolicyHash)(policy) !== value.policyHash)
        return invalid();
    const job = structuredClone({ ...value, policy });
    if (job.artifact !== null) {
        job.artifact = readCodeJobArtifact(job.artifact, job);
        if ((0, codePreparation_js_1.codeHash)((0, model_js_1.canonical)(job.artifact)) !== job.artifactHash)
            return invalid();
    }
    return job;
}
const read = readCodeJob;
const target = (v) => {
    if (!small(v.ownerId) || !small(v.missionId) || !small(v.stepId) || !Number.isSafeInteger(v.planVersion) || v.planVersion < 1)
        return invalid();
    return { p_owner_id: v.ownerId, p_mission_id: v.missionId, p_step_id: v.stepId, p_plan_version: v.planVersion };
};
const fence = (j) => ({ p_owner_id: j.ownerId, p_id: j.id, p_holder: j.holder, p_generation: j.generation });
const matches = (j, t) => j.ownerId === t.ownerId && j.missionId === t.missionId && j.stepId === t.stepId && j.planVersion === t.planVersion;
function createCodeJobs(client) {
    const call = async (name, args) => {
        let r;
        try {
            r = await client.rpc(`bras_droit_code_job_${name}`, args);
        }
        catch {
            throw new CodeJobsError("code_job_unavailable");
        }
        if (r.error)
            throw new CodeJobsError(/^code_job_(not_found|source_changed|conflict|invalid|access|lease_lost|model_budget|artifact)$/.test(r.error.message)
                ? r.error.message : "code_job_storage_failure");
        return r.data;
    };
    const result = (v, t) => { const r = read(v); if (!matches(r, t))
        return invalid(); return r; };
    return {
        async request(t, p) {
            p = (0, codePreparation_js_1.readCodeProject)(p);
            if (p.ownerId !== t.ownerId)
                return invalid();
            const r = result(await call("request", { ...target(t), p_policy_hash: (0, codePreparation_js_1.codePolicyHash)(p), p_policy: p }), t);
            if (r.policyHash !== (0, codePreparation_js_1.codePolicyHash)(p) || (0, model_js_1.canonical)(r.policy) !== (0, model_js_1.canonical)(p))
                return invalid();
            return r;
        },
        async get(t) { const v = await call("get", target(t)); return v === null ? null : result(v, t); },
        async claim(p, holder, mode = "prepare") {
            p = (0, codePreparation_js_1.readCodeProject)(p);
            if (!small(holder) || !["prepare", "test"].includes(mode))
                return invalid();
            const v = await call("claim", { p_owner_id: p.ownerId, p_project_id: p.id, p_policy_hash: (0, codePreparation_js_1.codePolicyHash)(p), p_holder: holder, p_mode: mode });
            if (v === null)
                return null;
            const r = read(v);
            if (r.state !== "running" || r.mode !== mode || r.holder !== holder || r.ownerId !== p.ownerId || r.policyHash !== (0, codePreparation_js_1.codePolicyHash)(p) || (0, model_js_1.canonical)(r.policy) !== (0, model_js_1.canonical)(p))
                return invalid();
            return r;
        },
        async authorize(j) { j = read(j); const v = await call("authorize", fence(j)); if (typeof v !== "boolean")
            return invalid(); return v; },
        async reserveModel(j) { j = read(j); const v = await call("reserve_model", fence(j)); if (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 3)
            return invalid(); return v; },
        async attach(j, a) {
            j = read(j);
            a = readCodeJobArtifact(a, j);
            const h = (0, codePreparation_js_1.codeHash)((0, model_js_1.canonical)(a));
            const r = result(await call("attach", { ...fence(j), p_artifact_hash: h, p_artifact: a }), j);
            if (r.generation !== j.generation || r.holder !== j.holder || r.artifactHash !== h || (0, model_js_1.canonical)(r.artifact) !== (0, model_js_1.canonical)(a))
                return invalid();
            return r;
        },
        async finish(j, state, issue) {
            j = read(j);
            const r = result(await call("finish", { ...fence(j), p_state: state, p_issue: issue }), j);
            if (r.generation !== j.generation || ![state, "paused", "cancelled"].includes(r.state) && !(state === "ready" && r.state === "needs_attention" && r.issue === "access"))
                return invalid();
            return r;
        },
        async wake(p) {
            p = (0, codePreparation_js_1.readCodeProject)(p);
            const v = await call("wake", { p_owner_id: p.ownerId, p_project_id: p.id, p_policy_hash: (0, codePreparation_js_1.codePolicyHash)(p) });
            if (typeof v !== "boolean")
                return invalid();
            return v;
        },
    };
}
