import { Portal } from './Portal';
import { getPartnerSnapshot } from '@/lib/partner/server';
import type { PartnerSection } from '@/lib/partner/model';
import {EnrollmentPortal} from '@/components/partner-enrollment/EnrollmentPortal';
import {currentUser,enrollment,getState} from '@/lib/partner-enrollment/server';
export async function PartnerScreen({section}:{section:PartnerSection}) {
  if(process.env.PARTNER_ENROLLMENT_ENABLED==='true'){
    const user=await currentUser(false);
    if(user&&await enrollment(user.id))return <EnrollmentPortal state={await getState(user)} section={section}/>;
  }
  return <Portal snapshot={await getPartnerSnapshot()} section={section}/>;
}
