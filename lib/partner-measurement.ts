'use client';

import type posthog from 'posthog-js';

const CONSENT_KEY = 'foreas_partner_measurement_v1';
const PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_vYxWaLcXBSkgPpYT2FQz3VpsRr2ZiCsrTe2CfV56pheR';
const API_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

type Client = typeof posthog;
let clientPromise: Promise<Client> | null = null;

export function measurementChoice(): 'yes' | 'no' | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    return saved === 'yes' || saved === 'no' ? saved : null;
  } catch {
    return null;
  }
}

export function saveMeasurementChoice(choice: 'yes' | 'no'): boolean {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
    if (clientPromise) {
      void clientPromise.then(client => {
        if (choice === 'no') {
          client.opt_out_capturing();
          client.stopSessionRecording();
          client.reset();
        } else {
          client.opt_in_capturing();
        }
      });
    }
    return true;
  } catch {
    // Without durable consent, do not start any third-party measurement.
    return false;
  }
}

function safePageUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return window.location.origin + window.location.pathname;
  }
}

export function startMeasurement(): Promise<Client | null> {
  if (measurementChoice() !== 'yes' || !PROJECT_TOKEN) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('posthog-js').then(({default: client}) => {
      client.init(PROJECT_TOKEN, {
        api_host: API_HOST,
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
        cross_subdomain_cookie: false,
        ip: false,
        property_denylist: ['$ip', '$referrer', '$initial_referrer'],
        capture_pageview: false,
        autocapture: false,
        capture_performance: false,
        enable_heatmaps: true,
        // Start recording only after consent and outside password/callback pages.
        disable_session_recording: true,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
          blockSelector: 'input[type="hidden"], input[type="file"], img, video, canvas',
        },
        before_send: event => {
          if (!event?.properties) return event;
          const properties = event.properties;
          for (const key of ['$current_url', '$initial_current_url', '$referrer', '$initial_referrer']) {
            const value = properties[key];
            if (typeof value === 'string') properties[key] = safePageUrl(value);
          }
          return event;
        },
      });
      client.register({surface: 'partner_portal'});
      return client;
    }).catch(error => {
      clientPromise = null;
      console.warn('[partner-measurement] unavailable', error);
      throw error;
    });
  }
  return clientPromise.catch(() => null);
}

export async function trackPartnerEvent(name: string, details: Record<string, string | number | boolean> = {}): Promise<void> {
  const client = await startMeasurement();
  if (client && measurementChoice() === 'yes') client.capture(name, details);
}

export async function syncPartnerRecording(pathname: string): Promise<void> {
  const client = await startMeasurement();
  if (!client || measurementChoice() !== 'yes') return;
  if (pathname.startsWith('/auth/') || pathname.startsWith('/login') || pathname.startsWith('/inscription/confirmation')) {
    client.stopSessionRecording();
  } else {
    client.startSessionRecording();
  }
}

export async function pausePartnerRecording(): Promise<void> {
  if (clientPromise) {
    const client = await clientPromise.catch(() => null);
    client?.stopSessionRecording();
  }
}

export async function identifyPartner(userId: string | null): Promise<void> {
  const client = await startMeasurement();
  if (!client || measurementChoice() !== 'yes') return;
  if (userId) client.identify(userId);
  else client.reset();
}
