import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { readAdminAccess } from '@/lib/admin-access';
import { FOUNDER_SUBJECT } from '@/lib/founder/identity';
import AdminOverviewPage from './overview/page';
export default async function AdminPage(){
  const access=await readAdminAccess(await createClient());
  if(access.status==='allowed' && access.userId===FOUNDER_SUBJECT)redirect('/admin/ajnaya');
  return <AdminOverviewPage/>;
}
