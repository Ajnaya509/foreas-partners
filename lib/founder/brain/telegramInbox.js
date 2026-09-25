"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramInboxError = void 0;
exports.telegramMissionRequestId = telegramMissionRequestId;
exports.canCreateTelegramInboxMission = canCreateTelegramInboxMission;
exports.readTelegramInboxRecord = parseRecord;
exports.createTelegramInbox = createTelegramInbox;
const node_crypto_1 = require("node:crypto");
const model_js_1 = require("./model.js");
class TelegramInboxError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = 'TelegramInboxError';
    }
}
exports.TelegramInboxError = TelegramInboxError;
const knownErrors = new Set(['telegram_inbox_invalid', 'telegram_inbox_replay_conflict', 'telegram_inbox_not_found',
    'telegram_inbox_lease_lost', 'telegram_inbox_revision_conflict', 'telegram_inbox_transcript_conflict',
    'telegram_inbox_mission_mismatch', 'telegram_inbox_issue_invalid', 'telegram_inbox_origin_expired']);
const issues = ['origin_expired', 'access_revoked', 'transcription_unavailable', 'transcription_rejected',
    'submission_unknown', 'mission_conflict', 'reply_missing', 'processing_failed'];
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const bounded = (v, max = 128) => typeof v === 'string' && v.length > 0 && v.length <= max && v.trim() === v;
const integer = (v, minimum = 0) => Number.isSafeInteger(v) && v >= minimum;
const date = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const invalid = () => { throw new TelegramInboxError('telegram_inbox_invalid'); };
function exactKeys(v, keys) { return Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)); }
function validateAdmission(v) {
    if (!object(v) || !exactKeys(v, ['ownerId', 'botScopeId', 'telegramSubject', 'chatId', 'updateId', 'messageId', 'eventSha256', 'originVerifiedAt', 'originExpiresAt', 'input'])
        || !bounded(v.ownerId) || typeof v.botScopeId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v.botScopeId)
        || typeof v.telegramSubject !== 'string' || !/^[1-9][0-9]{0,15}$/.test(v.telegramSubject)
        || BigInt(v.telegramSubject) > 4503599627370495n || v.chatId !== v.telegramSubject
        || !integer(v.updateId) || !integer(v.messageId, 1) || typeof v.eventSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.eventSha256)
        || !date(v.originVerifiedAt) || !date(v.originExpiresAt) || !object(v.input))
        return invalid();
    const verified = Date.parse(v.originVerifiedAt), expires = Date.parse(v.originExpiresAt);
    if (expires <= verified || expires - verified > 300_000)
        invalid();
    const input = v.input;
    if (input.kind === 'text' && exactKeys(input, ['kind', 'objective'])) {
        try {
            if ((0, model_js_1.cleanObjective)(input.objective) !== input.objective)
                invalid();
        }
        catch {
            invalid();
        }
    }
    else if (input.kind === 'voice' && exactKeys(input, ['kind', 'voiceFileRef'])) {
        if (typeof input.voiceFileRef !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(input.voiceFileRef))
            invalid();
    }
    else
        invalid();
    return structuredClone(v);
}
function telegramMissionRequestId(botScopeId, updateId) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(botScopeId) || !integer(updateId))
        invalid();
    return `tg-mission:${botScopeId}:${updateId}`;
}
/** Convenience guard only; the worker still checks current access and fenced DB state before submission. */
function canCreateTelegramInboxMission(record, now) {
    const time = now.getTime();
    return Number.isFinite(time) && record.state === 'processing' && record.missionId === null
        && !!record.objective && record.lease?.phase === 'submit'
        && Date.parse(record.originExpiresAt) > time && Date.parse(record.lease.expiresAt) > time;
}
function parseRecord(v) {
    if (!object(v) || !bounded(v.id) || !bounded(v.ownerId) || typeof v.botScopeId !== 'string'
        || !/^[A-Za-z0-9_-]{1,64}$/.test(v.botScopeId) || !integer(v.updateId) || !integer(v.messageId, 1)
        || v.requestId !== telegramMissionRequestId(v.botScopeId, v.updateId) || typeof v.telegramSubject !== 'string'
        || !/^[1-9][0-9]{0,15}$/.test(v.telegramSubject) || BigInt(v.telegramSubject) > 4503599627370495n || v.chatId !== v.telegramSubject
        || !date(v.originVerifiedAt) || !date(v.originExpiresAt) || !date(v.receivedAt) || !date(v.updatedAt)
        || Date.parse(v.originExpiresAt) <= Date.parse(v.originVerifiedAt)
        || Date.parse(v.originExpiresAt) - Date.parse(v.originVerifiedAt) > 300_000
        || !integer(v.revision) || !integer(v.attempts) || !['text', 'voice'].includes(String(v.kind))
        || !['received', 'processing', 'submitted', 'needs_attention'].includes(String(v.state))
        || !(v.objective === null || (typeof v.objective === 'string' && v.objective.length > 0 && v.objective.length <= 4000))
        || !(v.voiceFileRef === null || (typeof v.voiceFileRef === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(v.voiceFileRef)))
        || (v.kind === 'text' && (v.objective === null || v.voiceFileRef !== null)) || (v.kind === 'voice' && v.voiceFileRef === null)
        || typeof v.eventSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.eventSha256)
        || !(v.missionId === null || bounded(v.missionId)) || !(v.lastIssue === null || issues.includes(v.lastIssue))
        || (v.lease !== null && (!object(v.lease) || !bounded(v.lease.holder) || !integer(v.lease.generation, 1)
            || !date(v.lease.expiresAt) || !['submit', 'reconcile_only'].includes(String(v.lease.phase))))
        || (v.state === 'processing') !== (v.lease !== null) || (v.state === 'submitted') !== (v.missionId !== null)) {
        throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
    }
    try {
        if (v.objective !== null && (0, model_js_1.cleanObjective)(v.objective) !== v.objective)
            throw new Error();
    }
    catch {
        throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
    }
    return structuredClone(v);
}
/** No network/auth fallback and no Telegram reply. The injected verifier is mandatory. */
function createTelegramInbox(options) {
    if (typeof options.verifyAdmission !== 'function' || typeof options.client?.rpc !== 'function')
        invalid();
    async function call(name, args) {
        let result;
        try {
            result = await options.client.rpc(`bras_droit_telegram_inbox_${name}`, args);
        }
        catch {
            throw new TelegramInboxError('telegram_inbox_unavailable');
        }
        if (result.error)
            throw new TelegramInboxError(knownErrors.has(result.error.message) ? result.error.message : 'telegram_inbox_repository_failure');
        return result.data;
    }
    function owner(ownerId) { if (!bounded(ownerId))
        invalid(); }
    function fenced(previous) {
        owner(previous.ownerId);
        if (!bounded(previous.id) || !previous.lease || !bounded(previous.lease.holder) || !integer(previous.revision)
            || !integer(previous.lease.generation, 1))
            throw new TelegramInboxError('telegram_inbox_lease_lost');
        return { p_owner_id: previous.ownerId, p_id: previous.id, p_holder: previous.lease.holder,
            p_generation: previous.lease.generation, p_revision: previous.revision };
    }
    function correlated(value, ownerId, id) {
        const result = parseRecord(value);
        if (result.ownerId !== ownerId || (id !== undefined && result.id !== id))
            throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
        return result;
    }
    function sameIdentity(before, after) {
        const keys = ['id', 'ownerId', 'botScopeId', 'telegramSubject', 'chatId', 'updateId', 'messageId',
            'requestId', 'eventSha256', 'kind', 'voiceFileRef'];
        return keys.every(key => before[key] === after[key])
            && ['originVerifiedAt', 'originExpiresAt', 'receivedAt'].every(key => Date.parse(before[key]) === Date.parse(after[key]))
            && before.attempts === after.attempts;
    }
    function checkedMutation(before, value) {
        const result = correlated(value, before.ownerId, before.id);
        if (!sameIdentity(before, result))
            throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
        return result;
    }
    function response(condition) {
        if (!condition)
            throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
    }
    return {
        async admit(source) {
            let admission;
            try {
                admission = await options.verifyAdmission(source);
            }
            catch {
                throw new TelegramInboxError('telegram_inbox_admission_rejected');
            }
            if (!admission)
                throw new TelegramInboxError('telegram_inbox_admission_rejected');
            const normalized = validateAdmission(admission);
            const result = await call('admit', { p_id: (0, node_crypto_1.randomUUID)(), p_admission: normalized });
            if (!object(result) || typeof result.replay !== 'boolean')
                throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
            const record = correlated(result.record, normalized.ownerId);
            if (record.botScopeId !== normalized.botScopeId || record.updateId !== normalized.updateId || record.eventSha256 !== normalized.eventSha256
                || record.telegramSubject !== normalized.telegramSubject || record.chatId !== normalized.chatId || record.messageId !== normalized.messageId
                || record.kind !== normalized.input.kind
                || (normalized.input.kind === 'text' && record.objective !== normalized.input.objective)
                || (normalized.input.kind === 'voice' && record.voiceFileRef !== normalized.input.voiceFileRef)
                || (!result.replay && (Date.parse(record.originVerifiedAt) !== Date.parse(normalized.originVerifiedAt)
                    || Date.parse(record.originExpiresAt) !== Date.parse(normalized.originExpiresAt))))
                throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
            return { record, replay: result.replay };
        },
        async get(ownerId, id) {
            owner(ownerId);
            if (!bounded(id))
                invalid();
            const value = await call('get', { p_owner_id: ownerId, p_id: id });
            return value === null ? null : correlated(value, ownerId, id);
        },
        async getByUpdate(ownerId, botScopeId, updateId) {
            owner(ownerId);
            telegramMissionRequestId(botScopeId, updateId);
            const value = await call('get_by_update', { p_owner_id: ownerId, p_bot_scope_id: botScopeId, p_update_id: updateId });
            if (value === null)
                return null;
            const result = correlated(value, ownerId);
            if (result.botScopeId !== botScopeId || result.updateId !== updateId)
                throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
            return result;
        },
        async claim(input) {
            owner(input.ownerId);
            telegramMissionRequestId(input.botScopeId, 0);
            if (!bounded(input.holder) || !integer(input.leaseSeconds, 1) || input.leaseSeconds > 60)
                invalid();
            const value = await call('claim', { p_owner_id: input.ownerId, p_bot_scope_id: input.botScopeId,
                p_holder: input.holder, p_lease_seconds: input.leaseSeconds });
            if (value === null)
                return null;
            const result = correlated(value, input.ownerId);
            if (result.botScopeId !== input.botScopeId || result.lease?.holder !== input.holder)
                throw new TelegramInboxError('telegram_inbox_invalid_repository_response');
            return result;
        },
        async attachTranscript(previous, input) {
            previous = structuredClone(previous);
            let objective;
            try {
                objective = (0, model_js_1.cleanObjective)(input.objective);
            }
            catch {
                return invalid();
            }
            if (!/^[A-Za-z0-9_-]{1,512}$/.test(input.voiceFileRef))
                invalid();
            const result = checkedMutation(previous, await call('attach_transcript', { ...fenced(previous), p_objective: objective, p_voice_file_ref: input.voiceFileRef }));
            response(previous.kind === 'voice' && result.objective === objective && result.voiceFileRef === input.voiceFileRef
                && result.state === 'processing' && result.missionId === null && result.lastIssue === previous.lastIssue
                && result.revision === previous.revision + (previous.objective === null ? 1 : 0)
                && !!result.lease && !!previous.lease && result.lease.holder === previous.lease.holder
                && result.lease.generation === previous.lease.generation && result.lease.phase === previous.lease.phase
                && Date.parse(result.lease.expiresAt) === Date.parse(previous.lease.expiresAt));
            return result;
        },
        async attachMission(previous, missionId) {
            previous = structuredClone(previous);
            if (!bounded(missionId))
                invalid();
            const result = checkedMutation(previous, await call('attach_mission', { ...fenced(previous), p_mission_id: missionId }));
            response(result.missionId === missionId && result.state === 'submitted' && result.lease === null
                && result.objective === previous.objective && result.revision === previous.revision + 1 && result.lastIssue === null);
            return result;
        },
        async recordIssue(previous, input) {
            previous = structuredClone(previous);
            input = { ...input };
            if (!issues.includes(input.code) || (input.retryAfterSeconds !== undefined && (!integer(input.retryAfterSeconds, 1) || input.retryAfterSeconds > 60))
                || (input.retryAfterSeconds !== undefined && !['transcription_unavailable', 'submission_unknown', 'processing_failed'].includes(input.code)))
                invalid();
            const fence = input.code === 'reply_missing' && previous.state === 'submitted' && previous.lease === null
                ? { p_owner_id: previous.ownerId, p_id: previous.id, p_holder: null, p_generation: null, p_revision: previous.revision }
                : fenced(previous);
            const result = checkedMutation(previous, await call('record_issue', { ...fence, p_code: input.code,
                p_retry_after_seconds: input.retryAfterSeconds ?? null }));
            const expectedState = input.code === 'reply_missing' ? 'submitted'
                : input.retryAfterSeconds !== undefined && previous.attempts < 12 ? 'received' : 'needs_attention';
            response(result.state === expectedState && result.missionId === previous.missionId && result.lease === null
                && result.objective === previous.objective && result.revision === previous.revision + 1 && result.lastIssue === input.code);
            return result;
        },
    };
}
