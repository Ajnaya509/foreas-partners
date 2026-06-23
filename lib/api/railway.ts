/**
 * Railway API client — consomme le backend FOREAS Stripe/MLM
 * Base URL: BACKEND_URL (foreas-stripe-backend-production.up.railway.app)
 * Auth: Bearer Supabase access_token (role 'admin' requis par middleware Railway)
 */
import { createClient } from "@/lib/supabase/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  "https://foreas-stripe-backend-production.up.railway.app";

// ─── Types Railway ────────────────────────────────────────────────────────────

export interface RailwayPartner {
  id: string;
  company_name: string;
  company_type: string;
  contact_email: string;
  contact_phone?: string;
  siret?: string;
  status: "pending" | "active" | "paused";
  referral_code: string;
  stripe_account_id?: string;
  total_drivers: number;
  active_drivers: number;
  total_earned: number;
  pending_commission: number;
  discount_percent_for_recruits: number;
  discount_duration_months: number;
  landing_message?: string;
  landing_hero_url?: string;
  is_promo_active: boolean;
  created_at: string;
  approved_at?: string;
}

export interface RailwayRecruit {
  id: string;
  driver_id: string;
  signup_date: string;
  subscription_status: "active" | "cancelled" | "trialing";
  total_earned: number;
  monthly_commission: number;
  driver_activity_score: number;
  conversion_funnel?: string;
  utm_source?: string;
  utm_campaign?: string;
  drivers: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    subscription_active: boolean;
    qualified_for_referral: boolean;
  };
}

export interface RailwayCommission {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  commission_month: string;
  level: 1 | 2 | 3;
  paid_at?: string;
  stripe_transfer_id?: string;
  created_at?: string;
}

export interface PendingPayout {
  sponsor_type: "driver" | "partner";
  sponsor_uuid: string;
  commission_month: string;
  commission_count: number;
  total_amount_eur: number;
  levels: number[];
}

export interface PayoutHistoryItem {
  sponsor_type: "driver" | "partner";
  sponsor_uuid: string;
  commission_month: string;
  paid_at: string;
  commission_count: number;
  total_paid_eur: number;
}

export interface CronResult {
  ok: boolean;
  commission_month?: string;
  qualified_filleuls_processed?: number;
  commissions_inserted?: number;
  transfers_succeeded?: number;
  transfers_failed?: number;
  total_eur?: number;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function railwayGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Railway GET ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function railwayPatch<T>(
  path: string,
  body: unknown
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Railway PATCH ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function railwayPost<T>(
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Railway POST ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}
