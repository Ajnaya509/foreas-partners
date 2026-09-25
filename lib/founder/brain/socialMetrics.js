"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCIAL_METRICS_LIMITATIONS = exports.socialId = exports.socialExact = exports.SocialMetricsError = exports.SOCIAL_METRICS_CAPABILITY = void 0;
exports.socialCalendarDate = socialCalendarDate;
exports.socialDateAt = socialDateAt;
exports.readSocialMetricsScope = readSocialMetricsScope;
exports.socialMetricsScopeHash = socialMetricsScopeHash;
exports.readSocialMetricsInput = readSocialMetricsInput;
exports.readSocialMetricsRequest = readSocialMetricsRequest;
exports.readSocialMetricsObservation = readSocialMetricsObservation;
exports.socialMetricsSummary = socialMetricsSummary;
const model_js_1 = require("./model.js");
exports.SOCIAL_METRICS_CAPABILITY = "social.metrics.read";
class SocialMetricsError extends Error {
    code;
    constructor(code) {
        super(`social_read_${code}`);
        this.code = code;
        this.name = "SocialMetricsError";
    }
}
exports.SocialMetricsError = SocialMetricsError;
const fail = () => { throw new SocialMetricsError("invalid"); };
const socialExact = (v, keys) => !!v && typeof v === "object" && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v))
    && Object.keys(v).sort().join(",") === keys;
