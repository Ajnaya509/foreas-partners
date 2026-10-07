'use client';

import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {identifyPartner, measurementChoice, pausePartnerRecording, saveMeasurementChoice, startMeasurement, syncPartnerRecording, trackPartnerEvent} from '@/lib/partner-measurement';

function isPartnerSurface(pathname: string | null): boolean {
  return pathname === '/login' || pathname === '/inscription' || pathname?.startsWith('/inscription/') === true || pathname === '/partner' || pathname?.startsWith('/partner/') === true;
}

export function PartnerMeasurement() {
  const pathname = usePathname();
  const partnerSurface = isPartnerSurface(pathname);
  const [choice, setChoice] = useState<'yes' | 'no' | null | 'loading'>('loading');
  const [open, setOpen] = useState(false);
  const lastPage = useRef('');

  useEffect(() => {
    const saved = measurementChoice();
    setChoice(saved);
    if (saved === 'yes' && partnerSurface) void startMeasurement();
    const reopen = () => setOpen(true);
    window.addEventListener('foreas:privacy-open', reopen);
    return () => window.removeEventListener('foreas:privacy-open', reopen);
  }, [partnerSurface]);

  useEffect(() => {
    if (choice !== 'yes' || !pathname) return;
    if (!partnerSurface) {
      lastPage.current = '';
      void pausePartnerRecording();
      return;
    }
    const page = window.location.origin + pathname;
    if (lastPage.current === page) return;
    lastPage.current = page;
    void syncPartnerRecording(pathname);
    const referrerHost = (() => {
      try { return document.referrer ? new URL(document.referrer).hostname : 'direct'; }
      catch { return 'direct'; }
    })();
    const params = new URLSearchParams(window.location.search);
    const marketing: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = params.get(key);
      if (value && value.length <= 120 && !value.includes('@')) marketing[key] = value;
    }
    void trackPartnerEvent('$pageview', {$current_url: page, referrer_host: referrerHost, ...marketing});
  }, [choice, pathname, partnerSurface]);

  useEffect(() => {
    if (choice !== 'yes' || !partnerSurface) return;
    const auth = createClient();
    let active = true;
    void auth.auth.getUser().then(({data}) => {
      if (active && data.user?.id) void identifyPartner(data.user.id);
    });
    const {data} = auth.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') void identifyPartner(null);
      else if (session?.user.id) void identifyPartner(session.user.id);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [choice, partnerSurface]);

  function decide(next: 'yes' | 'no') {
    const saved = saveMeasurementChoice(next);
    setChoice(saved ? next : 'no');
    setOpen(false);
    if (saved && next === 'yes') void startMeasurement();
  }

  if (!partnerSurface || choice === 'loading' || (choice !== null && !open)) return null;
  return <aside className="partner-measurement" aria-label="Préférences de confidentialité">
    <strong>Un parcours plus simple, avec toi.</strong>
    <p>Aide-nous à repérer ce qui te ralentit. Avec ton accord, PostHog mesure les visites et enregistre la navigation. Les champs, textes et images sont masqués. Tu peux changer d’avis à tout moment. <a href="https://www.foreas.xyz/confidentialite">Confidentialité</a></p>
    <div className="partner-measurement-actions">
      <button type="button" onClick={() => decide('no')}>Continuer sans analyse</button>
      <button type="button" onClick={() => decide('yes')}>Autoriser l’analyse</button>
    </div>
  </aside>;
}
