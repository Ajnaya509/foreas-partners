# AJNAYA CHANGELOG — Dashboard FOREAS Partners

Format : `[YYYY-MM-DD HH:MM] — [Module] — Description — IMPACT — ROLLBACK`

---

## 2026-05-10 — Phase E sprint 2 : rollback MLM + /driver Option B

### Rollback MLM cascade (P0)
- `app/(driver)/driver/parrainage/page.tsx` — 20€→10€, 8€→4€, 4€→2€ (statu quo Chandler 13:35)
- `app/(driver)/driver/page.tsx` — card parrainage 20/8/4 → 10/4/2
- Copy éligibilité "4 paiements hebdo consécutifs" conservée (correcte per STRIPE_MLM_CROSSFIL_MASTER §2)

### Audit user_profiles (P0)
- Grep `from('profiles')` → 0 référence dans tout le codebase. Propre.
- Nouvelle `getDriverTier(driverId)` : `from('user_profiles').eq('user_id', driverId)` — clé FK correcte

### Vue chauffeur web /driver Option B (P1) — LIVE
- **CRÉÉ** : `components/foreas/TierBadge.tsx` — badge Free/Pro/Elite (gris/cyan/gold pulsé)
- **CRÉÉ** : `components/foreas/UpgradeGate.tsx` — wrapper feature grisée + overlay upgrade contextuel
- **CRÉÉ** : `getDriverTier()` + `getDriverUrgentActions()` dans `lib/queries/driver.ts`
- **REFONDU** : `app/(driver)/driver/page.tsx` — TierBadge hero, ActionChips réels, coach score réel, 4 UpgradeGates Pro

### TypeScript
- `npx tsc --noEmit` → 0 erreur.

---

## 2026-05-10 — Phase E démarrage + MLM rates align

### Cross-domain auth sync (7.4.4) — LIVE
- `lib/supabase/middleware.ts` — `COOKIE_DOMAIN` spreadé sur chaque cookie dans `setAll`. Si `NEXT_PUBLIC_COOKIE_DOMAIN=.foreas.xyz` → session cross-subdomain entre `foreas.xyz` et `partners.foreas.xyz`.
- `lib/supabase/client.ts` — `createBrowserClient` reçoit `cookieOptions: { domain, path, sameSite, secure }` si la variable est définie.
- `lib/supabase/server.ts` — `setAll` idem middleware.
- `.env.local` — `NEXT_PUBLIC_COOKIE_DOMAIN=` (vide = désactivé local, `.foreas.xyz` en prod Vercel).
- `.env.local.example` — CRÉÉ. Documente les 3 variables + note ⚠️ ne pas setter en local.

### MLM rates alignés sur décision Chandler 10/05
- `app/(driver)/driver/parrainage/page.tsx` — 10€→20€ (N1), 4€→8€ (N2), 2€→4€ (N3). Éligibilité copy corrigée ("30 jours" → "4 paiements hebdo consécutifs").
- `app/(driver)/driver/page.tsx` — Card parrainage preview mise à jour (10/4/2 → 20/8/4).

### Wireframes Phase E
- **CRÉÉ** : `/Users/chandlermilien/FOREAS-SHARED/briefs/PHASE_E_WIREFRAMES.md` — Plan détaillé 5 sections pour les 3 pages web + cross-domain auth + décision pendante Chandler.

### TypeScript
- `npx tsc --noEmit` → 0 erreur.

---

## 2026-05-05 — Auth multi-porte v1.0

### Pages auth créées / refondues
- **`/login`** — Refonte complète multi-porte. Param `?role=admin|partner|driver` adapte eyebrow + headline + subtitle + badge. Smart routing post-auth via query séquentielle user_roles → partners → drivers. Toggle Mot de passe / Lien magique avec framer-motion AnimatePresence. Halos variant violet, micro-grain anti-banding, glass card 4% blanc, CTA gradient violet→deep + glow 28px hover.
- **`/auth/callback/route.ts`** — Server route handler. exchangeCodeForSession + smart routing serveur. Handle `type=recovery` → redirect `/auth/update`. Handle erreurs Supabase (link expiré, code manquant) avec redirect vers `/login?error=`.
- **`/auth/reset/page.tsx`** — Forgot password. resetPasswordForEmail avec redirectTo=/auth/callback?type=recovery. États idle/loading/sent/error avec AnimatePresence mode="wait". Copy rassurante (15min de validité affichée).
- **`/auth/update/page.tsx`** — Nouveau mot de passe post-recovery. Password strength indicator 3 niveaux (rouge/orange/vert) animé. Toggle show/hide password. Validation match avec icône CheckCircle2/AlertCircle. Smart redirect post-success après 2s.

### Layouts patchés (passent `?role=` au login)
- `app/(admin)/layout.tsx` → `redirect("/login?role=admin&next=/admin")`
- `app/(partner)/layout.tsx` → `redirect("/login?role=partner&next=/partner")`
- `app/(driver)/layout.tsx` → `redirect("/login?role=driver&next=/driver")`

### Middleware
- `lib/supabase/middleware.ts` — `/auth/*` whitelisted en plus de `/login`, `/handoff`, `/`.