exports.socialExact = socialExact;
const socialId = (v) => typeof v === "string" && v === v.trim() && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(v);
exports.socialId = socialId;
const robot = (v) => typeof v === "string" && v === v.trim() && /^[a-z][a-z0-9_.:-]{2,127}$/.test(v);
const uuid = (v) => typeof v === "string" && v === v.trim() && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const count = (v, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
function socialCalendarDate(v) {
    return typeof v === "string" && /^(?:20|21)\d{2}-\d{2}-\d{2}$/.test(v)
        && Number.isFinite(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
}
function socialDateAt(epoch, timezone) {
    if (!Number.isSafeInteger(epoch) || !Number.isFinite(new Date(epoch).getTime()))
        return fail();
    try {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, calendar: "iso8601", numberingSystem: "latn",
            year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(epoch);
        return ["year", "month", "day"].map(key => parts.find(p => p.type === key).value).join("-");
    }
    catch {
        return fail();
    }
}
function readSocialMetricsScope(value) {
    if (!(0, exports.socialExact)(value, "channel,driverId,environment,ownerId,providerAccountRef,purpose,revision,robotRef,timezone")
        || !(0, exports.socialId)(value.ownerId) || !robot(value.robotRef) || !(0, exports.socialId)(value.providerAccountRef)
        || value.channel !== "email" || !["live", "test"].includes(String(value.environment))
        || !count(value.revision) || value.revision < 1
        || !(value.purpose === "FOREAS_HUNTER" && value.driverId === null || value.purpose === "PRIVATE_HUNTER" && uuid(value.driverId))
        || typeof value.timezone !== "string" || value.timezone.length > 80
        || !/^[A-Za-z][A-Za-z0-9_+/-]*$/.test(value.timezone))
        return fail();
    socialDateAt(0, value.timezone);
    return structuredClone(value);
}
function socialMetricsScopeHash(raw) {
    return (0, model_js_1.hash)({ kind: "social.metrics.scope.v1", ...readSocialMetricsScope(raw) });
}
function readSocialMetricsInput(raw) {
    if (!(0, exports.socialExact)(raw, "calendarDate,robotRef") || !robot(raw.robotRef) || !socialCalendarDate(raw.calendarDate))
        return fail();
    return { robotRef: raw.robotRef, calendarDate: raw.calendarDate };
}
function readSocialMetricsRequest(raw) {
    if (!(0, exports.socialExact)(raw, "calendarDate,missionId,requestId,robotRef,scopeHash,stepId") || !uuid(raw.requestId)
        || !(0, exports.socialId)(raw.missionId) || !(0, exports.socialId)(raw.stepId) || !robot(raw.robotRef) || !socialCalendarDate(raw.calendarDate)
        || typeof raw.scopeHash !== "string" || raw.scopeHash.length !== 64 || !/^[a-f0-9]{64}$/.test(raw.scopeHash))
        return fail();
    return structuredClone(raw);
}
function timestamp(raw) {
    if (typeof raw !== "string" || raw !== raw.trim() || !/^(?:20|21)\d{2}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(raw)
        || !socialCalendarDate(raw.slice(0, 10)) || !Number.isFinite(Date.parse(raw)))
        return fail();
    return Date.parse(raw);
}
const METRIC_KEYS = "calendarDate,configuredQuota,consumedSlots,counts,coverage,effectiveQuota,globalGate,limitations,messageQuotaMaximum,observedAt,periodEnd,periodStart,proofRefs,reservedSlots,scopeQuotaMaximum,scopeRef,sourceRef,timezone,uncertainSlots";
const UNKNOWN_COUNTS = ["prospectsSelected", "draftsPrepared", "deliveryConfirmed", "authenticatedReplies", "usefulReplies", "conversionsAttributed"];
exports.SOCIAL_METRICS_LIMITATIONS = [
    "Ce registre couvre uniquement ce robot et ses messages email enregistrés.",
    "Une adresse déclarée externe ne certifie pas une personne ni un prospect réel.",
    "L’acceptation fournisseur ne prouve ni la livraison, ni la lecture, ni une réponse.",
    "La journée est celle où l’acceptation a été observée par le serveur.",
    "Les places réservées et incertaines peuvent venir de jours précédents.",
    "Les anciens historiques, les autres robots et les autres canaux ne sont pas couverts.",
];
/** Parse only an authenticated, bound response. This function grants no access. */
function readSocialMetricsObservation(raw, expected) {
    const scope = readSocialMetricsScope(expected.scope), request = readSocialMetricsRequest(expected.request);
    const { startedAt, receivedAt } = expected;
    if (!count(startedAt) || !count(receivedAt) || receivedAt < startedAt || receivedAt - startedAt > 15_000
        || request.robotRef !== scope.robotRef || request.scopeHash !== socialMetricsScopeHash(scope)
        || !(0, exports.socialExact)(raw, "metrics,missionId,requestId,scope,scopeHash,stepId,version") || raw.version !== 1
        || ["requestId", "missionId", "stepId", "scopeHash"].some(k => raw[k] !== request[k])
        || (0, model_js_1.canonical)(readSocialMetricsScope(raw.scope)) !== (0, model_js_1.canonical)(scope))
        return fail();
    const m = raw.metrics;
    if (!(0, exports.socialExact)(m, METRIC_KEYS) || m.sourceRef !== "app_social_dispatches" || m.scopeRef !== scope.robotRef
        || m.timezone !== scope.timezone || m.calendarDate !== request.calendarDate || m.coverage !== "partial"
        // No open gate contract has been received yet. A future opening needs its own reviewed version.
        || m.globalGate !== "LOCAL_REVIEW_ONLY" || m.effectiveQuota !== 0
        || !count(m.configuredQuota, 100) || !count(m.scopeQuotaMaximum, 100) || !count(m.messageQuotaMaximum, 100)
        || m.scopeQuotaMaximum > Math.min(m.configuredQuota, m.messageQuotaMaximum)
        || scope.purpose === "PRIVATE_HUNTER" && m.scopeQuotaMaximum > 20
        || ![m.consumedSlots, m.reservedSlots, m.uncertainSlots].every(v => count(v))
        || !Number.isSafeInteger(Number(m.consumedSlots) + Number(m.reservedSlots) + Number(m.uncertainSlots))
        || !(0, exports.socialExact)(m.counts, "authenticatedReplies,conversionsAttributed,deliveryConfirmed,distinctExternalProspectsContacted,draftsPrepared,prospectsSelected,providerAcceptedMessages,usefulReplies")
        || !UNKNOWN_COUNTS.every(k => m.counts[k] === null))
        return fail();
    const counts = m.counts;
    if (!count(counts.providerAcceptedMessages) || !count(counts.distinctExternalProspectsContacted)
        || counts.distinctExternalProspectsContacted > counts.providerAcceptedMessages
        || counts.providerAcceptedMessages > Number(m.consumedSlots))
        return fail();
    const observed = timestamp(m.observedAt), start = timestamp(m.periodStart), end = timestamp(m.periodEnd);
    const today = socialDateAt(observed, scope.timezone);
    const age = (Date.parse(today) - Date.parse(request.calendarDate)) / 86_400_000;
    const nextDate = new Date(Date.parse(request.calendarDate) + 86_400_000).toISOString().slice(0, 10);
    if (observed < startedAt - 5_000 || observed > receivedAt + 5_000 || age < 0 || age > 31
        || end <= start || end - start > 172_800_000
        || [m.periodStart, m.periodEnd].some(v => /\.(\d*[1-9]\d*)/.test(String(v)))
        // First instant of each civil day. No assumed 24-hour day, UTC offset or phone timezone.
        || socialDateAt(start, scope.timezone) !== request.calendarDate || socialDateAt(start - 1, scope.timezone) === request.calendarDate
        || socialDateAt(end, scope.timezone) !== nextDate || socialDateAt(end - 1, scope.timezone) !== request.calendarDate
        || !Array.isArray(m.limitations) || m.limitations.length > 20
        || m.limitations.some(v => typeof v !== "string" || v.length > 1000)
        || !Array.isArray(m.proofRefs) || m.proofRefs.length !== 1
        || m.proofRefs[0] !== `app_social_dispatches:${scope.robotRef}:${request.calendarDate}`)
        return fail();
    // Free text returned by a remote service is never replayed as instructions or commercial claims.
    const metrics = { ...structuredClone(m), limitations: [...exports.SOCIAL_METRICS_LIMITATIONS] };
    return { scope, request, metrics, receivedAt: new Date(receivedAt).toISOString() };
}
function socialMetricsSummary(observation) {
    const m = observation.metrics, c = m.counts;
    // Fits the existing Telegram renderer's 230-character limit, even with three safe-integer maxima.
    return `${observation.request.calendarDate} : ${c.providerAcceptedMessages} messages acceptés par le fournisseur, `
        + `${c.distinctExternalProspectsContacted} adresses externes distinctes déclarées. `
        + `Livraison et vrais prospects non certifiés. `
        + `${m.uncertainSlots} places incertaines, jours anciens inclus.`;
}
