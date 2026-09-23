import type { SummaryEvidence, CommissionEvidence, LedgerScope, EvidenceCoverage } from './ledger-evidence';
/** Shared wire contract. Dates are ISO 8601 UTC, amounts integer EUR cents.
 * No field is proof of an event that has not happened. Private responses: no-store.
 * Identity always resolves verified Auth user -> partners.user_id on the server.
 */
export const PARTNER_CONTRACT_VERSION = 'partner.v1' as const;
export type PartnerState = 'pending' | 'active' | 'paused' | 'unknown';
export type CommissionState = 'pending_review' | 'eligible' | 'reserved' | 'paid' | 'blocked' | 'reversed' | 'policy_unmapped';
export type PayoutAccountState = 'not_connected' | 'incomplete' | 'ready' | 'unavailable';
export interface PartnerMeta { as_of: string; request_id: string; }
export interface PartnerResponse<T> { contract_version: typeof PARTNER_CONTRACT_VERSION; data: T; meta: PartnerMeta; }
export type PartnerErrorCode = 'AUTH_REQUIRED' | 'PARTNER_NOT_FOUND' | 'PARTNER_NOT_ADMITTED' | 'PARTNER_INACTIVE' | 'ADMIN_REQUIRED' | 'INVALID_REQUEST' | 'IDENTITY_CONFLICT' | 'ATTRIBUTION_CONFLICT' | 'CODE_UNAVAILABLE' | 'TERMS_UNAVAILABLE' | 'TERMS_CHANGED' | 'SERVICE_UNAVAILABLE' | 'RATE_LIMITED' | 'OPERATION_CONFLICT' | 'LEGACY_ROUTE_RETIRED';
export interface PartnerErrorResponse { contract_version: typeof PARTNER_CONTRACT_VERSION; error: { code: PartnerErrorCode; message: string; request_id: string; }; }
/** GET /api/partner/me. No query parameters or request body. */
export interface PartnerMe {
  organization: { id: string; name: string; type: string | null; };
  program: 'driver_referral';
  target: 'drivers';
  admission: { state: PartnerState; approved_at: string | null; };
  capabilities: { can_read_commissions: boolean; can_recruit: boolean; can_manage_payout: boolean; };
  referral: { code: string; url: string; } | null;
  terms: { required_version: string | null; accepted_version: string | null; acceptance_required: boolean; };
}
/** GET /api/partner/summary. All-time canonical ledger only; no query parameters. */
export interface PartnerSummary extends SummaryEvidence {
  currency: 'EUR';
  period: { basis: 'all_time'; from: null; to: null; };
  totals_cents: Record<CommissionState, number>;
  counts: Record<CommissionState, number>;
  coverage: EvidenceCoverage;
  payout_account: { state: PayoutAccountState; checked_at: string; };
  next_payout_at: string | null;
}
export interface PartnerCommission extends CommissionEvidence {
  id: string;
  kind: 'monthly_paid' | 'annual_once';
  status: CommissionState;
  amount_cents: number;
  currency: 'EUR';
  invoice_paid_at: string | null;
  eligible_at: string | null;
  payout_month: string | null;
  paid_at: string | null;
  created_at: string;
}
/** GET /api/partner/commissions?limit=25&cursor=...&status=eligible
 * Optional limit integer 1..50, cursor opaque server-issued, status one CommissionState.
 * Unsupported query/body/identity parameters produce 400.
 * Cursor pagination by created_at DESC,id DESC; same status must be kept.
 */
export interface PartnerCommissions extends LedgerScope {
  items: PartnerCommission[];
  pagination: { limit: number; next_cursor: string | null; };
  coverage: EvidenceCoverage;
}
export interface PartnerTermsDocument { version: string; sha256: string; document_url: string; published_at: string; }
/** GET /api/partner/terms; document=null means not published, never an approved empty contract. */
export interface PartnerTerms { document: PartnerTermsDocument | null; accepted_version: string | null; }
/** POST /api/partner/terms/accept. An explicit user action is required. */
export interface AcceptPartnerTerms { version: string; sha256: string; }
export interface PartnerTermsAccepted { version: string; accepted_at: string; }
export interface PartnerKitItem { id: string; title: string; description: string; url: string; format: string; version: string; published_at: string; }
/** GET /api/partner/kit. Only actually published, approved resources. */
export interface PartnerKit { availability: 'available' | 'not_published'; items: PartnerKitItem[]; }
/** POST /api/public/partner-applications, Content-Type application/json.
 * Idempotency-Key: random UUID generated for this explicit submission and kept on retry.
 * Server controls pending status. No direct client database insert or email send.
 */
export interface CreatePartnerApplication {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  siret?: string;
  message?: string;
  company_type?: string;
  territory?: string;
  acquisition_channel?: string;
  website?: string; // Honeypot: must remain empty; never a real website field.
}
export interface PartnerApplicationReceived { application: { reference: string; status: 'received'; }; }
/** POST /api/referral/claim, authenticated. Auth user resolves via drivers.auth_user_id.
 * No driver_id, sponsor_id or partner_id accepted. Existing attribution is immutable.
 */
export interface ClaimReferral { code: string; }
export interface ReferralClaimed { status: 'attached' | 'already_attached'; }
/** POST /api/partner/payout-account/link, authenticated active partner, explicit action.
 * Empty object only. Opens/resumes Stripe onboarding, does not transfer money.
 */
export interface PartnerPayoutLink { url: string; }
/** Status mapping: 401 AUTH_REQUIRED; 403 ADMIN_REQUIRED/PARTNER_INACTIVE/PARTNER_NOT_ADMITTED;
 * 404 PARTNER_NOT_FOUND; 409 *_CONFLICT/TERMS_CHANGED; 400 INVALID_REQUEST;
 * 410 LEGACY_ROUTE_RETIRED; 429 RATE_LIMITED; 503 SERVICE_UNAVAILABLE/TERMS_UNAVAILABLE.
 * CODE_UNAVAILABLE returns 422; no other person's identity is ever disclosed.
 * Suspended partners retain commission/terms reading; recruitment and bank changes are closed.
 */
