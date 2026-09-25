"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramRepliesError = void 0;
exports.readTelegramDeliveryStatus = readTelegramDeliveryStatus;
exports.createTelegramReplies = createTelegramReplies;
const node_crypto_1 = require("node:crypto");
const telegramInbox_js_1 = require("./telegramInbox.js");
class TelegramRepliesError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "TelegramRepliesError";
    }
}
exports.TelegramRepliesError = TelegramRepliesError;
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const small = (v) => typeof v === "string" && v.trim() === v && v.length > 0 && v.length <= 128;
const number = (v, min = 0) => Number.isSafeInteger(v) && Number(v) >= min;
const date = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));
const digest = (v) => v === null || typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const uuid = (v) => typeof v === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const sha = (s) => (0, node_crypto_1.createHash)("sha256").update(s, "utf8").digest("hex");
const invalid = () => { throw new TelegramRepliesError("telegram_reply_invalid_response"); };
function readTelegramDeliveryStatus(value) {
    if (value === null)
        return null;
    if (!object(value) || Object.keys(value).sort().join(",") !== "lastMessageId,matchesCurrentMission,state,updatedAt"
        || !["not_queued", "pending", "claimed", "ready", "dispatching", "sent", "unknown", "rejected"].includes(String(value.state))
        || !(value.updatedAt === null || date(value.updatedAt)) || !(value.lastMessageId === null || number(value.lastMessageId, 1))
        || typeof value.matchesCurrentMission !== "boolean" || (value.matchesCurrentMission && (value.state !== "sent" || value.lastMessageId === null))
        || (value.state === "not_queued" && (value.updatedAt !== null || value.lastMessageId !== null || value.matchesCurrentMission)))
        return invalid();
    return structuredClone(value);
}
function read(v) {
    if (!object(v) || !small(v.inboxId) || !small(v.ownerId) || typeof v.botScopeId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(v.botScopeId)
        || typeof v.telegramSubject !== "string" || !/^[1-9][0-9]{0,15}$/.test(v.telegramSubject) || BigInt(v.telegramSubject) > 4503599627370495n
        || !number(v.inboxRevision) || !(v.missionRevision === null || number(v.missionRevision)) || !number(v.revision) || !number(v.generation, 1)
        || !["pending", "claimed", "ready", "dispatching", "sent", "unknown", "rejected"].includes(String(v.state))
        || !(v.holder === null || small(v.holder)) || !(v.leaseExpiresAt === null || date(v.leaseExpiresAt)) || !date(v.updatedAt)
        || ["claimed", "ready", "dispatching"].includes(String(v.state)) !== (v.holder !== null && v.leaseExpiresAt !== null)
        || !(v.text === null || typeof v.text === "string" && v.text.trim().length > 0 && v.text.length <= 3500 && Buffer.byteLength(v.text) <= 14000)
        || !digest(v.textHash) || !digest(v.lastSentHash) || (v.text === null) !== (v.textHash === null)
        || (typeof v.text === "string" && sha(v.text) !== v.textHash) || !(v.dispatchId === null || uuid(v.dispatchId))
        || ["ready", "dispatching", "sent", "unknown", "rejected"].includes(String(v.state)) && v.text === null
        || ["dispatching", "unknown", "rejected"].includes(String(v.state)) && v.dispatchId === null)
        return invalid();
    if (v.receipt !== null) {
        const r = v.receipt;
        if (!object(r) || Object.keys(r).sort().join(",") !== "botId,chatId,messageId,observedAt,text"
            || !number(r.messageId, 1) || r.chatId !== v.telegramSubject || typeof r.botId !== "string"
            || !/^[1-9][0-9]{0,15}$/.test(r.botId) || BigInt(r.botId) > 4503599627370495n
            || typeof r.text !== "string" || !date(r.observedAt) || sha(r.text) !== v.lastSentHash)
            return invalid();
    }
    if (v.state === "sent" && (v.receipt === null || v.textHash !== v.lastSentHash))
        return invalid();
    return structuredClone(v);
}
function same(before, after) {
    return before.inboxId === after.inboxId && before.ownerId === after.ownerId && before.botScopeId === after.botScopeId
        && before.telegramSubject === after.telegramSubject && before.inboxRevision === after.inboxRevision
        && before.missionRevision === after.missionRevision && before.generation === after.generation;
}
function createTelegramReplies(client) {
    async function call(name, args) {
        let response;
        try {
            response = await client.rpc(`bras_droit_telegram_reply_${name}`, args);
        }
        catch {
            throw new TelegramRepliesError("telegram_reply_unavailable");
        }
        if (response.error)
            throw new TelegramRepliesError(/^telegram_reply_(invalid|not_found|lease_lost|revision_conflict|source_changed|source_mismatch|state_conflict)$/.test(response.error.message)
                ? response.error.message : "telegram_reply_storage_failure");
        return response.data;
    }
    const target = (r) => ({ p_owner_id: r.ownerId, p_inbox_id: r.inboxId });
    const fence = (r) => ({ ...target(r), p_holder: r.holder, p_generation: r.generation, p_revision: r.revision });
    function changed(before, value) {
        const after = read(value);
        if (!same(before, after) || after.revision !== before.revision + 1)
            return invalid();
        return after;
    }
    return {
        async statusByMission(ownerId, missionId) {
            if (!small(ownerId) || !small(missionId))
                return invalid();
            return readTelegramDeliveryStatus(await call("status", { p_owner_id: ownerId, p_mission_id: missionId }));
        },
        async get(ownerId, inboxId) {
            if (!small(ownerId) || !small(inboxId))
                return invalid();
            const value = await call("get", { p_owner_id: ownerId, p_inbox_id: inboxId });
            if (value === null)
                return null;
            const result = read(value);
            if (result.ownerId !== ownerId || result.inboxId !== inboxId)
                return invalid();
            return result;
        },
        async claim(input) {
            const value = await call("claim", { p_owner_id: input.ownerId, p_bot_scope_id: input.botScopeId,
                p_subject: input.telegramSubject, p_holder: input.holder, p_lease_seconds: input.leaseSeconds });
            if (value === null)
                return null;
            if (!object(value))
                return invalid();
            const reply = read(value.reply), inbox = (0, telegramInbox_js_1.readTelegramInboxRecord)(value.inbox);
            const mission = value.mission;
            if (reply.state !== "claimed" || reply.holder !== input.holder || reply.ownerId !== input.ownerId || reply.botScopeId !== input.botScopeId
                || reply.telegramSubject !== input.telegramSubject || reply.inboxId !== inbox.id || reply.inboxRevision !== inbox.revision
                || inbox.ownerId !== reply.ownerId || inbox.botScopeId !== reply.botScopeId || inbox.telegramSubject !== reply.telegramSubject
                || inbox.chatId !== reply.telegramSubject || (inbox.missionId === null) !== (mission === null))
                return invalid();
            if (mission !== null && (!object(mission) || !object(mission.mission) || !number(mission.revision)
                || mission.revision !== reply.missionRevision || mission.mission.id !== inbox.missionId || mission.mission.ownerId !== inbox.ownerId
                || mission.mission.requestId !== inbox.requestId || mission.mission.objective !== inbox.objective
                || !object(mission.mission.actor) || mission.mission.actor.channel !== "telegram" || mission.mission.actor.subject !== inbox.telegramSubject
                || !Array.isArray(mission.mission.steps)))
                return invalid();
            if (mission === null && reply.missionRevision !== null)
                return invalid();
            return structuredClone({ reply, inbox, mission });
        },
        async prepare(previous, text) {
            previous = read(previous);
            if (previous.state !== "claimed" || typeof text !== "string" || !text.trim() || text.length > 3500)
                return invalid();
            const result = changed(previous, await call("prepare", { ...fence(previous), p_text: text }));
            if (result.text !== text || result.lastSentHash !== previous.lastSentHash || !["sent", "ready"].includes(result.state))
                return invalid();
            if (result.state === "ready" && (result.holder !== previous.holder || result.leaseExpiresAt !== previous.leaseExpiresAt))
                return invalid();
            return result;
        },
        async begin(previous, dispatchId) {
            previous = read(previous);
            if (previous.state !== "ready" || !uuid(dispatchId))
                return invalid();
            const result = changed(previous, await call("begin", { ...fence(previous), p_dispatch_id: dispatchId }));
            if (result.state !== "dispatching" || result.dispatchId !== dispatchId || result.text !== previous.text
                || result.holder !== previous.holder || result.leaseExpiresAt !== previous.leaseExpiresAt)
                return invalid();
            return result;
        },
        async finish(previous, outcome, receipt) {
            previous = read(previous);
            if (!previous.dispatchId || !["dispatching", "unknown", "sent"].includes(previous.state))
                return invalid();
            const result = read(await call("finish", { ...target(previous), p_dispatch_id: previous.dispatchId, p_outcome: outcome, p_receipt: receipt ?? null }));
            if (!same(previous, result) || result.dispatchId !== previous.dispatchId || result.text !== previous.text || result.state !== outcome
                || result.revision < previous.revision || (outcome === "sent" && (!receipt || !result.receipt
                || Object.keys(receipt).some(key => result.receipt[key] !== receipt[key]))))
                return invalid();
            return result;
        },
        async release(previous) {
            previous = read(previous);
            const result = await call("release", { ...target(previous), p_holder: previous.holder, p_generation: previous.generation });
            if (typeof result !== "boolean")
                return invalid();
            return result;
        },
    };
}
