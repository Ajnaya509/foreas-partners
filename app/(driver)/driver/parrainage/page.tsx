import { redirect } from 'next/navigation';
import { getDriverReferralContext } from '@/lib/driver/referral-server';
import { getDriverFinance } from '@/lib/driver/finance-server';
import { driverReferralCode, driverReferralCopy as c } from '@/lib/driver/referral';
import { DriverReferralPanel } from '@/components/driver/ReferralPanel';

export const dynamic = 'force-dynamic';
export default async function DriverParrainagePage() {
  const context = await getDriverReferralContext();
  if (context.status === 'unavailable' && context.code === 'AUTH_REQUIRED')
    redirect('/login?role=driver&next=%2Fdriver%2Fparrainage');
  const finance=context.status==='ready'?await getDriverFinance(context.viewerId,context.profile.id):null;
  return <div className="partner-shell max-w-3xl space-y-xl">
    <header className="partner-page-header"><h1>{c.title}</h1><p>{c.intro}</p></header>
    {context.status === 'ready'
      ? <DriverReferralPanel viewerId={context.viewerId} code={driverReferralCode(context.profile)} finance={finance} />
      : <section className="partner-notice" role="status"><h2>{c.unavailable}</h2><p>{c.unavailableHelp}</p>
          <a className="partner-button" href="/driver/parrainage">{c.refresh}</a>
        </section>}
  </div>;
}
