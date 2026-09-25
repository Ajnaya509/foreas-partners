import type { MissionRpcClient } from './repository.js';
/** Only the trusted server relay may produce this value, after checking the original update. */
export interface VerifiedTelegramMissionAdmission {
    ownerId: string;
    botScopeId: string;
    telegramSubject: string;
    chatId: string;
    updateId: number;
    messageId: number;
    eventSha256: string;
    originVerifiedAt: string;
    originExpiresAt: string;
    input: {
        kind: 'text';
        objective: string;
    } | {
        kind: 'voice';
        voiceFileRef: string;
    };
}
export interface TelegramInboxLease {
    holder: string;
    generation: number;
    expiresAt: string;
    /** Expired original authority permits lookup/attachment of an existing mission only. */
    phase: 'submit' | 'reconcile_only';
}
export type TelegramInboxIssue = 'origin_expired' | 'access_revoked' | 'transcription_unavailable' | 'transcription_rejected' | 'submission_unknown' | 'mission_conflict' | 'reply_missing' | 'processing_failed';
export interface TelegramInboxRecord {
    id: string;
    ownerId: string;
    botScopeId: string;
    telegramSubject: string;
    chatId: string;
    updateId: number;
    messageId: number;
    requestId: string;
    eventSha256: string;
    originVerifiedAt: string;
    originExpiresAt: string;
    kind: 'text' | 'voice';
    objective: string | null;
    voiceFileRef: string | null;
    state: 'received' | 'processing' | 'submitted' | 'needs_attention';
    revision: number;
    attempts: number;
    lease: TelegramInboxLease | null;
    missionId: string | null;
    lastIssue: TelegramInboxIssue | null;
    receivedAt: string;
    updatedAt: string;
}
export interface TelegramInbox {
    admit(source: unknown): Promise<{
        record: TelegramInboxRecord;
        replay: boolean;
    }>;
    get(ownerId: string, id: string): Promise<TelegramInboxRecord | null>;
    getByUpdate(ownerId: string, botScopeId: string, updateId: number): Promise<TelegramInboxRecord | null>;
    claim(input: {
        ownerId: string;
        botScopeId: string;
        holder: string;
        leaseSeconds: number;
    }): Promise<TelegramInboxRecord | null>;
    attachTranscript(previous: TelegramInboxRecord, input: {
        objective: string;
        voiceFileRef: string;
    }): Promise<TelegramInboxRecord>;
    /** Requires the current fenced lease, but NOT still-live original authority: existing mission only. */
    attachMission(previous: TelegramInboxRecord, missionId: string): Promise<TelegramInboxRecord>;
    recordIssue(previous: TelegramInboxRecord, input: {
        code: TelegramInboxIssue;
        retryAfterSeconds?: number;
    }): Promise<TelegramInboxRecord>;
}
export declare class TelegramInboxError extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare function telegramMissionRequestId(botScopeId: string, updateId: number): string;
/** Convenience guard only; the worker still checks current access and fenced DB state before submission. */
export declare function canCreateTelegramInboxMission(record: TelegramInboxRecord, now: Date): boolean;
declare function parseRecord(v: unknown): TelegramInboxRecord;
/** Data parser only. It does not prove admission or grant sender authority. */
export { parseRecord as readTelegramInboxRecord };
/** No network/auth fallback and no Telegram reply. The injected verifier is mandatory. */
export declare function createTelegramInbox(options: {
    client: MissionRpcClient;
    verifyAdmission: (source: unknown) => Promise<VerifiedTelegramMissionAdmission | null>;
}): TelegramInbox;
