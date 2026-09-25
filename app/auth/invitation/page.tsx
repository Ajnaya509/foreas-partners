import type { Metadata } from 'next';
import InvitationAccess from './InvitationAccess';

export const metadata: Metadata = {
  title: 'Votre invitation — FOREAS',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function InvitationPage() {
  return <InvitationAccess />;
}
