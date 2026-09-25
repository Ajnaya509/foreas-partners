import Link from 'next/link';
import {ArrowRight,Smartphone} from 'lucide-react';
import {ForeasLogo} from '@/components/foreas/ForeasLogo';
import {appPassageLink} from '@/lib/partner/handoff';

export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};

/** Reading this legacy address never consumes a passage or establishes an identity. */
export default async function HandoffClaimPage({searchParams}:{searchParams:Promise<{token?:string|string[]}>}){
  const params=await searchParams;
  const appLink=appPassageLink(params.token);
  return <main className="min-h-screen flex items-center justify-center p-lg bg-[#0B0F1E] text-[#F8FAFC]">
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111528] p-8">
      <ForeasLogo variant="full" color="currentColor" height={28}/>
      <h1 className="font-display text-3xl mt-8 mb-4">{appLink?'Ouvrir votre lien FOREAS':'Ce lien est incomplet ou non reconnu'}</h1>
      {appLink?<>
        <p className="text-white/75 leading-relaxed">Ce lien porte une conversation vers FOREAS Driver. Connectez-vous d’abord dans l’app, puis revenez sur cette page pour ouvrir le lien. L’app vérifiera s’il est encore utilisable.</p>
        <a href={appLink} className="min-h-12 flex items-center justify-center gap-3 mt-6 rounded-lg bg-[#6D28D9] px-5 py-3 font-display font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#06B6D4]"><Smartphone size={20} aria-hidden/>Ouvrir FOREAS Driver</a>
        <p className="text-sm text-white/65 mt-4">Aucun passage n’a été validé sur cette page. Si vous venez de vous connecter dans l’app, rouvrez ce même lien. Si cela ne fonctionne toujours pas, demandez un nouveau lien depuis la conversation d’origine.</p>
      </>:<p className="text-white/75 leading-relaxed">Ouvrez le lien complet reçu depuis FOREAS. Un code court ne suffit pas. Vous pouvez aussi utiliser votre connexion habituelle.</p>}
      <div className="mt-8 border-t border-white/10 pt-6">
        <h2 className="font-display text-xl mb-3">Votre espace en ligne</h2>
        <p className="text-white/75 leading-relaxed">Votre compte FOREAS détermine les espaces auxquels vous avez accès.</p>
        <Link href="/login" className="min-h-12 flex items-center justify-center gap-3 mt-4 rounded-lg border border-white/20 px-5 py-3 font-display font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#06B6D4]">Se connecter à mon espace <ArrowRight size={18} aria-hidden/></Link>
      </div>
    </section>
  </main>;
}
