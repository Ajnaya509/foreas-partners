import { createClient } from '@/lib/supabase/server';
import { readAdminAccess } from '@/lib/admin-access';
import { FOUNDER_SUBJECT } from '@/lib/founder/identity';
import { FounderChat } from '@/components/founder/FounderChat';
export const dynamic='force-dynamic';
export default async function FounderPage(){
  const access=await readAdminAccess(await createClient());
  if(access.status!=='allowed' || access.userId!==FOUNDER_SUBJECT)return <main className="p-xl"><h1>Espace réservé au fondateur</h1><p>Ce compte ne dispose pas de cet accès.</p><a href="/admin/overview">Revenir à l’administration</a></main>;
  return <FounderChat userId={access.userId}/>;
}