### Documents partagés
- **CRÉÉ** : `/Users/chandlermilien/FOREAS-SHARED/AUTH_ARCHITECTURE.md` — contrat v1.0 des 3 portes, mapping URLs, helpers TypeScript, anti-patterns site.
- **CRÉÉ** : `/Users/chandlermilien/FOREAS-SHARED/briefs/SITE_AUTH_BRANCHING_PROMPT.md` — prompt à copier dans le fil site pour brancher CTAs Mon-espace/Connexion sur les bonnes portes via helper `authUrls` centralisé.
- **MAJ** : `/Users/chandlermilien/FOREAS-SHARED/AJNAYA_CHANGELOG.md` — entrée FIL DASHBOARD ajoutée.

### TypeScript
- `npx tsc --noEmit` → 0 erreur.

### Tests visuels (Claude Preview)
- `/login` (default) → eyebrow violet "ESPACE PARTENAIRES · FOREAS" ✓
- `/login?role=admin` → badge "ADMIN" danger + headline "Ton infrastructure, ton contrôle." ✓
- `/login?role=driver` → badge "CHAUFFEUR" cyan + headline "Tes données, ton pilotage." ✓
- `/auth/reset` → eyebrow "SÉCURITÉ · RÉCUPÉRATION D'ACCÈS" + headline "Mot de passe oublié ?" ✓
- `/auth/update` → eyebrow "SÉCURITÉ · NOUVEAU MOT DE PASSE" + strength indicator fonctionnel ✓
- Zéro erreur console sur les 4 pages.

---

## 2026-05-02 — Session complète — Dashboard completion sprint — IMPACT majeur — ROLLBACK git revert

## Pages construites / connectées (données réelles Supabase)

### Driver space
- `/driver/coach` — Coach Ajnaya connecté à `pieuvre_churn_scores` + `getDriverKPIs` + `getDriverSignupWeekTrend`. Score coach calculé depuis churn.score réel (100 - score). Insights dynamiques, CA par semaine, risk badge.
- `/driver/heatmap` — Zones live avec détection heure de pointe temps réel (`currentHour`). `ZONES_V1` typées. HeroGradientCard avec `glow={isHotRightNow}`. Placeholder premium H3 Q3 2026.
- `/driver/clients-prives` — Query réelle table `bookings` filtrée par `driver_id`. Gestion empty state "Pipeline en construction". Section 3 étapes "comment ça marche".

### Admin space (5 stubs → pages complètes)
- `/admin/acquisition` — Funnel global + signups chauffeurs/partenaires par semaine (8 sem). KPIs : croissance semaine, CAC organique. Données réelles via `getAcquisitionFunnelData()` + `getAdminGlobalKPIs()`.
- `/admin/stack` — Santé infra Railway/Supabase/Vercel/N8N. Workflows OK vs erreurs. Feature flags grid. Roadmap WATCHDOG Q3 2026. Données réelles via `getPieuvreWorkflowHealth()` + `getActiveFeatureFlags()`.
- `/admin/securite` — Rôles & permissions via `getUserRolesList()`. Répartition par rôle, audit des accès, alerte super_admin, historique révocations. Roadmap fraud_signals Q3 2026.
- `/admin/moderation` — File de vérification cartes VTC depuis `getRecentDriversAdmin()`. Comptes suspendus, nouveaux inscrits à surveiller. Roadmap modération IA Q3 2026.
- `/admin/reports` — Synthèse mensuelle KPIs. Funnel acquisition 8 sem bicolore (drivers violet + partners cyan). Section exports CSV placeholder Q3 2026. Données réelles via `getAdminGlobalKPIs()` + `getAcquisitionFunnelData()`.
- `/admin/communaute` — Taille réseau réelle (totalDrivers/activeDrivers). Try community_alerts table. 4 modules roadmap. Vision "communauté comme avantage concurrentiel". Données réelles via `getAdminGlobalKPIs()` + Supabase direct.

### Queries ajoutées (`lib/queries/admin.ts`)
- `getAcquisitionFunnelData()` — Signups par semaine 8 sem (drivers + partners groupés par lundi ISO)
- `getUserRolesList(limit)` — Liste user_roles avec is_active, granted_at, revoked_at

### Queries ajoutées (`lib/queries/driver.ts`)
- `getDriverChurnScore(driverId)` — Fetch `pieuvre_churn_scores` maybeSingle
- `getDriverSignupWeekTrend(driverId)` — Rides groupés par semaine → `{ weekLabel, rides, ca, eurPerHour }[]`

### Preloader
- `components/foreas/Preloader.tsx` — Créé. Exact replica du Preloader site vitrine adapté aux tokens dashboard. Timer 2200ms, ForeasLogo variant="full", divider-gradient.svg, dot cyan-electric pulsant.
- `app/layout.tsx` — `<Preloader />` ajouté avant `{children}`.

### TypeScript
- `npx tsc --noEmit` → 0 erreur après correction `variant="warm"` → `variant="violet"/"gold"` sur `<Eyebrow>` (warm non supporté dans le composant dashboard).
