"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionAuthError = exports.MISSION_AUTH_MAX_BODY_BYTES = exports.MISSION_AUTH_CLOCK_SKEW_MS = exports.MISSION_AUTH_MAX_AGE_MS = exports.MISSION_AUTH_MAX_TTL_MS = exports.MISSION_AUTH_HEADER = void 0;
exports.precheckMissionAuthority = precheckMissionAuthority;
exports.verifyMissionAuthority = verifyMissionAuthority;
exports.signMissionAuthority = signMissionAuthority;
const node_crypto_1 = require("node:crypto");
/** Independent of the public/chat API key. Only trusted server gateways sign. */
exports.MISSION_AUTH_HEADER = "x-mission-authority";
exports.MISSION_AUTH_MAX_TTL_MS = 60_000;
exports.MISSION_AUTH_MAX_AGE_MS = 5 * 60_000;
exports.MISSION_AUTH_CLOCK_SKEW_MS = 5_000;
exports.MISSION_AUTH_MAX_BODY_BYTES = 1_048_576;
const MAX_ATTESTATION_BYTES = 4_096;
const PATH_PREFIX = "/founder/v1/missions";
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
class MissionAuthError extends Error {
    code;
    constructor(code) {
        super(`mission_authority_${code}`);
        this.code = code;
        this.name = "MissionAuthError";
    }
}
exports.MissionAuthError = MissionAuthError;
function reject(code = "invalid") {
    throw new MissionAuthError(code);
}
function record(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
        return false;
    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}
