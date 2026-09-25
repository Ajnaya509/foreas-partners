"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadGrantRepositoryError = void 0;
exports.createReadGrantRepository = createReadGrantRepository;
class ReadGrantRepositoryError extends Error {
    code;
    databaseCode;
    constructor(code, databaseCode) {
        super(code);
        this.code = code;
        this.databaseCode = databaseCode;
        this.name = "ReadGrantRepositoryError";
    }
}
exports.ReadGrantRepositoryError = ReadGrantRepositoryError;
const opaque = (value, max = 128) => typeof value === "string"
    && value.length >= 1 && value.length <= max && value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
const capability = (value) => typeof value === "string" && /^[a-z][a-z0-9_.]{2,95}$/.test(value);
const hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const uuid = (value) => typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const date = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
function invalid() { throw new ReadGrantRepositoryError("read_grant_invalid"); }
function checkScope(ownerId, capabilityId, scopeHash) {
    if (!opaque(ownerId) || !capability(capabilityId) || !hash(scopeHash))
        invalid();
}
function read(value, ownerId) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new ReadGrantRepositoryError("read_grant_invalid_repository_response");
    const r = value;
    if (!uuid(r.id) || r.ownerId !== ownerId || !opaque(r.issuedBy, 256) || !capability(r.capabilityId) || !hash(r.scopeHash)
        || !date(r.issuedAt) || !date(r.expiresAt) || Date.parse(r.expiresAt) <= Date.parse(r.issuedAt)
        || (r.revokedAt !== null && (!date(r.revokedAt) || Date.parse(r.revokedAt) < Date.parse(r.issuedAt)))) {
        throw new ReadGrantRepositoryError("read_grant_invalid_repository_response");
    }
    return r;
}
/** No authority comes from this client. Trusted HTTP checks current owner + MFA,
 * capability risk and scope before issuing; workers re-read the grant before use.
 * No implicit client, local fallback, secret, or write approval is created here. */
function createReadGrantRepository(client) {
    async function call(name, args) {
        let response;
        try {
            response = await client.rpc(`bras_droit_read_grant_${name}`, args);
        }
        catch {
            throw new ReadGrantRepositoryError("read_grant_repository_unavailable");
        }
        if (response.error) {
            throw new ReadGrantRepositoryError(response.error.message === "read_grant_invalid"
                ? "read_grant_invalid" : "read_grant_repository_failure", response.error.code);
        }
        return response.data;
    }
    return {
        async issue(input) {
            checkScope(input.ownerId, input.capabilityId, input.scopeHash);
            if (!opaque(input.issuedBy, 256) || !Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 1440)
                invalid();
            const r = read(await call("issue", { p_owner_id: input.ownerId, p_issued_by: input.issuedBy,
                p_capability_id: input.capabilityId, p_scope_hash: input.scopeHash, p_duration_minutes: input.durationMinutes }), input.ownerId);
            if (r.issuedBy !== input.issuedBy || r.capabilityId !== input.capabilityId || r.scopeHash !== input.scopeHash || r.revokedAt !== null) {
                throw new ReadGrantRepositoryError("read_grant_invalid_repository_response");
            }
            return r;
        },
        async get(ownerId, capabilityId, scopeHash) {
            checkScope(ownerId, capabilityId, scopeHash);
            const value = await call("get", { p_owner_id: ownerId, p_capability_id: capabilityId, p_scope_hash: scopeHash });
            if (value === null)
                return null;
            const r = read(value, ownerId);
            if (r.capabilityId !== capabilityId || r.scopeHash !== scopeHash || r.revokedAt !== null)
                throw new ReadGrantRepositoryError("read_grant_invalid_repository_response");
            return r;
        },
        async revoke(ownerId, grantId) {
            if (!opaque(ownerId) || !uuid(grantId))
                invalid();
            const value = await call("revoke", { p_owner_id: ownerId, p_grant_id: grantId });
            if (typeof value !== "boolean")
                throw new ReadGrantRepositoryError("read_grant_invalid_repository_response");
            return value;
        },
        async list(ownerId) {
            if (!opaque(ownerId))
                invalid();
            const value = await call("list", { p_owner_id: ownerId });
            if (!Array.isArray(value))
                throw new ReadGrantRepositoryError("read_grant_invalid_repository_response");
            return value.map(r => read(r, ownerId));
        },
    };
}
