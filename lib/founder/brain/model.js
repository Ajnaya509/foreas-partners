"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistry = exports.effectful = exports.hash = void 0;
exports.canonical = canonical;
exports.inputHash = inputHash;
exports.containsSecret = containsSecret;
exports.cleanObjective = cleanObjective;
exports.sameMissionRequestIdentity = sameMissionRequestIdentity;
exports.buildMission = buildMission;
exports.missionView = missionView;
const node_crypto_1 = require("node:crypto");
const errors_js_1 = require("./errors.js");
function canonical(value, depth = 0) {
    if (depth > 12)
        throw new errors_js_1.MissionValidationError("input_too_deep");
    if (value === null || typeof value === "boolean" || typeof value === "string")
        return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value))
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(v => canonical(v, depth + 1)).join(",")}]`;
    if (typeof value === "object" && value && Object.getPrototypeOf(value) === Object.prototype) {
        const keys = Object.keys(value).sort();
        if (keys.some(k => ["__proto__", "constructor", "prototype"].includes(k)))
            throw new errors_js_1.MissionValidationError("input_key_refused");
        return `{${keys.map(k => `${JSON.stringify(k)}:${canonical(value[k], depth + 1)}`).join(",")}}`;
    }
    throw new errors_js_1.MissionValidationError("input_not_json");
}
const hash = (value) => (0, node_crypto_1.createHash)("sha256").update(canonical(value)).digest("hex");
exports.hash = hash;
const effectful = (capability) => !["read", "prepare"].includes(capability.risk);
exports.effectful = effectful;
function inputHash(mission, step) {
    return (0, exports.hash)({ ownerId: mission.ownerId, missionId: mission.id, planVersion: mission.planVersion,
        stepId: step.id, capabilityId: step.capabilityId, capabilityVersion: step.capabilityVersion, input: step.input });
}
function containsSecret(text) {
    return /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}|\bsk-ant-[A-Za-z0-9_-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b\d{6,}:[A-Za-z0-9_-]{25,}/.test(text);
}
function cleanObjective(value) {
    if (typeof value !== "string" || !value.trim() || value.length > 4_000)
        throw new errors_js_1.MissionValidationError("objective_invalid");
    if (containsSecret(value))
        throw new errors_js_1.MissionValidationError("secret_refused_use_secure_connection");
    return value.trim();
}
/**
 * Transport identity only, not authority or a permission to change an existing plan.
 * requestHash keeps its historical plan binding. A retry returns the original record
 * even when a model could propose different steps, without refreshing its mandate.
 */
function sameMissionRequestIdentity(mission, request) {
    try {
        const actor = request.actor;
        return typeof actor.ownerId === "string" && !!actor.ownerId
            && typeof actor.subject === "string" && !!actor.subject
            && ["admin", "telegram"].includes(actor.channel)
            && ["prepare", "live", "test"].includes(request.mode)
            && typeof request.requestId === "string" && /^[A-Za-z0-9_:.-]{1,160}$/.test(request.requestId)
            && mission.ownerId === actor.ownerId && mission.actor.ownerId === actor.ownerId
            && mission.actor.subject === actor.subject && mission.actor.channel === actor.channel
            && mission.requestId === request.requestId && mission.mode === request.mode
            && cleanObjective(mission.objective) === cleanObjective(request.objective);
    }
    catch {
        return false;
    }
}
class CapabilityRegistry {
    entries = new Map();
    constructor(capabilities) {
        for (const c of capabilities) {
            if (!/^[a-z][a-z0-9_.]{2,95}$/.test(c.id) || !Number.isInteger(c.version) || c.version < 1 || this.entries.has(c.id)) {
                throw new errors_js_1.MissionValidationError("capability_invalid_or_duplicate");
            }
            this.entries.set(c.id, c);
        }
    }
    get(id) { return this.entries.get(id); }
    describe() { return [...this.entries.values()].map(({ id, version, risk, description }) => ({ id, version, risk, description })); }
}
exports.CapabilityRegistry = CapabilityRegistry;
function buildMission(options) {
    const { actor, requestId, mode, mandate, registry } = options;
    const objective = cleanObjective(options.objective);
    if (!/^[A-Za-z0-9_:.-]{1,160}$/.test(requestId) || !["prepare", "live", "test"].includes(mode))
        throw new errors_js_1.MissionValidationError("request_invalid");
    if (!actor.ownerId || !actor.subject || !["telegram", "admin"].includes(actor.channel))
        throw new errors_js_1.MissionValidationError("actor_invalid");
    if (!Array.isArray(options.steps) || !options.steps.length || options.steps.length > 12)
        throw new errors_js_1.MissionValidationError("plan_size_invalid");
    if (!Number.isFinite(Date.parse(mandate.expiresAt)) || mandate.capabilityIds.length > 64 || mandate.approvedInputHashes.length > 12)
        throw new errors_js_1.MissionValidationError("mandate_invalid");
    const ids = new Set();
    const steps = options.steps.map(spec => {
        if (!/^[a-z][a-z0-9_-]{0,63}$/.test(spec.id) || ids.has(spec.id))
            throw new errors_js_1.MissionValidationError("step_id_invalid");
        ids.add(spec.id);
        const capability = registry.get(spec.capabilityId);
        if (!capability)
            throw new errors_js_1.MissionValidationError("capability_not_registered");
        const input = capability.validate(spec.input);
        const encoded = canonical(input);
        if (encoded.length > 16_000 || containsSecret(encoded))
            throw new errors_js_1.MissionValidationError("input_sensitive_or_too_large");
        if (!Array.isArray(spec.dependsOn) || spec.dependsOn.length > 11 || new Set(spec.dependsOn).size !== spec.dependsOn.length)
            throw new errors_js_1.MissionValidationError("dependencies_invalid");
        return { id: spec.id, capabilityId: capability.id, capabilityVersion: capability.version, input,
            dependsOn: [...spec.dependsOn], status: "pending", attempts: 0 };
    });
    const done = new Set();
    for (let i = 0; i < steps.length; i++) {
        for (const step of steps) {
            if (step.dependsOn.some(id => !ids.has(id) || id === step.id))
                throw new errors_js_1.MissionValidationError("dependency_missing");
            if (step.dependsOn.every(id => done.has(id)))
                done.add(step.id);
        }
    }
    if (done.size !== steps.length)
        throw new errors_js_1.MissionValidationError("dependency_cycle");
    const at = (options.now ?? new Date()).toISOString();
    // Authentication timestamps may change on a transport retry. Logical input must not.
    const requestHash = (0, exports.hash)({ ownerId: actor.ownerId, subject: actor.subject, channel: actor.channel, requestId, objective, mode,
        steps: steps.map(({ id, capabilityId, capabilityVersion, input, dependsOn }) => ({ id, capabilityId, capabilityVersion, input, dependsOn })) });
    return { id: options.id ?? (0, node_crypto_1.randomUUID)(), ownerId: actor.ownerId, requestId, requestHash, objective,
        actor: structuredClone(actor), mode, planVersion: 1, status: "queued", createdAt: at, updatedAt: at,
        mandate: structuredClone(mandate), steps };
}
/** Do not send raw supplier records, input hashes or internal authorizations to a client. */
function missionView(record) {
    const m = record.mission;
    return { id: m.id, objective: m.objective, status: m.status, control: record.control, mode: m.mode,
        createdAt: m.createdAt, updatedAt: m.updatedAt, planVersion: m.planVersion,
        steps: m.steps.map(s => ({ id: s.id, capability: s.capabilityId, status: s.status,
            needs: (s.needs ?? []), result: s.result ? s.result : null,
            error: s.error ?? null })) };
}
