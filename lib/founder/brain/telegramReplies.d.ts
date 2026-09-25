import type { MissionRpcClient } from "./repository.js";
import { type TelegramInboxRecord } from "./telegramInbox.js";
import type { StoredMission } from "./types.js";
import type { TelegramReplyReceipt } from "./telegramReplyTransport.js";
export interface TelegramReplyRecord {
    inboxId: string;
    ownerId: string;
    botScopeId: string;
    telegramSubject: string;
    inboxRevision: number;
    missionRevision: number | null;
    state: "pending" | "claimed" | "ready" | "dispatching" | "sent" | "unknown" | "rejected";
    revision: number;
    generation: number;
    holder: string | null;
    leaseExpiresAt: string | null;
    text: string | null;
    textHash: string | null;
    lastSentHash: string | null;
    dispatchId: string | null;
    receipt: TelegramReplyReceipt | null;
    updatedAt: string;
}
export interface TelegramReplyJob {
    reply: TelegramReplyRecord;
    inbox: TelegramInboxRecord;
    mission: StoredMission | null;
}
export interface TelegramDeliveryStatus {
    state: TelegramReplyRecord["state"] | "not_queued";
    updatedAt: string | null;
    lastMessageId: number | null;
    matchesCurrentMission: boolean;
}
export interface TelegramReplies {
    get(ownerId: string, inboxId: string): Promise<TelegramReplyRecord | null>;
    claim(input: {
        ownerId: string;
        botScopeId: string;
        telegramSubject: string;
        holder: string;
        leaseSeconds: number;
    }): Promise<TelegramReplyJob | null>;
    prepare(previous: TelegramReplyRecord, text: string): Promise<TelegramReplyRecord>;
    begin(previous: TelegramReplyRecord, dispatchId: string): Promise<TelegramReplyRecord>;
    finish(previous: TelegramReplyRecord, outcome: "sent" | "unknown" | "rejected", receipt?: TelegramReplyReceipt): Promise<TelegramReplyRecord>;
    release(previous: TelegramReplyRecord): Promise<boolean>;
    statusByMission(ownerId: string, missionId: string): Promise<TelegramDeliveryStatus | null>;
}
export declare class TelegramRepliesError extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare function readTelegramDeliveryStatus(value: unknown): TelegramDeliveryStatus | null;
export declare function createTelegramReplies(client: MissionRpcClient): TelegramReplies;
