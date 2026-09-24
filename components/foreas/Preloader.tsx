'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * LE RIDEAU FOREAS — écran de chargement du site.
 *
 * Brief du fil app, 27/08/2026 :
 * FOREAS-SHARED/BRIEF_SITE_RIDEAU_CHARGEMENT_2026-08-27.md
 *
 * Le signe F/ s'affiche en gris, sa barre s'allonge jusqu'aux bords et s'allume
 * en dégradé, puis se dédouble en deux arêtes qui s'écartent. La page est
 * derrière — elle n'a jamais été retardée.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI EST REPRIS DE L'ANCIEN VOILE, ET QU'ON NE CASSE PAS
 *
 * Ce composant existait déjà et avait été durci deux fois. Tout est conservé :
 *  · rien du tout si les animations sont refusées ;
 *  · `pointer-events-none` et `aria-hidden` : le voile n'a jamais bloqué ni la
 *    souris ni les lecteurs d'écran, seulement les yeux ;
 *  · la règle `noscript` du gabarit, qui le retire quand le script est mort ;
 *  · l'état initial est le MÊME au serveur et au navigateur — `sessionStorage`
 *    n'est jamais lu pendant le rendu, sinon l'hydratation casse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI CHANGE, ET POURQUOI
 *
 * 1. LE DESSIN. Le texte « FOREAS/ » + signature + barre dégradée devient le
 *    rideau du fil app, à la géométrie exacte (voir globals.css).
 *
 * 2. LE MINUTEUR FIXE DISPARAÎT. L'ancien voile partait sur un `setTimeout` de
 *    900 ms qui n'attendait rien de réel. Il part maintenant sur un VRAI signal,
 *    `animationend` — l'avertissement n°6 du brief, payé côté app : « le fichier
 *    Rive ne déclarait aucun événement de fin, seule une minuterie levait le
 *    rideau, en silence ».
 *
 * 3. CHAQUE PAGE DU PORTAIL utilise le même rideau, y compris l'authentification
 *    et les espaces partenaire, chauffeur et admin.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUE JE N'AI PAS PU FAIRE COMME LE BRIEF LE DEMANDE, ET JE LE DIS
 *
 * Le brief exige : « si la page est prête en 200 ms, le rideau s'ouvre en
 * 200 ms ». Mais ses propres quatre temps coûtent 1040 ms AVANT que
 * l'écartement puisse commencer — la pose, l'allongement, le dédoublement.
 * Couper au milieu ne donne pas un rideau rapide, ça donne un clignotement.
 *
 * Alors le raccourci se prend AVANT que quoi que ce soit ait bougé, pas
 * pendant : si la page est déjà complète à l'hydratation, le rideau part
 * d'emblée sur une version courte (900 ms au lieu de 1740). Et si elle devient
 * prête plus tard mais avant l'écartement, on supprime le reste de l'attente.
 * Aucune animation n'est jamais touchée EN COURS : c'est ce qui provoquerait
 * un saut.
 */

/** Les deux cadences. Sommes en millisecondes, identiques aux noms du CSS. */
const CADENCE_PLEINE = { pose: 440, trait: 460, battement: 140, ecart: 700 }
const CADENCE_COURTE = { pose: 160, trait: 200, battement: 80, ecart: 460 }

const total = (c: typeof CADENCE_PLEINE) => c.pose + c.trait + c.battement + c.ecart

export function Preloader() {
  const pathname = usePathname()
  return <PagePreloader key={pathname} />
}

