"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, MessageCircle } from 'lucide-react';
import { driverReferralCopy as c } from '@/lib/driver/referral';
import { PROMESSE_PARRAINAGE } from '@/lib/parrainagePromesse';
import type { DriverFinance } from '@/lib/driver/finance';
import { DriverFinancePanel } from './FinancePanel';

type Props = { viewerId: string; code: string | null; finance?: DriverFinance | null };
export function DriverReferralPanel(props: Props) {
  return <ReferralSession key={JSON.stringify(props)} {...props} />;
}
function ReferralSession({ viewerId, code, finance = null }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<'checking' | 'ready' | 'changed'>('checking');
  const [copy, setCopy] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const state = useRef({ alive: true, version: 0, ready: false, copying: false });
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const guard = state.current;
    guard.alive = true;
    const invalidate = () => {
      guard.version += 1; guard.ready = false;
      if (guard.alive) { setSession('changed'); setCopy('idle'); }
    };
    async function connect() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled || !guard.alive) return;
        const client = createClient();
        const { data } = client.auth.onAuthStateChange((_event, current) => {
          if (!current || current.user.id !== viewerId) invalidate();
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const version = guard.version;
        const verified = await client.auth.getUser();
        if (cancelled || !guard.alive || version !== guard.version) return;
        if (verified.error || verified.data.user?.id !== viewerId) { invalidate(); return; }
        guard.ready = true; setSession('ready');
      } catch { if (!cancelled && guard.alive) invalidate(); }
    }
    void connect();
    return () => { cancelled = true; guard.alive = false; guard.ready = false; guard.version += 1; unsubscribe?.(); };
  }, [viewerId]);
  const link = code ? 'https://www.foreas.xyz/r/' + encodeURIComponent(code) : null;
  async function copyLink() {
    const guard = state.current;
    if (!link || !guard.ready || guard.copying) return;
    const version = guard.version;
    guard.copying = true; setCopy('working');
    try {
      await navigator.clipboard.writeText(link);
      if (guard.alive && guard.ready && version === guard.version) setCopy('done');
    } catch {
      if (guard.alive && guard.ready && version === guard.version) setCopy('error');
    } finally { guard.copying = false; }
  }
  if (session === 'checking') return <section aria-busy="true" aria-label={c.checking} className="partner-panel">
    <p role="status">{c.checking}</p>
    <div aria-hidden className="space-y-md"><div className="h-8 rounded-lg bg-obsidian" /><div className="h-12 rounded-lg bg-obsidian" /></div>
  </section>;
  if (session === 'changed') return <section className="partner-notice" role="status">
    <p>{c.changed}</p><a className="partner-button" href="/login?role=driver&next=%2Fdriver%2Fparrainage">{c.login}</a>
  </section>;
  return <div className="space-y-xl">
    <section className="partner-panel">
      <h2 className="partner-small-title">{code ? c.code : c.noCode}</h2>
      {code && link ? <>
        <p className="partner-stat break-all">{code}</p>
        <label className="partner-caption" htmlFor="driver-referral-link">{c.link}</label>
        <textarea id="driver-referral-link" rows={2} readOnly value={link} />
        <div className="flex flex-wrap items-start gap-md">
          <button type="button" className="partner-button is-primary" onClick={copyLink} disabled={copy === 'working'}>
            <Copy size={18} aria-hidden />{copy === 'working' ? c.copying : c.copy}
          </button>
          <a className="partner-button" href={'https://wa.me/?text=' + encodeURIComponent(c.message(code, link))} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} aria-hidden />{c.whatsapp}
          </a>
        </div>
        <p className="partner-caption">{c.messageNote}</p>
        <p role={copy === 'error' ? 'alert' : 'status'} aria-live="polite">
          {copy === 'done' ? c.copied : copy === 'error' ? c.copyError : ''}
        </p>
        <p className="partner-caption">{c.codeNote}</p>
      </> : <><p>{c.noCodeHelp}</p><button className="partner-button" onClick={() => router.refresh()}>{c.refresh}</button></>}
    </section>
    <section className="partner-panel"><h2 className="partner-small-title">{c.rules}</h2><p>{PROMESSE_PARRAINAGE}</p></section>
    <DriverFinancePanel finance={finance} />
  </div>;
}
