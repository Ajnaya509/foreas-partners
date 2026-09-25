"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionRepositoryError = void 0;
exports.createMissionRepository = createMissionRepository;
class MissionRepositoryError extends Error {
    code;
    databaseCode;
    constructor(code, databaseCode) {
        super(code);
        this.code = code;
        this.databaseCode = databaseCode;
        this.name = "MissionRepositoryError";
    }
}
exports.MissionRepositoryError = MissionRepositoryError;
const domainErrors = new Set([
    "mission_invalid", "mission_not_found", "mission_replay_conflict", "mission_id_conflict",
    "mission_lease_lost", "mission_revision_conflict", "mission_identity_changed",
    "mission_plan_changed", "mission_terminal", "mission_cancelled", "mission_lease_active",
    "mission_need_mismatch", "mission_command_invalid", "mission_nonce_invalid",
]);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function record(value) {
    if (!object(value) || !object(value.mission) || !Number.isSafeInteger(value.revision)
        || value.revision < 0 || !["run", "pause", "cancel"].includes(String(value.control))
        || typeof value.mission.id !== "string" || typeof value.mission.ownerId !== "string"
        || !Array.isArray(value.mission.steps)
        || (value.lease !== null && (!object(value.lease) || typeof value.lease.holder !== "string"
            || !Number.isSafeInteger(value.lease.generation) || value.lease.generation < 1
            || typeof value.lease.expiresAt !== "string" || !Number.isFinite(Date.parse(value.lease.expiresAt))))) {
        throw new MissionRepositoryError("mission_invalid_repository_response");
    }
    return value;
}
/** RPC-only production repository. A database error never falls back to local memory. */
function createMissionRepository(client) {
    async function call(name, args) {
        let response;
        try {
            response = await client.rpc(`bras_droit_mission_${name}`, args);
        }
        catch {
            throw new MissionRepositoryError("mission_repository_unavailable");
        }
        if (response.error) {
            const code = domainErrors.has(response.error.message) ? response.error.message : "mission_repository_failure";
            // Raw provider error details can contain inputs; they are intentionally not forwarded.
            throw new MissionRepositoryError(code, response.error.code);
        }
        return response.data;
    }
    function limit(value) {
        if (!Number.isInteger(value) || value < 1 || value > 100)
            throw new MissionRepositoryError("mission_invalid");
        return value;
    }
    return {
        async create(mission) {
            const value = await call("create", { p_mission: mission });
            if (!object(value) || typeof value.replay !== "boolean")
                throw new MissionRepositoryError("mission_invalid_repository_response");
            return { record: record(value.record), replay: value.replay };
        },
        async get(ownerId, missionId) {
            const value = await call("get", { p_owner_id: ownerId, p_mission_id: missionId });
            return value === null ? null : record(value);
        },
        async getByRequestId(ownerId, requestId) {
            if (typeof ownerId !== "string" || !ownerId.trim() || ownerId.length > 128
                || typeof requestId !== "string" || !requestId.trim() || requestId.length > 200)
                throw new MissionRepositoryError("mission_invalid");
            const value = await call("get_by_request_id", { p_owner_id: ownerId, p_request_id: requestId });
            if (value === null)
                return null;
            const result = record(value);
            if (result.mission.ownerId !== ownerId || result.mission.requestId !== requestId)
                throw new MissionRepositoryError("mission_invalid_repository_response");
            return result;
        },
        async list(ownerId, count) {
            const value = await call("list", { p_owner_id: ownerId, p_limit: limit(count) });
            if (!Array.isArray(value))
                throw new MissionRepositoryError("mission_invalid_repository_response");
            return value.map(record);
        },
        async claim(holder, leaseSeconds) {
            if (!holder.trim() || holder.length > 128 || !Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) {
                throw new MissionRepositoryError("mission_invalid");
            }
            const value = await call("claim", { p_holder: holder, p_lease_seconds: leaseSeconds });
            return value === null ? null : record(value);
        },
        async commit(previous, mission, event, release) {
            if (!previous.lease)
                throw new MissionRepositoryError("mission_lease_lost");
            return record(await call("commit", {
                p_owner_id: previous.mission.ownerId, p_mission_id: previous.mission.id,
                p_holder: previous.lease.holder, p_generation: previous.lease.generation,
                p_revision: previous.revision, p_mission: mission, p_event: event, p_release: release,
            }));
        },
        async command(ownerId, missionId, command) {
            return record(await call("command", { p_owner_id: ownerId, p_mission_id: missionId, p_command: command }));
        },
        async events(ownerId, missionId, count) {
            const value = await call("events", { p_owner_id: ownerId, p_mission_id: missionId, p_limit: limit(count) });
            if (!Array.isArray(value) || value.some(e => !object(e) || typeof e.type !== "string"
                || typeof e.at !== "string" || !object(e.data)))
                throw new MissionRepositoryError("mission_invalid_repository_response");
            return value;
        },
        async consumeNonce(nonce, expiresAt) {
            if (!nonce.trim() || nonce.length > 256 || !Number.isFinite(Date.parse(expiresAt)))
                throw new MissionRepositoryError("mission_nonce_invalid");
            const value = await call("consume_nonce", { p_nonce: nonce, p_expires_at: expiresAt });
            if (typeof value !== "boolean")
                throw new MissionRepositoryError("mission_invalid_repository_response");
            return value;
        },
    };
}