function PagePreloader() {
  const [isLoading, setIsLoading] = useState(true)
  const voile = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const animationsRefusees = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    /* ⚠️ 27/08 — ONGLET EN ARRIÈRE-PLAN : LE PIÈGE QUI M'A COÛTÉ UNE HEURE.
       Un navigateur GÈLE les animations CSS d'un onglet qu'on ne regarde pas.
       L'horloge de l'animation reste à zéro, `animationend` n'arrive jamais…
       mais `setTimeout` continue de tourner. Résultat mesuré : le filet levait
       le rideau à chaque fois, et criait à chaque fois.

       C'était un FAUX ROUGE : le code allait bien, c'est mon onglet de mesure
       qui était caché. Mais le cas est réel en production — un lien ouvert dans
       un nouvel onglet, un clic-milieu — et un rideau gelé n'a aucun intérêt :
       personne ne le regarde. On ne le joue donc pas du tout. Le visiteur qui
       revient trouve la page, pas un décor en retard d'une seconde. */
    const ongletCache = document.hidden

    if (animationsRefusees || ongletCache) {
      setIsLoading(false)
      return
    }

    const noeud = voile.current
    if (!noeud) return

    // ── La cadence se choisit MAINTENANT, avant le premier mouvement ────────
    const dejaPrete = document.readyState === 'complete'
    const cadence = dejaPrete ? CADENCE_COURTE : CADENCE_PLEINE
    noeud.style.setProperty('--rideau-pose', `${cadence.pose}ms`)
    noeud.style.setProperty('--rideau-trait', `${cadence.trait}ms`)
    noeud.style.setProperty('--rideau-ecart', `${cadence.ecart}ms`)
    const debutEcart = cadence.pose + cadence.trait + cadence.battement
    const volets = Array.from(noeud.querySelectorAll<HTMLElement>('.rideau-volet'))
    volets.forEach((v) => {
      v.style.animationDelay = `${debutEcart}ms`
    })

    const depart = performance.now()
    let fini = false

    /* Si la page passe en arrière-plan APRÈS le départ, l'animation gèle en
       route. Le filet devra agir — et ce n'est pas une panne. Un filet qui crie
       pour un cas normal apprend à ne plus le lire ; c'est comme ça qu'une
       vraie panne finit par passer inaperçue. */
    let aEteCachee = false
    const surVisibilite = () => {
      if (document.hidden) aEteCachee = true
    }
    document.addEventListener('visibilitychange', surVisibilite)

    /**
     * ⚠️ TROIS CAS, PAS DEUX — l'avertissement du brief, trouvé côté app par le
     * compilateur et pas par un humain : l'animation TERMINÉE, l'animation
     * INTERROMPUE, et le rappel appelé SANS ARGUMENT. Le troisième est celui
     * qu'on oublie, et c'est lui qui laisse le rideau collé à l'écran.
     */
    const lever = (cause: string) => {
      if (fini) return
      fini = true
      setIsLoading(false)
      if (cause !== 'animationend') {
        // ⚠️ UN FILET SILENCIEUX TRANSFORME UNE PANNE EN LENTEUR, et personne ne
        // la voit jamais. Celui-ci parle à chaque fois qu'il agit — mais il ne
        // crie que quand il y a vraiment quelque chose à regarder.
        const ms = Math.round(performance.now() - depart)
        if (aEteCachee) {
          console.info(
            `[rideau FOREAS] levé par « ${cause} » après ${ms} ms : l'onglet est ` +
              `passé en arrière-plan, le navigateur y gèle les animations. ` +
              `Attendu, rien à corriger.`
          )
        } else {
          console.warn(
            `[rideau FOREAS] levé par « ${cause} » et non par la fin de l'animation, ` +
              `après ${ms} ms, onglet resté visible. ` +
              `Le vrai signal n'est pas arrivé — c'est à regarder.`
          )
        }
      }
    }

    const surFin = (e?: AnimationEvent) => {
      // Sans argument, on ne peut pas savoir QUELLE animation a fini : on lève,
      // mais en le disant. Avec argument, on n'accepte que l'écartement — la
      // barre qui s'allonge finit bien avant, et lèverait le rideau trop tôt.
      if (!e) return lever('rappel sans argument')
      if (e.animationName.startsWith('rideau-ecarter')) lever('animationend')
    }
    const surCoupure = () => lever('animationcancel')

    volets.forEach((v) => {
      v.addEventListener('animationend', surFin)
      v.addEventListener('animationcancel', surCoupure)
    })

    // ── Si la page devient prête AVANT l'écartement, on supprime le reste de
    //    l'attente. On ne touche qu'un retard non écoulé : jamais une animation
    //    en cours, qui sauterait.
    const presser = () => {
      const passe = performance.now() - depart
      /* ⚠️ LE RACCOURCI DÉCHIRAIT LE RIDEAU AVEC LE LOGO ENCORE DESSUS.
         Il ne touche QUE le retard des volets. Le F, le slash et le trait de
         lumière gardent leur calendrier. Scénario mesuré : sur un poste de
         bureau avec le cache chaud, l'événement de fin de chargement tombe à
         700 ms — les volets partaient aussitôt, alors que le F n'était effacé
         qu'aux deux tiers et le trait à mi-course. Le visiteur voyait le rideau
         se déchirer, chaque moitié emportant son bout de logo gris.
         On ne mange donc que le battement : le prélude doit être fini. */
      if (fini || passe < cadence.pose + cadence.trait || passe >= debutEcart) return
      volets.forEach((v) => {
        v.style.animationDelay = `${Math.max(0, Math.round(passe))}ms`
      })
    }
    if (!dejaPrete) window.addEventListener('load', presser, { once: true })

    // Le filet : la durée annoncée, plus une marge. S'il agit, il crie.
    const filet = window.setTimeout(() => lever('filet de secours'), total(cadence) + 400)

    return () => {
      window.clearTimeout(filet)
      window.removeEventListener('load', presser)
      document.removeEventListener('visibilitychange', surVisibilite)
      volets.forEach((v) => {
        v.removeEventListener('animationend', surFin)
        v.removeEventListener('animationcancel', surCoupure)
      })
    }
  }, [])

  if (!isLoading) return null

  return (
    <div
      ref={voile}
      aria-hidden="true"
      /* ⚠️ z-10000 et non z-100. Le bandeau de consentement et le grain sont à
          z-9999 : à z-100 le rideau passait DERRIÈRE eux, et la première image
          du site était un bandeau cookies posé sur un écran noir. Mesuré en
          capture le 27/08.
          ⚠️ 27/08, SECONDE PASSE — J'AVAIS ÉCRIT ICI QUE C'ÉTAIT ACCEPTABLE.
          Le lien « Aller au contenu » était aussi à 10000 et vient AVANT dans le
          document : à z-index égal, c'est le dernier du flux qui peint. Un
          visiteur au clavier appuyant sur Tab dans la première seconde recevait
          bien le focus, mais son indicateur — fond cyan, anneau de 4 px — était
          intégralement couvert par le volet noir. Il ne voyait rien pendant
          1,7 s et ne savait pas où il était. C'est le critère WCAG 2.2 SC
          2.4.11, niveau AA, et « il reste atteignable » ne le satisfait pas.
          Le lien est passé à 10001 dans le gabarit : c'est le seul élément du
          site qui doit pouvoir passer devant le rideau. */
      className="voile-de-marque pointer-events-none fixed inset-0 z-[10000] overflow-hidden"
    >
      <div className="rideau-repere">
        <Volet cote="gauche" />
        <Volet cote="droit" />
      </div>
    </div>
  )
}

