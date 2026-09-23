import { Portal } from './Portal';
import { getPartnerSnapshot } from '@/lib/partner/server';
import { getLegacySnapshot } from '@/lib/partner/legacy-server';
import type { PartnerSection } from '@/lib/partner/model';
import {LegacyPortal} from './LegacyPortal';
export async function PartnerScreen({section,cursor=null}:{section:PartnerSection;cursor?:string|null}) {
  const [current,legacy]=await Promise.all([getPartnerSnapshot(),getLegacySnapshot(section==='gains'?cursor:null)]);
  if(current.me.status==='ready')return <Portal snapshot={current} section={section} legacy={legacy} legacyCursor={cursor}/>;
  if(legacy.me.status==='ready')return <LegacyPortal snapshot={legacy} section={section} cursor={cursor}/>;
  if(current.me.code==='PARTNER_NOT_FOUND'&&legacy.me.code!=='PARTNER_NOT_FOUND')
    return <Portal snapshot={{...current,me:{status:'unavailable',code:'SERVICE_UNAVAILABLE'}}} section={section}/>;
  return <Portal snapshot={current} section={section}/>;
}
