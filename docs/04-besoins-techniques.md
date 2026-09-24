# Documentation des Besoins Techniques — ManuShop

---

## 1. Stack Technologique

| Couche | Technologie | Justification |
|---|---|---|
| Frontend | Next.js 15 + TypeScript | SSR, SSG, App Router, performances optimales |
| Styling | Tailwind CSS + shadcn/ui | Rapide, cohérent, mobile-first |
| Base de données | Firebase Firestore (NoSQL) | Temps réel, scalable, sans serveur |
| Authentification | Firebase Auth | Sécurisé, multi-provider, gratuit |
| Stockage fichiers | Cloudinary | Photos produits, logos, PDFs — évite le forfait Blaze requis par Firebase Storage |
| Hébergement | Vercel | CI/CD automatique, CDN global, gratuit |
| État global | Zustand | Léger, simple, TypeScript-friendly |
| Formulaires | React Hook Form + Zod | Validation robuste, typée |
| PDF | React-PDF | Génération de factures PDF côté client |
| Notifications Push | Firebase Cloud Messaging | Notifications PWA natives |
| Emails | Resend | Emails transactionnels (confirmations) |

---

## 2. Intégrations Externes

| Service | API | Usage |
|---|---|---|
| WhatsApp Business | Cloud API (Meta) | Envoi factures, partage produits |
| Facebook | Meta Graph API v21 | Publication posts, Facebook Ads |
| Instagram | Meta Graph API v21 | Publication posts, stories |
| TikTok | TikTok Business API | Publication vidéos/posts |
| Cloudinary (optionnel) | REST API | Optimisation et transformation images |

---

## 3. Architecture Globale

```
┌─────────────────────────────────────────────┐
│                   CLIENT                     │
│         Next.js PWA (App Router)             │
│   React Components + Zustand + React Query   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              NEXT.JS API ROUTES              │
│         /api/* (Server Actions)              │
│    Validation Zod + Logique métier           │
└──────┬───────────────────────┬──────────────┘
       │                       │
┌──────▼──────┐      ┌─────────▼────────────┐
│  FIREBASE   │      │   APIS EXTERNES       │
│  Firestore  │      │  Meta Graph API       │
│  Auth       │      │  WhatsApp Business    │
│  Storage    │      │  TikTok API           │
│  FCM        │      │  Resend               │
└─────────────┘      └──────────────────────┘
```

---

## 4. Design Patterns Utilisés

### 4.1 Repository Pattern
Abstraction de l'accès à Firestore — les composants n'appellent jamais Firestore directement.

```typescript
// src/repositories/interfaces/IProductRepository.ts
interface IProductRepository {
  getAll(): Promise<Product[]>
  getById(id: string): Promise<Product | null>
  create(product: CreateProductDto): Promise<Product>
  update(id: string, data: UpdateProductDto): Promise<Product>
  delete(id: string): Promise<void>
}
```

### 4.2 Service Pattern
Logique métier séparée des repositories.

```typescript
// src/services/ProductService.ts
class ProductService {
  constructor(private repo: IProductRepository) {}

  async createProduct(data: CreateProductDto): Promise<Product> {
    // Validation, règles métier, appel repo
  }

  async applyPromotion(productId: string, discount: number): Promise<void> {
    // Logique de promotion
  }
}
```

### 4.3 Factory Pattern
Création d'objets complexes (factures, publications).

```typescript
// src/factories/InvoiceFactory.ts
class InvoiceFactory {
  static create(order: Order, shop: Shop): Invoice {
    return {
      number: generateInvoiceNumber(),
      date: new Date(),
      items: order.items,
      total: calculateTotal(order.items),
      shop,
    }
  }
}
```

### 4.4 Observer Pattern
Réactions aux changements de stock, commandes via Firebase onSnapshot.

```typescript
// Écoute en temps réel
const unsubscribe = onSnapshot(
  doc(db, 'products', productId),
  (snapshot) => {
    const product = snapshot.data() as Product
    if (product.stock < product.stockThreshold) {
      notifyLowStock(product)
    }
  }
)
```

### 4.5 Strategy Pattern
Gestion des publications multicanal.