/**
 * Un volet porte TOUT : son demi-plan noir, son arête de lumière, et le signe
 * entier — dont il ne montre que sa moitié, puisqu'il coupe à la couture.
 * C'est exactement la construction de foreas_curtain_left/right.svg.
 */
function Volet({ cote }: { cote: 'gauche' | 'droit' }) {
  return (
    <div className={`rideau-volet rideau-volet--${cote}`}>
      <div className="rideau-ancre">
        {/*
          viewBox calée sur la boîte du signe seul (69.406 100.127 → 248.358 ×
          191.734), pas sur la toile 1080×1920 : c'est ce qui permet de donner
          au logo une largeur en pixels et d'en déduire la couture.
        */}
        <svg className="rideau-signe" viewBox="69.406 100.127 248.358 191.734" focusable="false">
          <path
            className="rideau-lettre"
            d="M69.406252 279.970708V147.033208c0-2.707031.101563-4.789062.3125-6.25.21875-1.457031.953125-2.601562 2.203125-3.4375s3.226562-1.25 5.9375-1.25h124.171875v13.765625H93.499377v47.84375h99.46875v13.765625h-99.46875v68.5Z"
          />
          <path
            className="rideau-barre"
            d="M225.810918 291.861333 301.185918 100.126958h16.578125L242.389043 291.861333Z"
          />
        </svg>
      </div>
      <span className="rideau-arete" />
    </div>
  )
}
