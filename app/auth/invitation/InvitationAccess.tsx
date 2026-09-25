'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { ForeasLogo } from '@/components/foreas/ForeasLogo';

async function accepterInvitation(): Promise<void> {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  // Effacer les accès avant de créer le client et avant toute autre navigation.
  window.history.replaceState(window.history.state, '', window.location.pathname);
  const access = fragment.get('access_token');
  const refresh = fragment.get('refresh_token');
  if (fragment.get('type') !== 'invite' || fragment.has('error')
    || !access || !refresh || access.length > 12000 || refresh.length > 2048) {
    throw new Error('INVITATION_INCOMPLETE');
  }
  // L'import différé évite la détection PKCE automatique sur le fragment d'invitation.
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (error || !data.session || !data.user?.id) throw new Error('INVITATION_UNCONFIRMED');
}

export default function InvitationAccess() {
  const [failed, setFailed] = useState(false);
  const operation = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    // Une seule consommation, y compris lors du double montage de développement.
    operation.current ??= accepterInvitation();
    operation.current.then(() => {
      if (active) window.location.replace('/auth/update?next=%2Fpartner&invitation=1');
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-black text-text-primary flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <div className="mb-8 flex justify-center">
          <ForeasLogo variant="full" color="#F8FAFC" height={30} />
        </div>
        {failed ? (
          <>
            <Mail className="mx-auto mb-5 text-violet-royal" size={28} aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight">Votre accès n’a pas pu être ouvert</h1>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary" role="alert">
              Si ce lien ne fonctionne plus, demandez une nouvelle invitation à votre contact FOREAS.
            </p>
            <Link href="/login?next=%2Fpartner" prefetch={false}
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-royal px-5 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-royal">
              Revenir à la connexion
            </Link>
          </>
        ) : (
          <div role="status" aria-live="polite">
            <div className="mx-auto mb-5 h-7 w-28 rounded-md bg-violet-royal/20 motion-safe:animate-pulse" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight">Votre espace partenaire</h1>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Nous préparons votre accès. Vous pourrez ensuite choisir votre mot de passe.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