```typescript
// src/strategies/publishing/IPublishingStrategy.ts
interface PublishingStrategy {
  publish(content: PublishContent): Promise<PublishResult>
}

class WhatsAppStrategy implements PublishingStrategy { ... }
class FacebookStrategy implements PublishingStrategy { ... }
class InstagramStrategy implements PublishingStrategy { ... }
class TikTokStrategy implements PublishingStrategy { ... }

class PublishingContext {
  constructor(private strategy: PublishingStrategy) {}
  execute(content: PublishContent) {
    return this.strategy.publish(content)
  }
}
```

---

## 5. Modèle de Données Firestore

### Collection `shops`
```typescript
interface Shop {
  id: string
  name: string
  logo: string
  address: string
  phone: string
  whatsapp: string
  currency: 'XAF'
  ownerId: string
  createdAt: Timestamp
}
```

### Collection `products`
```typescript
interface Product {
  id: string
  shopId: string
  name: string
  description: string
  price: number
  category: string
  images: string[]
  stock: number
  stockThreshold: number
  isPromo: boolean
  promoPrice?: number
  promoEnd?: Timestamp
  variants?: ProductVariant[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection `orders`
```typescript
interface Order {
  id: string
  shopId: string
  clientName: string
  clientPhone: string
  clientAddress: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  status: 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled'
  invoiceUrl?: string
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection `promotions`
```typescript
interface Promotion {
  id: string
  shopId: string
  title: string
  type: 'percentage' | 'fixed'
  value: number
  targetType: 'product' | 'category' | 'all'
  targetId?: string
  code?: string
  startDate: Timestamp
  endDate: Timestamp
  isActive: boolean
}
```

### Collection `publications`
```typescript
interface Publication {
  id: string
  shopId: string
  content: string
  imageUrl: string
  channels: ('whatsapp' | 'facebook' | 'instagram' | 'tiktok')[]
  scheduledAt?: Timestamp
  publishedAt?: Timestamp
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  results: PublishResult[]
}
```

### Collection `users`
```typescript
interface User {
  id: string
  email: string
  role: 'admin' | 'seller' | 'client'
  shopId?: string
  displayName: string
  phone?: string
  createdAt: Timestamp
}
```

---

## 6. Règles de Sécurité Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Produits — lecture publique, écriture admin/vendeur
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid))
          .data.role in ['admin', 'seller'];
    }

    // Commandes — lecture/écriture authentifiée
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }

    // Utilisateurs — lecture/écriture de son propre profil
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Shop — lecture publique, écriture admin seulement
    match /shops/{shopId} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid))
          .data.role == 'admin';
    }
  }
}
```

---

## 7. Configuration PWA

```typescript
// next.config.ts
import withPWA from 'next-pwa'

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60
        }
      }
    }
  ]
})

export default config
```

---

## 8. Variables d'Environnement

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Cloudinary (stockage images/PDF)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Meta (Facebook/Instagram)
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=

# WhatsApp Business
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Resend (emails)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 9. CI/CD Pipeline

```
Push sur main
     │
     ▼
GitHub Actions
     │
     ├── ESLint + TypeScript check
     ├── Tests Jest
     └── Build Next.js
          │
          ▼
       Vercel
     (déploiement automatique)
```

---

## 10. Dépendances NPM

```bash
# Firebase
npm install firebase firebase-admin

# Cloudinary (stockage images/PDF)
npm install cloudinary next-cloudinary

# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npx shadcn@latest init

# État global
npm install zustand

# Formulaires & Validation
npm install react-hook-form zod @hookform/resolvers

# PDF
npm install @react-pdf/renderer

# Notifications toast
npm install sonner

# Icons
npm install lucide-react

# Date
npm install date-fns

# PWA
npm install next-pwa

# Utilitaires
npm install clsx tailwind-merge

# Dev
npm install -D @types/node jest @testing-library/react \
  @testing-library/jest-dom jest-environment-jsdom
