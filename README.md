# FOREAS Partners Dashboard

Dashboard web pour les partenaires FOREAS - Interface moderne de gestion des référencements et revenus.

## 🚀 Structure

```
foreas-partners/
├── app/
│   ├── login/
│   │   └── page.tsx          # Page de connexion partenaires
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard principal
│   ├── layout.tsx            # Layout global
│   ├── globals.css           # Styles Tailwind
│   └── page.tsx              # Redirection vers login
├── lib/
│   └── supabase.ts           # Configuration Supabase
├── .env.local                # Variables d'environnement
└── README.md
```

## 🛠 Technologies

- **Next.js 15** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling moderne
- **Supabase** - Base de données et auth
- **Recharts** - Graphiques interactifs
- **Lucide React** - Icônes

## ⚡ Fonctionnalités

### 🔐 Authentification
- Connexion sécurisée partenaires
- Vérification des comptes via Supabase
- Gestion des sessions

### 📊 Dashboard
- **Stats temps réel** : Chauffeurs référés, actifs, revenus
- **Lien de parrainage** : Copie automatique
- **Graphique revenus** : Évolution mensuelle
- **Table chauffeurs** : Liste des référencements
- **Design glassmorphism** : Interface moderne

## 🚀 Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer en développement
npm run dev
```

## 🌐 Configuration

Créer un fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📈 Déploiement Vercel

```bash
# Déployer
npx vercel

# Configurer les variables d'environnement dans Vercel Dashboard
```

---

**FOREAS Partners** - Toujours plus loin. 🚗✨