# 🏛️ FOREAS Dashboard

> Plateforme web FOREAS — **3 espaces distincts** : Directeur de groupe (CAE) · Chauffeur salarié · Admin Console.
>
> Dark-first premium · Pixel-perfect avec FOREAS-Clean (app mobile) · Stack Next.js 15 + Supabase + Tailwind v3 + shadcn-style.

[![Build](https://img.shields.io/badge/build-passing-success)]() [![Stack](https://img.shields.io/badge/Next.js-15.5-black)]() [![Stack](https://img.shields.io/badge/Supabase-RLS-3ECF8E)]() [![Stack](https://img.shields.io/badge/Tailwind-v3.4-38B2AC)]()

---

## 🎯 Mission

Servir **3 dashboards distincts** depuis le même domaine `dashboard.foreas.xyz` :

1. **`/partner`** — Directeur de groupe (agent commercial indépendant qui gère ses chauffeurs)
2. **`/driver`** — Chauffeur salarié CDI CAE FOREAS (vue web, complément app mobile)
3. **`/admin`** — Super-admin Chandler (vision globale + monitoring stack + Pieuvre)

Chaque rôle a son propre layout, sa propre navigation, ses propres queries.

---

## 📐 Architecture

```
foreas-partners/
├── app/
│   ├── (partner)/
│   │   ├── layout.tsx              # Sidebar partner + auth check
│   │   └── partner/
│   │       ├── page.tsx            # Dashboard hero "3 actions urgentes"
│   │       ├── chauffeurs/         # Liste détaillée flotte
│   │       ├── recrutement/        # Code parrainage + landing + Lead Gen
│   │       ├── clients-b2b/        # Pipeline B2B distribuable
│   │       ├── commissions/        # Historique facturation
│   │       └── profil/             # Statut agent commercial
│   ├── (driver)/
│   │   ├── layout.tsx              # Sidebar driver + auth check
│   │   └── driver/
│   │       ├── page.tsx            # Hero + KPI + 4 sections
│   │       ├── coach/              # Coach Ajnaya (verdicts IA)
│   │       ├── heatmap/            # Zones live (placeholder KVM4)
│   │       ├── clients-prives/     # Pipeline VIP courses 80-200€
│   │       ├── paie/               # Fiches de paie CAE téléchargeables
│   │       └── parrainage/         # MLM 3 niveaux (10€/4€/2€)
│   ├── (admin)/
│   │   ├── layout.tsx              # Sidebar admin + role check
│   │   └── admin/
│   │       ├── page.tsx            # Vue d'ensemble + Realtime feed
│   │       ├── chauffeurs/         # Tous les chauffeurs FOREAS
│   │       ├── partenaires/        # Tous les partenaires
│   │       ├── finance/            # MRR + Stripe + Commissions
│   │       ├── pieuvre/            # Tentacules + workflows + LLM
│   │       └── …                   # acquisition, communaute, moderation, stack, securite, reports
│   ├── handoff/claim/              # /handoff/claim?token=… (cross-canal site → dashboard)
│   ├── login/                      # Login dark-first avec ambient glow
│   ├── dashboard/                  # Redirect legacy → /partner
│   ├── layout.tsx                  # Root layout + CommandPalette ⌘K global
│   └── page.tsx                    # / → redirect intelligent
├── components/
│   └── foreas/                     # Composants signature FOREAS
│       ├── Eyebrow.tsx
│       ├── GlassCard.tsx
│       ├── HeroGradientCard.tsx
│       ├── StatCard.tsx
│       ├── ActionChip.tsx
│       ├── StatusPill.tsx
│       ├── Sidebar.tsx             (partner)
│       ├── DriverSidebar.tsx
│       ├── AdminSidebar.tsx
│       ├── TopBar.tsx
│       ├── CARevenueChart.tsx
│       ├── PriorityList.tsx
│       ├── FleetTable.tsx
│       ├── RealtimeFeed.tsx        (Supabase Realtime channels)
│       ├── CommandPalette.tsx      (⌘K global, cmdk)
│       └── AdminPlaceholder.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client (@supabase/ssr)
│   │   ├── server.ts               # Server Components / RSC
│   │   └── middleware.ts           # Cookie refresh dans middleware.ts
│   ├── queries/
│   │   ├── partner.ts              # KPI, drivers, urgent actions, priorities, chart
│   │   ├── driver.ts               # KPI driver, rides, paie estimée
│   │   └── admin.ts                # Global KPIs, workflows, feature flags
│   ├── supabase.ts                 # Compat re-export
│   └── utils.ts                    # cn, formatEUR, formatPercent, getInitials
├── types/
│   └── database.ts                 # Types Supabase (introspection live)
├── middleware.ts                   # Auth refresh + protection routes
├── tailwind.config.ts              # Tokens FOREAS (obsidian/violet-royal/cyan)
├── app/globals.css                 # glass-card, halo-pulse, gradient-bg
└── package.json
```

---

## 🛠 Stack

| Couche | Tech |
|---|---|
| Framework | **Next.js 15.5** (App Router, RSC, Server Actions) |
| Language | **TypeScript 5** strict |
| Styling | **Tailwind CSS v3.4** + tokens FOREAS portés depuis `FOREAS-Clean/src/design/premium.ts` |
| Animations | **Framer Motion 11** (subtle fade-in, hover glow) |
| Charts | **Recharts** + gradient violet/cyan |
| Auth | **Supabase Auth** (`@supabase/ssr`) avec cookies SSR |
| DB | **Supabase Postgres** projet `fihvdvlhftcxhlnocqiq` (eu-north-1) |
| Realtime | **Supabase Realtime** channels postgres_changes |
| Forms | **react-hook-form + zod** |
| Icons | **lucide-react** |
| Command Palette | **cmdk** (⌘K) |
| State | **Zustand** + **TanStack Query** |
| Tables | **TanStack Table** (V8) |
| Deployment | **Vercel** (custom domain `dashboard.foreas.xyz` à venir) |

---

## 🎨 Design tokens (extraits)

```ts
// tailwind.config.ts
colors: {
  obsidian:        '#0B0F1E',       // fond principal
  'obsidian-deep': '#070A14',       // sidebar
  'violet-royal':  '#8C52FF',       // accent primaire
  'cyan-electric': '#00D4FF',       // accent secondaire
  'glass-high':    'rgba(17,21,40,0.88)',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
}

// globals.css
.glass-card        { @apply bg-glass-high border border-glass-border rounded-xl backdrop-blur-md; }
.halo-pulse        { @apply animate-pulse-violet; }
.eyebrow           { @apply text-eyebrow uppercase text-violet-royal; }
.gradient-hero     { background: linear-gradient(135deg, #8C52FF, #6C3CE0, #00D4FF); }
```

Cohérence garantie pixel-perfect avec l'app mobile FOREAS-Clean.

---

## 🔐 Auth & RLS

### Flow

```
1. /login (Supabase email + password)
2. Auth réussi → middleware.ts refresh la session via cookies SSR
3. Redirect selon contexte :
   - user_roles role='admin'/'super_admin' → /admin
   - partner exists for user_id           → /partner
   - default                              → /driver
4. Cas spécial : /handoff/claim?token=… (depuis foreas.xyz)
   → POST {RAILWAY_API}/api/app/claim-handoff
   → Restore identity_id + redirect intent
```

### Migrations Supabase appliquées

| Migration | Contenu |
|---|---|
| `dashboard_helpers_v1` | Functions `is_admin()`, `is_partner()`, `get_partner_id()` |
| `dashboard_admin_driver_notes_v1` | Table `admin_driver_notes` (mini-CRM admin) + RLS + trigger updated_at |
| `dashboard_rls_partner_visibility_v1` | RLS strictes : drivers / partners / partner_commissions / partner_referrals / rides / user_roles |

**Règle d'or** : aucune `service_role_key` côté client. Server Actions Next.js uniquement pour les opérations admin sensibles.

---

## ⚡ Démarrage

```bash
# Cloner
git clone https://github.com/Ajnaya509/foreas-partners.git
cd foreas-partners

# Installer
npm install

# Variables env (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://fihvdvlhftcxhlnocqiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
RAILWAY_API_URL=https://app.foreas.xyz   # backend Pieuvre

# Dev
npm run dev
# → http://localhost:3000
# → redirect /login (si non auth)
# → connecte un partner Supabase existant → /partner
```

---

## 🌐 Routes

| Route | Rôle | Description |
|---|---|---|
| `/` | tous | Redirect intelligent selon auth |
| `/login` | non-auth | Connexion dark-first FOREAS |
| `/handoff/claim?token=…` | site → dashboard | Cross-canal handoff (Identity Bridge) |
| `/partner` | partner | Dashboard hero + KPI + flotte |
| `/partner/chauffeurs` | partner | Liste détaillée flotte |
| `/partner/recrutement` | partner | Code parrainage + Lead Gen |
| `/partner/clients-b2b` | partner | Pipeline B2B distribuable |
| `/partner/commissions` | partner | Historique 24 mois + factures |
| `/partner/profil` | partner | Statut juridique agent commercial |
| `/driver` | driver | Hero + KPI + 4 sections |
| `/driver/coach` | driver | Coach Ajnaya (verdicts IA) |
| `/driver/heatmap` | driver | Zones live (KVM4 en cours) |
| `/driver/clients-prives` | driver | Pipeline VIP 80-200€ |
| `/driver/paie` | driver | Fiches de paie CAE |
| `/driver/parrainage` | driver | MLM 3 niveaux |
| `/admin` | admin | Vue d'ensemble + Realtime feed |
| `/admin/{section}` | admin | 11 sections (chauffeurs, partenaires, finance, pieuvre, etc.) |

⌘K global → Command Palette pour naviguer entre toutes les routes.

---

## 🎯 Features signature

- ✨ **Hero "3 actions urgentes"** : pattern signature partner dashboard avec ActionChip pulsing
- 🌐 **Realtime feed** : Supabase Realtime postgres_changes (rides, drivers, subscribers, conversations Pieuvre)
- ⌘K **Command Palette** (cmdk) : navigation ultra-rapide entre les 24 routes
- 🎨 **Design system** : 11 composants signature (Eyebrow, GlassCard, StatCard, ActionChip, etc.)
- 🔒 **RLS multi-niveaux** : partner ne voit QUE ses chauffeurs, admin voit tout
- 🔗 **Handoff token** : cross-canal site → dashboard via `handoff_tokens` table (TTL 48h)
- 📊 **Charts gradient** : Recharts AreaChart avec gradient violet sous courbe
- 💎 **Glass-morphism dark** : pixel-perfect avec FOREAS-Clean app mobile

---

## 📦 Documents de référence

À consulter pour comprendre le projet en profondeur :

1. `/Users/chandlermilien/FOREAS-SHARED/DASHBOARD_BRIEF.md` — **Mega brief technique + business** (1500+ lignes)
2. `/Users/chandlermilien/FOREAS-SHARED/AJNAYA_NORTH_STAR.md` — Règles non-négociables
3. `/Users/chandlermilien/FOREAS-SHARED/AJNAYA_STATE.md` — État écosystème
4. `/Users/chandlermilien/FOREAS-SHARED/AJNAYA_CONTRACTS.md` — Schémas SQL référence
5. `/Users/chandlermilien/FOREAS-SHARED/PIEUVRE_CLAUDE.md` — Cerveau IA
6. `/Users/chandlermilien/FOREAS-Clean/src/design/premium.ts` — **Source de vérité design system**

---

## 🚀 Déploiement

```bash
# Vercel (custom domain dashboard.foreas.xyz)
npx vercel link
npx vercel env pull
npx vercel --prod
```

Configurer dans Vercel :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RAILWAY_API_URL`
- Custom domain : `dashboard.foreas.xyz`

---

## 🧪 Build status

```
Route (app)                       Size  First Load JS
┌ ƒ /                            154 B         102 kB
├ ƒ /admin                        2 kB         115 kB
├ ƒ /admin/chauffeurs           2.0 kB         111 kB
├ ƒ /admin/partenaires          2.0 kB         111 kB
├ ƒ /admin/finance              2.0 kB         111 kB
├ ƒ /admin/pieuvre              2.0 kB         111 kB
├ ƒ /driver                     2.6 kB         115 kB
├ ƒ /driver/clients-prives      154 B         102 kB
├ ƒ /driver/paie                2.0 kB         111 kB
├ ƒ /driver/parrainage          2.0 kB         111 kB
├ ƒ /handoff/claim              154 B         102 kB
├ ○ /login                      3.4 kB         155 kB
├ ƒ /partner                   94.1 kB         214 kB
├ ƒ /partner/chauffeurs         542 B         113 kB
├ ƒ /partner/clients-b2b        2.0 kB         111 kB
├ ƒ /partner/commissions        2.0 kB         111 kB
└ ƒ /partner/recrutement        2.0 kB         111 kB
+ Middleware                    69.9 kB
```

---

## 🤝 Cross-fil coordination

### Avec fil App (`FOREAS-Clean`)
- Source de vérité design : `src/design/premium.ts`
- Si tokens changent côté mobile → port immédiatement dans `tailwind.config.ts`

### Avec fil Site Desktop (`foreas-website`)
- Bouton "Espace Directeur" sur `foreas.xyz` → POST `/api/handoff/dashboard` → redirect `/handoff/claim?token=…`
- Côté dashboard : route `/handoff/claim` déjà prête à recevoir

### Avec fil Pieuvre (N8N + Supabase)
- Lecture `pieuvre_*` tables (workflow_logs, churn_scores, b2b_prospects, etc.)
- Ne pas écrire dans ces tables — la Pieuvre est seule à les maintenir

---

**FOREAS Dashboard** — Coopérative VTC nouvelle génération 🏛️