```

---

## 11. Plateforme Multi-Boutique & Super Administration (2026-09-21)

*Voir Module 12 dans `02-besoins-fonctionnels.md` (BF-62→70) et §10 de `01-business-plan.md` pour le contexte métier.*

⚠️ Le reste de ce document (§1 à §10) décrit encore l'architecture **mono-tenant** initialement prévue (une seule boutique par déploiement, résolue via `ShopService.getPrimaryShop()`) — toujours le cas en pratique pour le storefront et le dashboard actuels. Les points ci-dessous sont ce qui doit changer.

**État au 2026-09-21** — fait : modèles `User`/`Shop` étendus, collection `platformAdmins` + `firestore.rules` (verrou Super Admin, inscription qui ne crée plus jamais `role: 'admin'`), `AuthService`/formulaires d'inscription mis à jour en conséquence. Pas fait : page Super Admin, abonnement payant, expiration automatique, annuaire, routing multi-tenant, liens réseaux sociaux par article.

### 11.1 Hiérarchie des rôles

Révision du 2026-09-21 par rapport à la version précédente de cette section : **le Super Admin n'est pas une valeur de `role`** — voir §11.5. `UserRole` reste `'admin' | 'seller' | 'client'`.

```
admin     (gérant d'une boutique — obtenu par attribution manuelle du Super Admin ou abonnement, jamais à l'inscription)
  └─ seller  (vendeur d'une boutique, invité par un admin — inchangé)
client    (rôle par défaut à l'inscription, PAS scopé à une boutique — peut être client de N boutiques)
```

**Changement de sens important sur `User.shopId`** : aujourd'hui obligatoire pour `admin`/`seller` et absent pour `client` faute d'usage. Avec le multi-tenant, `shopId` reste la boutique **possédée/gérée** par un `admin`/`seller`, mais un `client` n'a et n'aura jamais de `shopId` : son identité est valable sur toute la plateforme, pas sur une boutique en particulier (panier/commande passés en précisant la boutique concernée à chaque fois, pas via son profil).

```typescript
type SubscriptionPlan = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface User {
  id: string
  email?: string
  phone?: string
  role: 'admin' | 'seller' | 'client'
  shopId?: string                        // uniquement pour admin/seller
  adminSource?: 'manual' | 'subscription' // comment ce compte est devenu admin (BF-68/69)
  subscriptionPlan?: SubscriptionPlan      // uniquement si adminSource === 'subscription'
  subscriptionExpiresAt?: Timestamp        // idem — le job d'expiration (§11.5) s'appuie dessus
  displayName: string
  photoURL?: string
  createdAt: Timestamp
}
```

**Fait le 2026-09-21** : `UserRole`, `User.adminSource`/`subscriptionPlan`/`subscriptionExpiresAt` ajoutés dans le code (`src/models/user/`). `AuthService.registerShopOwner`/`completeMerchantSignup` créent désormais toujours `role: 'client'` ; une nouvelle méthode `AuthService.createShop(shopName)` crée la boutique et la relie au profil, mais seulement utilisable une fois `role === 'admin'` (vérifié par `firestore.rules`, pas encore appelée depuis une UI — pas de formulaire "créer ma boutique" post-promotion construit).

### 11.2 Modèle `Shop` étendu

```typescript
interface Shop {
  id: string
  ownerId: string
  name: string
  logo: string
  address: string
  phone: string
  whatsapp: string
  currency: string
  // Nouveau : publication (BF-62)
  isPublished: boolean          // false par défaut : boutique en configuration, pas visible publiquement
  publicToken: string           // identifiant opaque utilisé dans l'URL (BF-64), voir §11.3 — jamais l'id Firestore brut
  // Nouveau : liens réseaux sociaux de la boutique (BF-66)
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  whatsappBusinessUrl?: string
  createdAt: Timestamp
}
```

**Fait le 2026-09-21** : ces champs sont dans `src/models/shop/Shop.ts`, tous optionnels (une boutique existante sans ces champs est traitée comme non publiée, `isPublished ?? false`). Aucune UI ne les lit/écrit encore.

**Lien réseau social par article (BF-66)** : un client ne doit voir le lien vers un réseau que si l'article a réellement été publié dessus. Ça suppose que chaque `Product` sache sur quels réseaux il a été publié — champ à ajouter, ex. `publishedChannels?: ('facebook'|'instagram'|'tiktok'|'whatsapp')[]`, **pas encore ajouté au modèle**. **Point ouvert** : le Module 8 (Publication Multicanal, BF-41→47) qui devait produire cette donnée n'est pas commencé — tant qu'il ne l'est pas, ce champ resterait vide et aucun lien ne s'afficherait (comportement honnête par défaut, pas de lien inventé).

### 11.3 Schéma d'URL par boutique (BF-64)

Forme demandée : `/{tokenOpaque}/{nomDePage}/{nomDuComposant}` — ex. `/aZ4mK9/catalogue/ensemble-wax-moderne`.

- `tokenOpaque` encode `ownerId` + `shopId` sans les exposer en clair. **Point ouvert, à trancher avant de coder** : un encodage réversible côté client (ex. base64url ou `hashids` de `${ownerId}:${shopId}`) suffit à masquer les ids Firestore bruts, mais reste décodable par qui l'inspecte — pas une vraie protection cryptographique. Une vraie protection (chiffrement avec une clé serveur) demanderait une route API pour résoudre le token, ce que l'architecture 100% client actuelle (pas de `firebase-admin`) ne fait nulle part ailleurs. **Proposition** : encodage réversible simple (suffisant si le but est d'éviter des URLs moches/devinables, pas de cacher l'existence d'une boutique) — à confirmer.
- `nomDePage` : section de la boutique (`catalogue`, `a-propos`, etc.)
- `nomDuComposant` : élément précis dans cette page (ex. le slug d'un produit pour une fiche produit — BF-37, toujours pas construite)

Implication routing Next.js : `src/app/[shopToken]/[page]/[component]/page.tsx` (ou variante avec des segments optionnels), remplaçant l'actuel `src/app/(storefront)/catalogue/page.tsx` mono-tenant. Toutes les pages storefront actuelles devront resoudre la boutique à partir de `shopToken` au lieu de `shopService.getPrimaryShop()`.

### 11.4 Annuaire des boutiques (BF-63)

Remplace ou complète `/onboarding` : liste les boutiques où `isPublished == true`, avec lien vers leur URL dédiée (§11.3). Un visiteur non connecté doit pouvoir la consulter (page publique, pas de garde d'authentification).

**Boutiques factices ("virtuelles")** : tant que l'annuaire est vide ou presque, afficher des cartes de boutiques fictives, visuellement identiques aux vraies mais non cliquables vers une vraie page — un clic redirige vers un article Google externe (decoy), pour que la plateforme ne paraisse pas vide à ses tout premiers visiteurs. Implémentation suggérée : tableau statique côté client (pas de collection Firestore dédiée, ce sont de simples données d'affichage), rendu seulement quand la requête `shops` réelle retourne peu de résultats.

### 11.5 Super Admin, attribution manuelle et abonnement (BF-67→70)

**Le Super Admin n'est pas un rôle sur `users`** — c'est l'appartenance à une collection dédiée. Révision du 2026-09-21 par rapport à la première version de cette section (qui proposait `role: 'super-admin'` sur `users`) : une collection séparée est plus sûre (aucune ambiguïté possible avec le champ `role` normal) et correspond à la demande explicite de l'utilisateur.

```typescript
// Collection `platformAdmins`, id de document = email en minuscules.
interface PlatformAdmin {
  email: string
  addedAt: Timestamp
}
```

**Fait le 2026-09-21** (`src/models/platform/PlatformAdmin.ts`, `firestore.rules`) :
- `platformAdmins/{email}` : lecture réservée à qui possède cet email (`request.auth.token.email == email`), **écriture interdite pour tout le monde** (`allow write: if false`) — seule une modification manuelle depuis la console Firebase (qui n'est pas soumise aux règles) peut y ajouter ou retirer un email.
- `users` : la vérification "est-ce un Super Admin ?" se fait par `exists(/databases/$(database)/documents/platformAdmins/$(request.auth.token.email))`, plus par un champ `role`. Un Super Admin peut lire tous les profils et changer le rôle de n'importe qui vers `admin`/`seller`/`client` (jamais autre chose, la valeur `'super-admin'` n'existe même plus dans `UserRole`).
- L'auto-inscription (`create` sur `users` par soi-même) n'accepte plus que `role == 'client'` — avant le 2026-09-21, elle acceptait `'admin'` directement. **Conséquence assumée** : tant que la page Super Admin (ci-dessous) n'existe pas, personne ne peut devenir admin autrement qu'en éditant directement Firestore depuis la console — acceptable en développement actif, plus du tout une fois en production.

**BF-68, attribution manuelle — page Super Admin** :
- Page `/super-admin`, protégée par l'appartenance à `platformAdmins` (pas juste `role === 'admin'`) via `SuperAdminRoute`.
- Recherche d'un compte par pseudo (`displayName`), email ou téléphone.
- Bouton pour donner le rôle `admin` (`adminSource: 'manual'`, pas de `subscriptionExpiresAt`) et pour le retirer (repasse à `role: 'client'`) — à tout moment, sans lien avec un abonnement.
- **Mis à jour le 2026-09-23** : `grantAdmin`/`revokeAdmin`/`searchUsers` ne passent plus uniquement par `firestore.rules` — ils sont désormais exécutés via des Server Actions (`src/server/actions/platformAdminActions.ts`) qui revérifient le privilège Super Admin en code (`src/server/auth/requireSuperAdmin.ts`) avant d'écrire via `firebase-admin` (`src/lib/firebaseAdmin.ts`). Voir le journal de progression pour le détail de cette introduction de couche serveur ; les règles Firestore restent inchangées, en défense en profondeur.

**BF-69, abonnement payant avec expiration automatique (pas commencé)** :
- Un client clique "créer ma boutique", choisit une durée (`daily`/`weekly`/`monthly`/`quarterly`/`yearly`), paie. **Point ouvert, non résolu par l'utilisateur pour l'instant** : aucun moyen de paiement n'est choisi (Mobile Money, carte, etc.) — aucune intégration de paiement n'existe dans le projet à ce stade.
- Une fois le paiement confirmé, le compte devient `role: 'admin'`, `adminSource: 'subscription'`, avec `subscriptionExpiresAt` calculé selon la durée choisie.
- **Expiration automatique — architecture désormais tranchée (2026-09-23), job pas encore écrit** : il faut qu'"un serveur" repasse `role` à `client` une fois `subscriptionExpiresAt` dépassé, sans intervention humaine. L'option 1 ci-dessous est retenue, et son prérequis (accès Firestore privilégié côté serveur) existe déjà depuis l'introduction de `firebase-admin` pour BF-68 :
  1. **Retenu — Vercel Cron** (le projet est déjà déployé sur Vercel) déclenchant une route `/api/cron/expire-subscriptions` (pas encore créée), protégée par un secret dédié (`CRON_SECRET`, pas un token Firebase — il n'y a pas d'utilisateur connecté pour un job système) plutôt que par `SuperAdminRoute`. Utiliserait `getAdminDb()` (`src/lib/firebaseAdmin.ts`, déjà en place) pour écrire en contournant les règles.
  2. Firebase Cloud Functions avec un déclencheur planifié — écarté (le projet évite l'infrastructure Firebase Functions au profit de Vercel, déjà utilisé pour l'hébergement).
  `firebase-admin` a été introduit dans le projet le 2026-09-23 pour BF-68 (voir ci-dessus) — ce job de cron n'a donc plus besoin de justifier à lui seul cette dépendance, il ne fait que la réutiliser.

**BF-70, rétrogradation en fin d'abonnement (pas commencé)** : une fois `role` repassé à `client` par le job d'expiration, un ancien admin qui tente d'accéder à `/dashboard` doit être redirigé vers la page cliente de sa propre boutique (`profile.shopId` reste renseigné même après rétrogradation — seul `role` change) plutôt que vers une erreur 403 générique. Implique une petite adaptation de `ProtectedRoute` ou du routing multi-tenant (§11.3) pour distinguer ce cas d'un rejet de rôle ordinaire.

### 11.6 Ce qui doit être adapté ailleurs (impact du pivot)

**Fait le 2026-09-21** : `RegisterForm`/`OnboardingForm` ne demandent plus de nom de boutique (l'inscription ne crée plus de boutique) ; leurs redirections post-inscription pointent vers `/catalogue` au lieu de `/dashboard` ; `/dashboard` est maintenant explicitement restreint à `allowedRoles={["admin", "seller"]}` (un client qui tenterait d'y accéder tombe proprement sur `/erreur?code=403` au lieu d'un écran de chargement infini).

**Pas encore fait**, à faire à l'implémentation du reste de ce module :
- `useShop()` / `ShopService.getPrimaryShop()` — à remplacer par une résolution via `shopToken`.
- Toutes les pages storefront (`/catalogue`, `CartPanel`, liens WhatsApp) — à re-scoper par boutique.
- `firestore.rules` — lecture de `shops`/`products`/`categories` conditionnée à `isPublished == true` pour un visiteur anonyme (aujourd'hui encore en lecture publique inconditionnelle, pour ne pas casser `/catalogue` mono-tenant tant que ce qui précède n'est pas fait).
- Un formulaire "créer ma boutique" appelant `AuthService.createShop()` (déjà prêt côté service), déclenché une fois `role === 'admin'` obtenu par l'un des deux chemins du §11.5.
