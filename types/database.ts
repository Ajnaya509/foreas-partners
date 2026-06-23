/**
 * Types Supabase — schéma minimal pour foreas-partners V1
 * Source : introspection live de project fihvdvlhftcxhlnocqiq
 *
 * À régénérer via `npx supabase gen types typescript --project-id ...`
 * dès que possible.
 */

export type DriverRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  vtc_card_number: string | null;
  vtc_card_expiry: string | null;
  vtc_card_url: string | null;
  vtc_card_verified: boolean | null;
  partner_id: string | null;
  referred_at: string | null;
  referral_code: string | null;
  referred_by: string | null;
  mlm_earnings_pending: number | null;
  mlm_earnings_paid: number | null;
  total_direct_referrals: number | null;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  last_lat: number | null;
  last_lon: number | null;
  last_location_time: string | null;
  total_rides: number | null;
  total_earnings: number | null;
  earnings_today: number | null;
  average_rating: number | null;
  status: string | null;
  is_online: boolean | null;
  last_active: string | null;
  created_at: string | null;
  referral_fallback_owner: string | null;
  eligible_referrals: number | null;
};

export type PartnerRow = {
  id: string;
  user_id: string;
  company_name: string;
  company_type: string | null;
  siret: string | null;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  referral_code: string;
  commission_rate: number | null;
  status: string;
  approved_at: string | null;
  stripe_account_id: string | null;
  total_drivers: number | null;
  active_drivers: number | null;
  pending_commission: number | null;
  total_earned: number | null;
  // MLM fields (STRIPE_MLM_CROSSFIL_MASTER v2026-05-02)
  discount_percent_for_recruits: number | null;
  discount_duration_months: number | null;
  landing_message: string | null;
  landing_hero_url: string | null;
  is_promo_active: boolean | null;
  created_at: string;
};

export type RideRow = {
  id: string;
  driver_id: string;
  partner_id: string | null;
  pickup_lat: number | null;
  pickup_lon: number | null;
  pickup_address: string | null;
  dropoff_lat: number | null;
  dropoff_lon: number | null;
  dropoff_address: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  fare_amount: number | null;
  driver_earnings: number | null;
  platform: string | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  locked: boolean | null;
};

export type PartnerCommissionRow = {
  id: string;
  partner_id: string;
  driver_id: string;
  commission_month: string;
  commission_amount: number;
  invoice_number: string | null;
  invoice_url: string | null;
  status: string;
  paid_at: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
  manual_payment_ref: string | null;
};

export type PartnerReferralRow = {
  id: string;
  partner_id: string;
  driver_id: string | null;
  signup_date: string;
  subscription_status: string | null;
  created_at: string;
};

export type ChurnScoreRow = {
  id: string;
  driver_id: string;
  score: number;
  risk_level: "low" | "medium" | "high" | "critical" | string;
  signals: Record<string, unknown> | null;
  days_since_active: number | null;
  sessions_last_7d: number | null;
  sessions_last_30d: number | null;
  ca_trend: "up" | "down" | "stable" | string | null;
  payment_status: string | null;
  intervention_recommended: string | null;
  intervention_executed: boolean | null;
  intervention_outcome: string | null;
  scored_at: string;
  created_at: string;
};

export type B2BProspectRow = {
  id: string;
  company_name: string | null;
  company_domain: string | null;
  industry: string | null;
  company_size: string | null;
  country: string | null;
  city: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_linkedin: string | null;
  apollo_person_id: string | null;
  apollo_org_id: string | null;
  qualification_score: number | null;
  qualification_reason: string | null;
  pipeline_stage: string | null;
  outreach_sequence_id: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: "driver" | "partner" | "admin" | "super_admin" | string;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  is_active: boolean;
};

export type AdminDriverNoteRow = {
  id: string;
  driver_id: string;
  admin_id: string;
  content: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

// Aliases pratiques
export type DriverWithStatus = DriverRow & {
  computed_status: "active" | "warning" | "alert" | "inactive" | "churned";
  weekly_ca: number;
  monthly_ca: number;
};
