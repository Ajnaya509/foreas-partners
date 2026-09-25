import { Portal } from './Portal';
import { getPartnerSnapshot } from '@/lib/partner/server';
import type { PartnerSection } from '@/lib/partner/model';
export async function PartnerScreen({section}:{section:PartnerSection}) {
  return <Portal snapshot={await getPartnerSnapshot()} section={section}/>;
}
