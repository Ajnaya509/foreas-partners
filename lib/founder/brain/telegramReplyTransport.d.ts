export interface TelegramReplyRequest {
    ownerId: string;
    botScopeId: string;
    telegramSubject: string;
    replyToMessageId: number;
    text: string;
}
export interface TelegramReplyReceipt {
    messageId: number;
    chatId: string;
    botId: string;
    text: string;
    observedAt: string;
}
export declare class TelegramReplyTransportError extends Error {
    readonly code: "configuration" | "refused" | "rejected" | "unknown";
    constructor(code: "configuration" | "refused" | "rejected" | "unknown");
}
/** One attempt only. The caller must durably record dispatch BEFORE send().
 * No bot registration, polling, payment, fallback sender or provider retry. */
export declare function createTelegramReplyTransport(options: {
    ownerId: string;
    botScopeId: string;
    telegramSubject: string;
    botToken: string;
    forbiddenSecrets: string[];
    enabled: () => boolean;
    transport: typeof fetch;
    currentOwnerAccess: () => Promise<boolean>;
    timeoutMs?: number;
    now?: () => Date;
}): {
    send(value: TelegramReplyRequest, parentSignal: AbortSignal): Promise<TelegramReplyReceipt>;
};