function exactKeys(value, expected) {
    const keys = Object.keys(value);
    return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
function isTelegramId(value) {
    return typeof value === "string" && /^[1-9][0-9]{0,15}$/.test(value)
        && Number.isSafeInteger(Number(value)) && String(Number(value)) === value;
}
function isoMillis(value) {
    if (typeof value !== "string" || value.length !== 24)
        return reject();
    const time = Date.parse(value);
    if (!Number.isSafeInteger(time) || new Date(time).toISOString() !== value)
        return reject();
    return time;
}
function decodeCanonical(value) {
    if (!BASE64URL.test(value))
        return reject();
    const decoded = Buffer.from(value, "base64url");
    if (decoded.toString("base64url") !== value)
        return reject();
    return decoded;
}
function keyBytes(value) {
    if (typeof value !== "string" || value.length < 43 || value.length > 86 || !BASE64URL.test(value)) {
        return reject("configuration");
    }
    const bytes = Buffer.from(value, "base64url");
    // Diversity rejects obvious placeholders. Only random generation establishes entropy.
    if (bytes.toString("base64url") !== value || bytes.length < 32 || bytes.length > 64 || new Set(bytes).size < 16) {
        return reject("configuration");
    }
    return bytes;
}
function validateConfiguration(options) {
    if (!options || typeof options.audience !== "string" || typeof options.ownerId !== "string"
        || !IDENTIFIER.test(options.audience) || !IDENTIFIER.test(options.ownerId)
        || !record(options.gateways) || !Array.isArray(options.forbiddenSecrets)
        || options.forbiddenSecrets.some((value) => typeof value !== "string")
        || (options.now !== undefined && typeof options.now !== "function")) {
        return reject("configuration");
    }
    const channels = Object.keys(options.gateways);
    if (!channels.length || channels.some((channel) => channel !== "admin" && channel !== "telegram"))
        return reject("configuration");
    const keys = new Map();
    for (const channel of channels) {
        const gateway = options.gateways[channel];
        if (!record(gateway) || !exactKeys(gateway, ["subject", "secret"])
            || typeof gateway.subject !== "string"
            || (channel === "admin" ? !UUID.test(gateway.subject) : !isTelegramId(gateway.subject)))
            return reject("configuration");
        const key = keyBytes(gateway.secret);
        if (options.forbiddenSecrets.some((old) => old === gateway.secret
            || (BASE64URL.test(old) && Buffer.from(old, "base64url").equals(key))
            || Buffer.from(old, "utf8").equals(key)))
            return reject("configuration");
        if ([...keys.values()].some((other) => other.equals(key)))
            return reject("configuration");
        keys.set(channel, key);
    }
    return keys;
}
function validateOptions(options) {
    const keys = validateConfiguration(options);
    if (typeof options.consumeNonce !== "function")
        return reject("configuration");
    return keys;
}
function nowMillis(options) {
    const now = options.now ? options.now() : Date.now();
    if (!Number.isSafeInteger(now) || now < 0)
        return reject("configuration");
    return now;
}
function validateTarget(request) {
    if (!request || typeof request.method !== "string" || !METHODS.has(request.method)
        || typeof request.path !== "string" || request.path.length > 2_048
        || !/^\/[\x21-\x7e]+$/.test(request.path) || /[#\\]/.test(request.path)
        || !(request.path === PATH_PREFIX || request.path.startsWith(`${PATH_PREFIX}/`) || request.path.startsWith(`${PATH_PREFIX}?`)))
        return reject();
}
function requestDigest(request) {
    validateTarget(request);
    if (!(request.body instanceof Uint8Array) || request.body.byteLength > exports.MISSION_AUTH_MAX_BODY_BYTES)
        return reject();
    return (0, node_crypto_1.createHash)("sha256").update(request.body).digest("hex");
}
/** Fixed order, strict field types and one representation avoid ambiguous signing. */
function canonical(claims) {
    return JSON.stringify({
        version: claims.version,
        audience: claims.audience,
        method: claims.method,
        path: claims.path,
        bodySha256: claims.bodySha256,
        actor: {
            ownerId: claims.actor.ownerId,
            channel: claims.actor.channel,
            subject: claims.actor.subject,
            assurance: claims.actor.assurance,
            authenticatedAt: claims.actor.authenticatedAt,
        },
        issuedAt: claims.issuedAt,
        expiresAt: claims.expiresAt,
        nonce: claims.nonce,
    });
}
function validateClaims(value, options, now) {
    if (!record(value) || !exactKeys(value, ["version", "audience", "method", "path", "bodySha256", "actor", "issuedAt", "expiresAt", "nonce"])
        || value.version !== 1 || value.audience !== options.audience
        || typeof value.method !== "string" || !METHODS.has(value.method)
        || typeof value.path !== "string" || typeof value.bodySha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.bodySha256)
        || typeof value.nonce !== "string" || value.nonce.length !== 43 || decodeCanonical(value.nonce).length !== 32
        || !record(value.actor) || !exactKeys(value.actor, ["ownerId", "channel", "subject", "assurance", "authenticatedAt"]))
        return reject();
    const actor = value.actor;
    if (actor.ownerId !== options.ownerId || (actor.channel !== "admin" && actor.channel !== "telegram"))
        return reject();
    const gateway = options.gateways[actor.channel];
    if (!gateway || actor.subject !== gateway.subject
        || actor.assurance !== (actor.channel === "admin" ? "mfa" : "owner"))
        return reject();
    // No parseInt: 123junk, 01, negative/group IDs and unsafe rounded integers are refused.
    if (actor.channel === "telegram" && !isTelegramId(actor.subject))
        return reject();
    const issued = isoMillis(value.issuedAt);
    const expires = isoMillis(value.expiresAt);
    const authenticated = isoMillis(actor.authenticatedAt);
    if (issued > now + exports.MISSION_AUTH_CLOCK_SKEW_MS || expires <= now || expires <= issued
        || expires - issued > exports.MISSION_AUTH_MAX_TTL_MS || authenticated > issued
        || now - authenticated > exports.MISSION_AUTH_MAX_AGE_MS || issued - authenticated > exports.MISSION_AUTH_MAX_AGE_MS)
        return reject();
    return value;
}
/** Shared verification only; its claims never escape the module as authentication. */
function readSignedClaims(request, options, keys = validateConfiguration(options)) {
    const now = nowMillis(options);
    validateTarget(request);
    if (typeof request.attestation !== "string" || request.attestation.length > MAX_ATTESTATION_BYTES)
        return reject();
    const parts = request.attestation.split(".");
    if (parts.length !== 3 || parts[0] !== "v1" || parts[2].length !== 43)
        return reject();
    const decoded = decodeCanonical(parts[1]);
    const signature = decodeCanonical(parts[2]);
    let parsed;
    try {
        parsed = JSON.parse(decoded.toString("utf8"));
    }
    catch {
        return reject();
    }
    const claims = validateClaims(parsed, options, now);
    if (canonical(claims) !== decoded.toString("utf8") || claims.method !== request.method
        || claims.path !== request.path)
        return reject();
    const key = keys.get(claims.actor.channel);
    if (!key)
        return reject();
    const expected = (0, node_crypto_1.createHmac)("sha256", key).update(`v1.${parts[1]}`).digest();
    if (signature.length !== expected.length || !(0, node_crypto_1.timingSafeEqual)(signature, expected))
        return reject();
    return claims;
}
/**
 * Pure admission filter before reading an HTTP body. Returns no actor or reusable grant.
 * A valid header may still have a wrong/missing body or spent nonce: it is NOT authenticated.
 * The full verifier must repeat these checks against current time/configuration afterward.
 */
function precheckMissionAuthority(request, options) {
    readSignedClaims(request, options);
}
/**
 * No network, old API key, incoming channel or local nonce-memory fallback.
 * The HTTP adapter must retain and process the same body bytes after verification.
 */
async function verifyMissionAuthority(request, options) {
    const keys = validateOptions(options);
    const claims = readSignedClaims(request, options, keys);
    if (claims.bodySha256 !== requestDigest(request))
        return reject();
    const nonceClaim = {
        ownerId: claims.actor.ownerId, audience: claims.audience, channel: claims.actor.channel,
        nonce: claims.nonce, expiresAt: claims.expiresAt,
    };
    let consumed;
    try {
        consumed = await options.consumeNonce(nonceClaim);
    }
    catch {
        return reject("storage_unavailable");
    }
    if (consumed !== true)
        return reject(consumed === false ? "replayed" : "storage_unavailable");
    // Re-check elapsed time after a slow store. A nonce consumed during expiry stays spent.
    validateClaims(claims, options, nowMillis(options));
    return Object.freeze({ ...claims.actor });
}
/** Server-to-server issuer only: it cannot establish login/MFA; the gateway must. */
function signMissionAuthority(request, actor, options, proof = {}) {
    const keys = validateOptions(options);
    const now = nowMillis(options);
    const claims = validateClaims({
        version: 1, audience: options.audience, method: request.method, path: request.path,
        bodySha256: requestDigest(request), actor,
        issuedAt: proof.issuedAt ?? new Date(now).toISOString(),
        expiresAt: proof.expiresAt ?? new Date(now + exports.MISSION_AUTH_MAX_TTL_MS).toISOString(),
        nonce: proof.nonce ?? (0, node_crypto_1.randomBytes)(32).toString("base64url"),
    }, options, now);
    const part = Buffer.from(canonical(claims), "utf8").toString("base64url");
    const key = keys.get(claims.actor.channel);
    if (!key)
        return reject("configuration");
    return `v1.${part}.${(0, node_crypto_1.createHmac)("sha256", key).update(`v1.${part}`).digest("base64url")}`;
}
