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

⚠️ **Ébauche Phase 0, jamais implémentée telle quelle — voir §16 pour le schéma réel** (`status` a un vocabulaire différent, `clientId` a été ajouté, etc.). Gardée ici pour l'historique.

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

⚠️ **Ébauche Phase 0** — le fichier réel `firestore.rules` a beaucoup évolué depuis (scoping par boutique, Super Admin, corbeille, commandes verrouillées en écriture au profit de Server Actions...). Toujours s'y référer directement plutôt qu'à l'extrait ci-dessous, gardé pour l'historique.

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
WHATSAPP_ORDER_TEMPLATE_NAME=

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
  // Purement informatif (2026-09-25, sur demande explicite) — cohérence de
  // lecture avec `User.role` ('admin'/'seller') quand on consulte la
  // console Firebase. N'est JAMAIS lu par l'autorisation, qui reste basée
  // sur l'appartenance à la collection, pas sur la valeur de ce champ.
  role: 'super-admin'
  addedAt: Timestamp
}
```

**Fait le 2026-09-21** (`src/models/platform/PlatformAdmin.ts`, `firestore.rules`) :
- `platformAdmins/{email}` : lecture réservée à qui possède cet email (`request.auth.token.email == email`), **écriture interdite pour tout le monde** (`allow write: if false`) — seule une modification manuelle depuis la console Firebase (qui n'est pas soumise aux règles) peut y ajouter ou retirer un email. **À partir du 2026-09-25**, ce document manuel doit aussi inclure `role: 'super-admin'` (champ informatif seulement, voir ci-dessus).
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

---

## 12. Boutiques multiples par commerçant, statuts de commande étendus & nouveaux modules (2026-09-25)

*Voir Modules 13→22 dans `02-besoins-fonctionnels.md` (BF-71→119) pour le détail fonctionnel. Cette section couvre uniquement ce qui change ou s'ajoute au modèle de données et à l'architecture décrits en §5 et §11.*

### 12.1 Abonnement : déplacé de `User` vers `Shop` (implémenté 2026-09-25)

**Changement le plus structurant de cette révision.** §11.1 posait `adminSource`/`subscriptionPlan`/`subscriptionExpiresAt` sur `User`, sous l'hypothèse qu'un admin gère une seule boutique. Ce n'est plus vrai : un commerçant peut posséder plusieurs boutiques, chacune avec son propre abonnement (BF-85). Un abonnement finance une boutique précise, pas le compte entier — `subscriptionPlan`/`subscriptionExpiresAt` déménagent donc sur `Shop`.

Révision par rapport à la première ébauche de cette section : `adminSource` **reste** sur `User`, en plus d'apparaître sur `Shop`. Les deux ne portent pas le même sens : `User.adminSource` documente comment le compte a obtenu *pour la première fois* le droit de gérer des boutiques (`"manual"` = attribution Super Admin, BF-68 ; `"subscription"` = première boutique créée via l'assistant self-service, BF-79→85) — purement informatif, sans expiration. `Shop.adminSource` documente comment *cette boutique précise* a été créée, et pilote son propre cycle d'abonnement (`subscriptionPlan`/`subscriptionExpiresAt`). `role: 'admin'` sur `User` ne redescend jamais tout seul une fois obtenu (BF-93) — seul l'accès admin à une boutique donnée peut être restreint si son abonnement à elle expire.

```typescript
// User : rôle grossier + comment le compte a obtenu le droit de gérer des
// boutiques la toute première fois (informatif, sans expiration).
interface User {
  id: string
  email?: string
  phone?: string
  role: 'admin' | 'seller' | 'client'   // 'admin' = possède ou gère au moins une boutique
  shopId?: string                        // boutique "courante" pour la navigation (seller: sa seule boutique ; admin propriétaire de plusieurs boutiques : la dernière consultée, purement un confort d'UI — la vraie liste de ses boutiques vient toujours d'une requête shops where ownerId == uid)
  displayName: string
  photoURL?: string
  adminSource?: 'manual' | 'subscription'   // CONSERVÉ ici (voir ci-dessus)
  createdAt: Timestamp
  // subscriptionPlan / subscriptionExpiresAt RETIRÉS d'ici — jamais écrits
  // par aucun code livré avant cette migration (BF-69 n'avait jamais été
  // construit), suppression donc sans risque de régression.
}

// Shop : porte désormais son propre abonnement.
interface Shop {
  id: string
  ownerId: string
  name: string
  sector?: string                        // secteur d'activité (BF-80), absent du modèle avant cette migration
  logo: string
  address: string
  phone: string
  whatsapp: string
  currency: string
  isPublished: boolean
  publicToken: string
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  whatsappBusinessUrl?: string
  // Nouveau (BF-85, BF-93, BF-94) — comment CETTE boutique a été créée,
  // distinct de User.adminSource (voir plus haut).
  adminSource?: 'manual' | 'subscription'
  subscriptionPlan?: SubscriptionPlan   // renseigné seulement si adminSource === 'subscription'
  subscriptionExpiresAt?: Timestamp     // idem
  createdAt: Timestamp
}
```

**Conséquences concrètes, telles qu'implémentées :**
- `PlatformAdminService.grantAdmin`/`revokeAdmin` (Server Actions `platformAdminActions.ts`) **inchangés** : ils écrivent toujours `adminSource: 'manual'` sur `users/{userId}` — ce champ n'a pas bougé de `User`.
- Nouvelle Server Action `src/server/actions/shopActions.ts` (`createShopAction`) : crée le doc `shops` avec `adminSource: 'subscription'` + `subscriptionPlan`/`subscriptionExpiresAt` calculés, puis met à jour `users/{uid}` — `shopId` toujours, et `role: 'admin'`/`adminSource: 'subscription'` **seulement si le compte n'était pas déjà admin** (un admin qui crée une 2ᵉ boutique garde son `adminSource` d'origine sur son compte).
- `src/data/mockData.ts` : `subscriptionPlan`/`subscriptionExpiresAt` déplacés des `mockUsers` admin vers leurs `mockShops` respectifs ; `adminSource` conservé sur `mockUsers` (inchangé) et ajouté aux `mockShops` correspondants.
- BF-70/BF-93 : la redirection "abonnement expiré → vue cliente" se décide **par boutique** (`shop.subscriptionExpiresAt` dépassé), pas par le compte entier — un commerçant avec deux boutiques dont une seule a expiré garde l'accès admin à l'autre. *(Job d'expiration lui-même pas encore construit — reste à faire, voir `05-plan-de-travail.md`.)*
- Le job d'expiration (§11.5, Vercel Cron), une fois construit, devra parcourir `shops` (où `adminSource == 'subscription'`), pas `users`.
- **Prix des abonnements** (`src/lib/subscriptionPlans.ts`) : Quotidien 500, Hebdomadaire 2 500, Mensuel 8 000, Trimestriel 20 000, Annuel 60 000 FCFA — repris tels quels de la maquette générée par l'outil de design. **Ce sont des placeholders, pas une décision business validée** ; à confirmer avec l'utilisateur avant tout lancement réel.

### 12.2 Publication d'un produit (`Product.isPublished`)

BF-90 : un produit créé n'est visible côté client qu'une fois publié ; le retirer de la vente ne fait que dépublier, sans supprimer. Champ absent du modèle `Product` actuel (§5) :

```typescript
interface Product {
  // ...champs existants...
  isPublished?: boolean   // absent/false = brouillon, jamais visible côté client
}
```

Toute lecture publique de `products` (catalogue, page Marché §12.7) doit filtrer `isPublished == true`, comme `shops.isPublished` le fait déjà pour la boutique elle-même.

### 12.3 Statuts de commande révisés (`OrderStatus`)

BF-95 remplace le jeu de statuts posé au Module 4 (`pending | confirmed | delivering | delivered | cancelled`, `src/models/order/OrderStatus.ts`) par un vocabulaire aligné sur le métier réel du commerçant, avec deux issues distinctes possibles après livraison :

```typescript
type OrderStatus =
  | 'under_review'       // En cours d'analyse
  | 'ready_for_delivery'  // Prêt pour la livraison
  | 'delivering'          // Livraison en cours
  | 'delivered'           // Livré
  | 'returned'            // Retourné (remboursé)
  | 'defective'           // Défectueux (remboursé, motif défaut)

interface Order {
  // ...champs existants (shopId, clientName, items, total...)...
  status: OrderStatus
  returnReason?: string    // requis avant de passer à 'returned' ou 'defective' (BF-96/97)
  restockedAt?: Timestamp  // posé quand le stock du produit est réincrémenté (BF-96)
}
```

`cancelled` (annulation avant expédition, BF-23) reste un cas à part — à garder comme septième valeur ou comme statut distinct selon comment BF-23 sera implémenté ; pas encore tranché.

### 12.4 Corbeille générique (soft delete)

BF-99/100 : plutôt qu'une collection miroir par entité (`trashedProducts`, `trashedCategories`...), convention proposée — un champ optionnel commun :

```typescript
// Ajouté à Product, Category (et toute future entité qui adopte la corbeille)
deletedAt?: Timestamp
```

- Une "suppression" devient `update({ deletedAt: serverTimestamp() })` plutôt qu'un vrai `delete()`.
- Toute requête de listing applicative (pas les règles Firestore, qui ne filtrent pas facilement sur l'absence d'un champ) exclut les documents avec `deletedAt` renseigné.
- Restaurer = `update({ deletedAt: null })` (ou `deleteField()`).
- Suppression définitive (après le compte à rebours de BF-100, géré côté client comme le `NavigationBlockerProvider`/toasts `sonner` déjà utilisés ailleurs) = le vrai `delete()` Firestore.
- Implémentation suggérée : un `TrashService` générique paramétré par repository (`TrashService<T>`), plutôt qu'un service dédié par entité — évite de dupliquer la logique de restauration/purge à chaque nouvelle entité qui l'adopte.

### 12.5 Nouveaux modèles

```typescript
// src/models/review/Review.ts — BF-72/76/101
interface Review {
  id: string
  productId: string
  orderId: string          // garantit un avis par commande livrée, pas un avis libre
  shopId: string
  authorId: string
  rating?: number
  comment: string
  reason?: 'defective' | 'other'   // motif transmis au vendeur (BF-76)
  createdAt: Timestamp
}

// src/models/platform/CategoryTag.ts — BF-109, liste fermée gérée par le Super Admin
interface CategoryTag {
  id: string
  name: string
  color: string             // ex. valeur hex, pour l'affichage
  createdAt: Timestamp
}
// Category (existant) gagne : tagId?: string — référence CategoryTag.id

// src/models/message/Message.ts — BF-112→116
interface Message {
  id: string
  fromShopId: string        // la boutique du commerçant qui écrit
  fromUserId: string
  subject: string
  body: string
  template: string           // identifiant du modèle de mise en forme choisi
  signature: string           // initiales auto-générées (commerçant) ou "ManuShop" (Super Admin)
  parentId?: string           // présent sur la réponse du Super Admin, pointe vers le message d'origine
  createdAt: Timestamp
}

// src/models/analytics/ShopVisitEvent.ts — BF-107, premium
interface ShopVisitEvent {
  id: string
  shopId: string
  productId?: string        // absent = visite de la boutique elle-même
  occurredAt: Timestamp
  hour: number                // dénormalisé pour agréger sans recalculer depuis occurredAt
  locationLabel?: string       // meilleur effort (pays/ville), pas de géolocalisation précise prévue
}
```

### 12.6 Paiement (interface seulement pour l'instant)

BF-78 : écran de sélection Visa / Orange Money / MTN Mobile Money. **Aucune intégration réelle** — décision explicite de l'utilisateur de choisir un prestataire (gratuit ou peu coûteux) en fin de développement. À construire maintenant : uniquement le composant de sélection et l'état "méthode choisie" dans le flux de commande/abonnement, avec un point d'extension clair (ex. `PaymentProvider` interface, une seule implémentation factice `"none"` en attendant) plutôt que de coder en dur un flux Visa/Orange/MTN qui n'existe pas encore.

### 12.7 Page Marché & tags système

BF-108→111. Généralise `/demo-catalogue` (construit le 2026-09-24 avec `src/data/mockData.ts`) à de vraies données :
- Haut de page : les 4 meilleures boutiques — nécessite un classement réel (aujourd'hui approximé pour la vitrine landing page via `getFeaturedArticles()`, voir journal du 2026-09-24 ; même absence de métrique de vente réelle ici, même approche de proxy documenté à prévoir en attendant).
- Bas de page : tous les produits publiés (`isPublished == true`, §12.2) de toutes les boutiques publiées (`shops.isPublished == true`), triables/filtrables par `CategoryTag` (§12.5) plutôt que par le nom de catégorie propre à chaque boutique.

### 12.8 Journal d'activité commerçant (BF-98)

```typescript
// src/models/activity/ActivityLogEntry.ts
interface ActivityLogEntry {
  id: string
  shopId: string
  actorId: string
  action: string             // ex. "product.created", "order.status_changed"
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
  createdAt: Timestamp
}
```
Alimenté en écriture à chaque opération commerçant pertinente (produit, catégorie, commande, retour...) ; le rapport imprimable (BF-98) est une mise en forme de cette collection filtrée par boutique et par période, dans le même esprit que les factures groupées par période (BF-104).

### 12.9 Paramètres du compte personnel (BF-120, fait le 2026-09-25)

Distinct des paramètres de boutique (`ShopSettingsForm`, BF-04) : `/mon-compte` (`AccountSettingsForm`, `src/components/account/`), accessible à tout utilisateur connecté quel que soit son rôle. `User` gagne `notifyByEmail?: boolean` (absent traité comme `true`, même convention que `Product.isPublished`) — préférence enregistrée dès maintenant mais pas encore consommée par un envoi réel (voir §13). Upload de photo de profil : même pipeline recadrage carré que le logo boutique (`cropImageToSquare`, dossier Cloudinary `manushop/users` ajouté à la liste blanche de `/api/uploads`). L'email n'est **pas éditable** depuis cette page (resterait désynchronisé de l'email Firebase Auth réel sans un flux `updateEmail` + réauthentification, hors scope de cette tranche) — affiché en lecture seule, avec un bouton "Changer le mot de passe" (réutilise `AuthService.sendPasswordReset`) visible seulement pour les comptes email/mot de passe (`firebaseUser.providerData` contient `"password"`).

## 13. Notification de nouvelle version par email (BF-121, non commencé)

Demande de l'utilisateur (2026-09-25) : à chaque nouvelle version de la plateforme, notifier tous les utilisateurs par email. **Décisions actées avec l'utilisateur, implémentation reportée** :
- **Source de version** : le champ `version` de `package.json` (actuellement `0.1.0`) fait foi — pas de champ dédié en base à maintenir manuellement.
- **Audience** : tous les comptes `users` ayant un `email` renseigné — pas de filtre par rôle. Depuis le retrait de l'authentification téléphone/anonyme (2026-09-25, voir §14), quasiment tout compte a un email ; seul un cas limite Facebook (permission email refusée) peut encore en manquer.
- **Fournisseur d'email : aucun choisi.** Le projet n'a actuellement aucune capacité d'envoi d'email (pas de Resend/SendGrid/SMTP/etc.) — un compte et une clé API côté utilisateur sont nécessaires avant de construire l'envoi réel.
- **Mécanisme de déclenchement non tranché** : "à chaque mise à jour" suggère un déclenchement au déploiement, mais Vercel n'a pas de hook post-déploiement simple compatible avec une écriture Firestore privilégiée. Piste retenue par défaut (à confirmer) : même schéma que le job d'expiration d'abonnement non construit (§11.5, BF-69) — une route `/api/cron/*` protégée par un secret dédié, déclenchée par Vercel Cron à intervalle régulier, qui compare `package.json` à une version mémorisée dans Firestore (`platformConfig/releaseNotifications.lastNotifiedVersion`) plutôt qu'un vrai hook de déploiement.
- **Fait dès maintenant, en attendant** : `User.notifyByEmail` (§12.9, BF-120) — la préférence est déjà collectée côté compte, pour ne pas avoir à redemander aux utilisateurs une fois l'envoi réel construit.

## 14. Retrait de l'authentification téléphone et anonyme (2026-09-25)

Demande explicite de l'utilisateur : supprimer les méthodes de connexion par téléphone (SMS OTP, ajoutée le 2026-09-21) et anonyme. Retiré :
- `AuthService.startPhoneSignIn`/`confirmPhoneCode`/`loginAnonymously`, et les imports Firebase Auth correspondants (`signInWithPhoneNumber`, `signInAnonymously`, `ConfirmationResult`, `RecaptchaVerifier`).
- `PhoneLoginSchema`/`PhoneCodeSchema` (`src/lib/validation/auth.ts`).
- L'onglet "Téléphone" et le bouton "Anonyme" de `/login` (`LoginForm.tsx`) — ne reste que email/mot de passe, Google, Facebook.

**Pas touché, volontairement** : `PhoneInput`/`User.phone`/`Shop.phone`/`Shop.whatsapp` restent — ce sont des numéros de **contact** (profil, boutique), sans rapport avec l'authentification. `User.email` reste optionnel (cas limite Facebook, permission email refusée) plutôt que redevenir obligatoire, pour ne pas casser les comptes déjà créés par téléphone/anonyme avant ce retrait — ces comptes existants perdent simplement tout moyen de se reconnecter, aucune migration de données n'a été faite.

## 15. Notification de nouvelle commande par WhatsApp (2026-09-25)

Demande de l'utilisateur : notifier les commandes vers WhatsApp Business, Facebook, Instagram ou TikTok. **Périmètre réduit avec l'utilisateur avant de coder** : seul WhatsApp Business Cloud API permet un envoi transactionnel fiable côté commerçant — les API Messenger (Facebook) et Messaging (Instagram) exigent une fenêtre de conversation ouverte par le destinataire (24h) ou un tag approuvé, inadaptées à une alerte "nouvelle commande" initiée par le serveur ; TikTok n'appartient pas à Meta et n'expose aucune API de messagerie transactionnelle comparable. Implémenté : WhatsApp uniquement. Facebook/Instagram/TikTok restent hors-scope pour la **notification** de commande — à ne pas confondre avec le Module 8 (Publication Multicanal, BF-41→47, §4.5), qui vise la **publication** de contenu sur ces réseaux et reste non commencé.

**Fait** :
- `src/lib/whatsappBusiness.ts` — `sendOrderNotification()`, appelle l'API Cloud de Meta (`POST /{WHATSAPP_PHONE_NUMBER_ID}/messages`) avec un message **template** (obligatoire pour un message business-initiated hors fenêtre de 24h — un texte libre serait rejeté par Meta). Nom du template configurable (`WHATSAPP_ORDER_TEMPLATE_NAME`, sinon `new_order_notification`), variables `{{1}}` client, `{{2}}` n° commande, `{{3}}` montant. N'échoue jamais bruyamment : identifiants absents, numéro invalide ou appel réseau en échec → log et retour silencieux, la création de la commande n'est jamais bloquée par une notification qui rate.
- Branché dans `createOrderAction` (`src/server/actions/orderActions.ts`), juste après la création atomique de la commande : lit `shops/{shopId}`, envoie vers `Shop.whatsapp` (numéro déjà affiché aux clients pour "Commander via WhatsApp", réutilisé plutôt que d'ajouter un champ dédié — décision utilisateur) si `Shop.notifyOrdersBySocial !== false`. Cette préférence existait déjà sur `ShopSettingsForm` (ajoutée avant que le Module 4 n'existe, jusqu'ici sans effet réel) — elle pilote maintenant un envoi effectif.

**Point ouvert, à faire manuellement par l'utilisateur avant que ça fonctionne réellement** : créer et faire approuver le template WhatsApp (ex. `new_order_notification`) dans Meta Business Manager, avec un compte WhatsApp Business connecté à l'app Meta (`META_APP_ID`/`META_APP_SECRET`), puis renseigner `WHATSAPP_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_ORDER_TEMPLATE_NAME` dans `.env.local`. Aucun de ces identifiants n'est configuré à ce jour (tous vides) — le code est prêt mais n'enverra rien tant que ce n'est pas fait.

Tests : `whatsappBusiness.test.ts` (nouveau — identifiants absents, appel réussi, nom de template personnalisé, échec API, échec réseau, numéro invalide), `orderActions.test.ts` étendu (notification envoyée à la création, ignorée si `notifyOrdersBySocial: false`).

Vérifié : `npx tsc --noEmit`, `npm run lint` et la suite de tests concernée, aucune régression introduite par ce changement. Suite complète (`npm run test:coverage`) : 6 échecs pré-existants dans `PaymentMethodPageContent.test.tsx`/`phone-input.test.tsx` (erreur d'import `@firebase/auth` côté Node, sans rapport avec ce changement — confirmé en isolant les nouveaux fichiers). Rien de commité.

## 16. Module 4 — Commandes, implémentation réelle (2026-09-25)

Schéma réel de `Order` (`src/models/order/Order.ts`, remplace l'ébauche du §5) :

```typescript
type OrderStatus =
  | "under_review"        // En cours d'analyse (statut initial)
  | "ready_for_delivery"   // Prêt pour la livraison
  | "delivering"           // Livraison en cours
  | "delivered"            // Livré
  | "returned"             // Retourné (BF-96)
  | "defective"            // Défectueux (BF-97)
  | "cancelled";           // Annulée (BF-23 — ajoutée hors du périmètre initial de BF-95)

interface Order {
  id: string
  shopId: string
  clientId?: string        // absent = commande manuelle (BF-21, client sans compte)
  clientName: string
  clientPhone: string
  clientAddress: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  status: OrderStatus
  cancelReason?: string    // requis avant 'cancelled'
  returnReason?: string    // requis avant 'returned'/'defective'
  restockedAt?: Timestamp  // posé quand le stock a été réincrémenté
  invoiceUrl?: string
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Écriture verrouillée côté client, tout passe par des Server Actions** (`src/server/actions/orderActions.ts`, `firebase-admin`) — décision structurante de cette tranche : la création d'une commande doit décrémenter le stock des articles de façon atomique (`db.batch()`), et un changement de statut doit revalider en code qui a le droit de faire quoi (client propriétaire vs commerçant de la boutique), pas seulement via `firestore.rules`. `IOrderRepository`/`OrderRepository` (`src/repositories/`) sont donc **lecture seule** (`getById`/`listByShop`/`listByClient`), sans `create`/`update` — à la différence de `IProductRepository`/`ICategoryRepository`. `firestore.rules` : `allow read` scopé (`clientId == uid` OU `role in ['admin','seller']` + `shopId` correspondant), `allow write: if false`.

- `createOrderAction(idToken, input)` : crée la commande (`status: "under_review"`) et décrémente `Product.stock` de chaque article dans le même batch. `input.manual: true` (BF-21) bascule sur une vérification "l'appelant est admin/seller de cette boutique" au lieu de lier `clientId` au compte de l'appelant. **Limite connue, documentée** : pas de vérification de survente (le stock peut devenir négatif) — mécanique minimale en attendant le Module 3 (Stock), pas un oubli.
- `updateOrderStatusAction(idToken, orderId, {status, reason})` : progression normale (`ready_for_delivery`/`delivering`/`delivered`) réservée au commerçant de la boutique ; `cancelled` accessible au client propriétaire OU au commerçant, uniquement depuis `under_review`, motif obligatoire ; `returned`/`defective` réservés au commerçant, uniquement depuis `delivered`, motif obligatoire — réincrémente `Product.stock` dans les trois cas (`cancelled`/`returned`/`defective`).

**Service côté client** (`OrderService`, même patron que `PlatformAdminService` — résout son propre `idToken` via `auth.currentUser`) : lectures directes via le repository, mutations via les Server Actions.

**Notification interne (cloche)** : `useNewOrdersCount(shopId)` (`src/hooks/`) — seul usage de `onSnapshot` du projet, choisi délibérément ici parce que l'utilisateur a demandé une notification "directe" pour le commerçant ; partout ailleurs dans le projet, un simple `.then()` au montage suffit. Alimente un badge sur la cloche de `DashboardTopbar`, avec lien direct vers `/dashboard/orders?status=under_review`.

**UI** :
- `/dashboard/orders` (`OrdersPageContent`) : table filtrable par statut, actions de progression, `OrderReasonDialog` (motif obligatoire, partagé avec le suivi client) pour annulation/retour/défectueux, `ManualOrderDialog` (BF-21).
- `/checkout/payment` (`PaymentMethodPageContent`) : "Confirmer ma commande" (ex-"Payer") collecte nom/téléphone/adresse et crée la commande — reste sans intégration de paiement réelle (BF-78 inchangé), le paiement se fait à la livraison en attendant.
- `/mes-commandes` (`MyOrdersPageContent`, BF-75) : suivi client, annulation tant que `under_review`.
- `ActivityLogService` étendu (`order.created`/`order.status_changed`/`order.cancelled`/`order.returned`) — jamais pour la création d'une commande par un client (les règles `activityLog` l'interdisent, réservé aux actions commerçant).

**Reporté, documenté comme tel plutôt que codé à moitié** : BF-76 (soumission d'avis client après livraison), BF-77 (demande de retour côté client, distincte de BF-96 qui est l'action commerçant), BF-101 (le commerçant consulte les avis reçus) — tous bloqués sur la construction de la soumission d'avis, hors scope de cette tranche.

## 17. Émulateurs Firebase locaux, pour les tests QA sans identifiants réels (2026-09-25)

Demande de l'utilisateur : pouvoir dérouler ses scénarios de test (commandes, création de boutique) alors que `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` (compte de service, requis par `getAdminDb()`) n'est pas configuré en local — bloquant *toutes* les Server Actions privilégiées (`createShopAction`, `createOrderAction`, `updateOrderStatusAction`, `grantAdminAction`/`revokeAdminAction`/`searchUsersAction`), pas seulement les commandes.

**Solution retenue : la suite d'émulateurs Firebase** (Firestore + Auth), plutôt qu'un contournement applicatif — c'est le seul moyen de tester le comportement *réel* du code (règles Firestore comprises) sans toucher au projet Firebase de production ni nécessiter le moindre identifiant réel. `firebase-tools` était déjà utilisable via `npx` depuis la Phase 0.

**Fait :**
- `firebase.json` : bloc `emulators` (Auth :9099, Firestore :8080, UI :4000, `singleProjectMode`).
- `npm run emulators` (`npx firebase-tools emulators:start --only auth,firestore --project manushop-eb15a`).
- `src/lib/firebaseAdmin.ts` (`getAdminApp`) : si `FIRESTORE_EMULATOR_HOST` est présent, initialise sans compte de service (`initializeApp({ projectId })` seul) — le SDK Admin route alors automatiquement vers l'émulateur. Nouvel export `getAdminAuth()` (même app, `firebase-admin/auth`).
- `src/lib/verifyIdToken.ts` : si `FIREBASE_AUTH_EMULATOR_HOST` est présent, délègue à `getAdminAuth().verifyIdToken()` (qui sait vérifier un token émulateur) au lieu de la vérification JWKS habituelle contre les clés de production Google — un token émulateur ne sera *jamais* accepté par cette dernière, peu importe `FIRESTORE_EMULATOR_HOST`. Les deux variables sont donc nécessaires ensemble pour qu'une Server Action fonctionne de bout en bout (identité **et** données). Chemin de production totalement inchangé quand ces variables sont absentes.
- `src/lib/firebase.ts` (SDK client) : si `NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"`, connecte `auth`/`db`/`getSecondaryAuth()` aux émulateurs via `connectAuthEmulator`/`connectFirestoreEmulator` — protégé par un drapeau module-level contre le double-appel (hot reload Next.js, qui fait sinon lever `connectXEmulator`).
- `.env.example`/`.env.local` : `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` — activés dans `.env.local` de l'utilisateur (`true`/`127.0.0.1:8080`/`127.0.0.1:9099`), à repasser à vide pour retravailler contre le vrai projet.
- `.gitignore` : `.firebase/`, `*-debug.log`.

**Vérifié en conditions réelles** (pas seulement en test unitaire) : émulateurs démarrés (`npm run emulators`, confirmé opérationnels sur les 3 ports), script Node ad hoc utilisant `firebase-admin` exactement comme `getAdminDb()`/`getAdminAuth()` — écriture/lecture Firestore round-trip réussie, `verifyIdToken` atteint bien l'émulateur Auth (rejette proprement un faux token avec `auth/argument-error`, pas une erreur réseau/JWKS). Tests : `verifyIdToken.test.ts` (+2 cas, 100% de couverture).

**Limite connue, hors scope de cette demande** : `/api/uploads` (upload Cloudinary) réutilise `verifyIdToken`, donc fonctionne déjà avec un token émulateur — mais Google/Facebook (OAuth réel) ne sont pas praticables via l'émulateur Auth sans sa page de connexion factice dédiée ; email/mot de passe suffit pour les scénarios commandes/création de boutique visés ici. La notification WhatsApp Business (§15) reste elle aussi non fonctionnelle sans ses propres identifiants Meta — comportement inchangé, déjà silencieux/non bloquant.

**Pour l'utilisateur, à chaque session de test** : `npm run emulators` dans un terminal séparé, puis (re)démarrer `next dev` pour que les 3 variables soient prises en compte. Base vide à chaque redémarrage de l'émulateur (pas de persistance par défaut) — créer un compte normalement depuis l'app suffit, `role: 'client'` à l'inscription comme en production ; passer admin nécessite soit l'assistant "Créer ma boutique", soit un document `platformAdmins` ajouté à la main via l'UI de l'émulateur (`http://127.0.0.1:4000/firestore`).

## 18. URL publique par boutique (BF-64, version ciblée) et partage (BF-91), 2026-09-25

Demande : permettre à un commerçant de partager le lien de sa boutique publiée sans devoir ouvrir sa vitrine et copier l'URL manuellement. **Constat avant de coder** : aucune URL publique par boutique n'existait — `/catalogue` reste mono-tenant (`ShopService.getPrimaryShop()` → `ShopRepository.getFirst()`, un `limit(1)` sans rapport avec le visiteur), et `Shop.publicToken` (posé le 2026-09-21 pour BF-64) n'était lu/écrit nulle part. BF-64 (routage `/{tokenOpaque}/{nomDePage}/{nomDuComposant}`, §11.3) reste donc "non commencé" tel quel — ce qui suit est une version délibérément réduite, confirmée avec l'utilisateur.

**Décisions actées avec l'utilisateur** :
- Identifiant dans l'URL : l'id Firestore de la boutique tel quel (`/boutique/{shopId}`), pas un encodage `ownerId`+`shopId` — les id Firestore auto-générés sont déjà des chaînes non séquentielles, donc déjà "opaques" en pratique ; un encodage réversible supplémentaire (§11.3) resterait décodable de toute façon, sans bénéfice de sécurité réel.
- Portée : nouvelle route additionnelle, `/catalogue` (mono-tenant) volontairement inchangé — pas de migration du routage storefront cette fois (§11.3/§11.6 restent le plan pour une migration complète future, si besoin).

**Fait :**
- `src/app/(storefront)/boutique/[shopId]/page.tsx` : résout la boutique via `ShopService.getShop(shopId)` (déjà existant), affiche `CataloguePageContent` (déjà shop-agnostique, prenait déjà un `shopId` en prop) si publiée, un état honnête "Boutique introuvable ou non publiée" sinon — jamais de redirection silencieuse vers `/demo-catalogue` ici (contrairement à `/catalogue`) : un lien partagé cassé doit le dire, pas rediriger vers une autre boutique sans rapport.
- `ShareShopLinkButton` (`src/components/dashboard/`) : menu (copier le lien, WhatsApp, email, partage natif `navigator.share` si disponible — détecté dans un effet, jamais au premier rendu, même précaution d'hydratation que `ScrollReveal`/`usePwaInstall`). Construit l'URL via `NEXT_PUBLIC_APP_URL` (déclarée depuis la Phase 0, jamais consommée jusqu'ici). Affiché uniquement quand la boutique est réellement publiée (`ShopSettingsForm`, section Visibilité ; `ShopManagementPageContent`, par carte de boutique).

**Trouvé en écrivant les tests, à retenir pour la suite** : appeler `userEvent.setup()` dans un test de ce composant — même sans jamais utiliser l'instance retournée — empêche silencieusement les clics `fireEvent` suivants d'atteindre les gestionnaires `onClick` (aucune erreur, juste aucun effet). Reproduit isolément (six scripts de débogage), cause exacte non identifiée (probablement lié au menu positionné en `absolute` par-dessus l'overlay `fixed inset-0` qui le referme au clic extérieur, combiné à l'absence de moteur de layout réel dans jsdom). Contournement : test entièrement en `fireEvent` (pas de `userEvent` du tout), commenté dans `ShareShopLinkButton.test.tsx` pour la prochaine session qui touchera un menu déroulant similaire (`AccountMenu`, `DashboardTopbar` utilisent le même pattern, jamais testés jusqu'ici).

Tests : `ShareShopLinkButton.test.tsx` (6 cas), `boutique/[shopId]/page.test.tsx` (4 cas — chargement, introuvable, non publiée, rendu réel).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (31 routes, +1 — `/boutique/[shopId]`) et `npm run test:coverage` (334 tests, +10, aucune régression). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session). Rien de commité.

## 19. Catalogue de démo conditionnel (BF-122), 2026-09-26

Demande utilisateur : `/demo-catalogue` ne doit plus s'afficher une fois qu'au moins une vraie boutique publiée de la plateforme a un produit visible réel, et une collection `configuration` doit permettre de l'activer/désactiver. **Décisions actées avant de coder** : détection plateforme-wide (n'importe quelle boutique publiée, pas seulement celle que `/catalogue` résout aujourd'hui) ; l'interrupteur manuel (`configuration/general.demoCatalogueEnabled`) n'a d'effet que s'il est explicitement à `false` (coupe la démo dans tous les cas) — absent/`true` laisse la détection automatique décider, cohérent avec le schéma déjà établi pour `platformAdmins` (collection verrouillée en écriture, réglée à la main depuis la console Firebase).

**Fait :**
- `PlatformConfiguration`/`ConfigurationRepository`/`ConfigurationService` (`src/models/configuration/`, `src/repositories/`, `src/services/`) — lecture seule, même schéma que `platformAdmins`. `firestore.rules` : `configuration/{docId}` lecture publique (consultée par des visiteurs non connectés), écriture interdite pour tout le monde.
- `useDemoCatalogueAvailable()` (`src/hooks/`) : combine l'interrupteur manuel et la détection automatique (liste les boutiques publiées via `ShopService.listPublishedShops()`, déjà existant, puis vérifie si l'une a au moins un produit `isVisibleToCustomers`). Renvoie `undefined` tant que la réponse n'est pas connue — jamais de redirection ni d'affichage sur la base d'une valeur par défaut.
- Trois points de consommation : `/catalogue` (repli vers la démo conditionné, sinon état honnête "Aucune boutique disponible" plutôt qu'une page cassée), `CataloguePageContent` (même logique pour le cas "boutique publiée mais vide" — si une AUTRE boutique de la plateforme a de vrais produits, affiche "Cette boutique n'a pas encore de produit" plutôt que de rediriger vers une démo qui n'a plus de sens), `/demo-catalogue` elle-même (auto-repli vers `/catalogue` si elle n'est plus disponible — couvre aussi l'accès direct par URL, pas seulement le repli depuis `/catalogue`).

Tests : `ConfigurationService.test.ts`, `useDemoCatalogueAvailable.test.ts`, `demo-catalogue/page.test.tsx` (nouveau, aucun test n'existait avant), `catalogue/page.test.tsx`/`CataloguePageContent.test.tsx` étendus.

## 20. Session unique par compte (BF-123), 2026-09-26

Demande utilisateur : empêcher qu'un même compte soit connecté sur plusieurs navigateurs/appareils à la fois. **Clarifié avant de coder** : "plateformes" = navigateurs/appareils (pas onglets du même navigateur, qui doivent rester tous valides ensemble).

**Fait :**
- `User.activeSessionId?: string` — id aléatoire (`crypto.randomUUID()`). `src/lib/sessionId.ts` : stocké en `localStorage` (partagé entre onglets du même navigateur exprès, contrairement à `sessionStorage`) — jamais d'exception si le stockage est indisponible (navigation privée stricte), dégradation silencieuse plutôt que de bloquer la connexion.
- `AuthProvider` : à chaque connexion (`onAuthStateChanged`), si ce navigateur n'a **encore aucun** id local stocké, en génère un frais et l'écrit sur `users/{uid}.activeSessionId` (`AuthService.updateProfile`, déjà autorisé par `firestore.rules` — `activeSessionId` n'est ni `role` ni `shopId`, aucun changement de règles nécessaire). Si un id local existe déjà (rechargement de page, autre onglet du même navigateur), rien n'est réécrit — la reconnexion silencieuse habituelle de Firebase Auth au chargement ne doit pas se comporter comme une "nouvelle connexion" et invalider les autres sessions.
- Écoute en direct (`onSnapshot` sur son propre `users/{uid}`, second usage du projet après `useNewOrdersCount`) : dès que `activeSessionId` change pour une valeur différente de celle stockée localement (connexion depuis un autre navigateur), déconnexion forcée (`AuthService.logout()`) + message d'erreur (`sonner`).
- `AuthService.logout()` efface systématiquement l'id local en premier (avant même `signOut`) — couvre à la fois la déconnexion volontaire et la déconnexion forcée par conflit de session, pour qu'une reconnexion ultérieure sur ce même navigateur reparte sur un id frais sans avoir besoin de toucher Firestore à la déconnexion.

**Limite assumée** : aucune migration pour les comptes déjà connectés avant ce changement — leur session actuelle devient "la" session active dès le prochain chargement de page (pas de déconnexion surprise), exactement comme pour les précédents changements de modèle du projet (BF-93, retrait auth téléphone/anonyme...).

Tests : `sessionId.test.ts` (100% de couverture), `AuthProvider.test.tsx` (nouveau — aucun test n'existait avant pour ce composant central), `AuthService.test.ts` étendu (`logout` efface l'id local).

Vérifié (les deux sections ci-dessus) : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 31 routes) et `npm run test:coverage` (361 tests, +27, aucune régression). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session). Rien de commité.

## 21. Identité visible dans l'en-tête vitrine (BF-124), 2026-09-26

Demande utilisateur : la photo de profil et le nom de l'utilisateur connecté ne s'affichaient nulle part dans `StorefrontHeader` (bouton "Mon compte" = icône générique seule, nom/email visibles uniquement une fois le menu déroulant ouvert) ; sur la page boutique dédiée (BF-64), l'en-tête affichait toujours la marque générique "Manu Shop" plutôt que le logo/nom de la boutique consultée. Repli par défaut (icône/initiale) exigé si photo/logo absent.

**Problème d'architecture** : `StorefrontHeader` est rendu par `src/app/(storefront)/layout.tsx`, un ancêtre de `/boutique/[shopId]/page.tsx` — pas un parent direct, donc aucune prop ne peut circuler de la page vers l'en-tête.

**Fait :**
- `ShopBrandingProvider` (`src/components/providers/`) : contexte React `{branding: {shopId, name, logo?} | null, setBranding}`, posé dans `(storefront)/layout.tsx` autour de `StorefrontHeader` + `children`. `/boutique/[shopId]/page.tsx` appelle `setBranding(...)` une fois la boutique chargée, et le nettoie (`setBranding(null)`) au démontage — pour ne pas laisser la marque d'une boutique "coller" en naviguant vers une autre page vitrine.
- `StorefrontHeader` : bloc de marque à gauche conditionné par `useShopBranding()` — logo de la boutique (`next/image`, repli sur l'icône `Store` générique si `logo` absent/vide) + nom, lien vers `/boutique/{shopId}` ; sans branding actif, comportement inchangé ("Manu Shop" → `/`).
- `AccountMenu` : le bouton déclencheur (pas seulement le menu ouvert) affiche désormais l'avatar (`profile.photoURL`/`firebaseUser.photoURL`, repli sur un cercle avec l'initiale du nom — même pattern que `DashboardTopbar`, adapté à la palette claire de la vitrine) + le nom (masqué en dessous de `sm:` faute de place, avatar/chevron toujours visibles).

Tests : `ShopBrandingProvider.test.tsx` (nouveau), `StorefrontHeader.test.tsx` (nouveau — aucun test n'existait avant pour ce composant), `boutique/[shopId]/page.test.tsx` étendu (rendu désormais sous `ShopBrandingProvider`, requis depuis que la page consomme `useShopBranding()`).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 31 routes) et `npm run test:coverage` (369 tests, +8, aucune régression, seuil global 86%). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session). Rien de commité.

## 22. Catalogue et landing page multi-boutique réels (BF-108, version réduite), 2026-09-26

Demande utilisateur : afficher les vraies informations des boutiques publiées et de leurs produits dans `/catalogue` et sur la landing page, à la place des mocks (`src/data/mockData.ts`), maintenant que plusieurs vraies boutiques avec plusieurs vrais produits existent. **Base proposée et actée avec l'utilisateur avant de coder** : agrégation multi-boutique côté client (une lecture Firestore par boutique, comme `useDemoCatalogueAvailable` le fait déjà), sans index/moteur de recherche dédié — accepté comme correct à l'échelle actuelle, à revoir si la plateforme grossit beaucoup.

**Rattaché à BF-108 (Page Marché), mais volontairement réduit** : le §12.7 (BF-108→111) prévoyait aussi les 4 meilleures boutiques en tête de page et un tri par `CategoryTag` (Super Admin, jamais construit — plan de travail §3). Ni l'un ni l'autre n'est fait ici : `Product.category` est déjà une simple chaîne (pas une référence), donc le filtrage par catégorie fonctionne déjà en union entre boutiques sans attendre le système de tags ; le classement des boutiques elles-mêmes (pas seulement des produits) reste non commencé.

**Fait :**
- `ProductService.compareByRelevance(a, b)` : proxy de classement "meilleur article" (promo actif, puis récence, puis prix) — même heuristique que `compareArticleRank` dans `mockData.ts` (données de démo, laissé tel quel, toujours utilisé par la landing tant que `useDemoCatalogueAvailable()` est vrai), déplacée dans le service pour être appliquée à de vraies données. Légère duplication acceptée plutôt qu'un couplage entre le module de mock et le service réel.
- `useMarketCatalogue()` (`src/hooks/`) : liste les boutiques publiées puis leurs produits visibles, aplatit en `MarketProduct[]` (`{product, shop}`). Replié sur `[]` (jamais bloqué) si une lecture échoue.
- `MarketCataloguePageContent` (`src/components/storefront/`) : nouveau composant pour `/catalogue`, distinct de `CataloguePageContent` qui reste scopé à une seule boutique (`/boutique/[shopId]`) — recherche/filtre par catégorie/tri/promo comme l'ancien catalogue mono-tenant, mais sur l'union des boutiques. `/catalogue/page.tsx` simplifié : n'utilise plus `useShop()` (boutique "primaire" mono-tenant, gardé ailleurs pour le panier/paiement, voir limite ci-dessous) — bascule vers `/demo-catalogue` uniquement sur la base de `useDemoCatalogueAvailable()`.
- `StorefrontProductCard` : nouvelle prop optionnelle `shop?: Shop` — affiche un lien d'attribution vers `/boutique/{shopId}` (frère du lien produit, pas imbriqué dedans, même contrainte HTML que le bouton favoris) quand fourni ; absent par défaut, donc aucun changement visuel sur `/boutique/[shopId]`/`/demo-catalogue`, qui n'ont pas besoin de le répéter.
- `FeaturedShowcase` (`src/components/sections/`) : remplace le calcul statique `getFeaturedArticles(3)` dans `src/app/page.tsx` (page restée un Server Component, ce nouveau composant est `"use client"`). Bascule sur le même signal `useDemoCatalogueAvailable()` : mocks tant qu'aucune vraie boutique publiée n'a de produit visible réel, sinon meilleur article réel par boutique (`compareByRelevance`, dégradé décoratif choisi par hash de l'id plutôt que la table codée en dur des 6 boutiques de démo). Le `statLabel` "+120% de commandes ce mois" est un chiffre marketing fabriqué pour la démo — retiré en mode réel (même principe que `ProductService.getBadge`, pas de badge inventé). Rend `null` si rien à montrer (chargement, ou marché réellement vide après désactivation manuelle de la démo par le Super Admin).

**Limite assumée, hors scope** : le panier et le paiement (`CartPanel`, `PaymentMethodPageContent`, via `useShop()`) restent mono-tenant — ils supposent tous les articles du panier rattachés à "la" boutique primaire, même si `/catalogue` peut maintenant mélanger des produits de plusieurs boutiques réelles dans le même panier. Non traité ici (demande explicitement limitée à l'affichage) ; un panier/checkout réellement multi-boutique (un sous-total par boutique, ou interdiction de mélanger) reste à faire.

Tests : `ProductService.test.ts` étendu (`compareByRelevance`), `useMarketCatalogue.test.ts` (nouveau), `MarketCataloguePageContent.test.tsx` (nouveau), `StorefrontProductCard.test.tsx` étendu (attribution boutique), `FeaturedShowcase.test.tsx` (nouveau), `catalogue/page.test.tsx` réécrit (plus de `useShop`), `page.test.tsx` (landing) adapté (mock des hooks plutôt que calcul statique).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 31 routes) et `npm run test:coverage` (387 tests, +18, aucune régression, seuil global 87%). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session — un test manuel avec plusieurs vraies boutiques publiées reste recommandé avant mise en production). Rien de commité.

## 23. Découverte des boutiques depuis le catalogue (BF-125), 2026-09-26

Demande utilisateur : dans `/catalogue` (BF-108, §22), au niveau du bloc boutique, ajouter une flèche "voir plus" vers une page listant toutes les boutiques ; depuis cette page, choisir une boutique doit renvoyer vers sa page dédiée déjà construite (`/boutique/[shopId]`, BF-64).

**Fait :**
- `ShopSummaryCard` (`src/components/storefront/`) : carte partagée (logo ou icône `Store` de repli, nom, secteur/adresse si connus) — renvoie systématiquement vers `/boutique/{shopId}`.
- `MarketCataloguePageContent` : nouveau bloc "Boutiques" entre le hero et les filtres — jusqu'à 6 boutiques déduites (dédupliquées) des produits déjà chargés par `useMarketCatalogue()`, pas de lecture Firestore supplémentaire. Lien "Voir toutes les boutiques →" vers `/boutiques`, masqué si le marché est vide.
- `/boutiques` (`AllShopsPageContent`) : nouvelle page listant toutes les boutiques publiées (`shopService.listPublishedShops()`), même carte que le mini-bloc.

Tests : `ShopSummaryCard.test.tsx` (nouveau), `AllShopsPageContent.test.tsx` (nouveau), `MarketCataloguePageContent.test.tsx` étendu (bloc dédupliqué, lien vers `/boutiques`, masqué à vide). Pas de test dédié pour `/boutiques/page.tsx` — passe-plat sans logique, même convention que `/catalogue/[productId]/page.tsx`.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (32 routes, +1 — `/boutiques`) et `npm run test:coverage` (398 tests, +11, aucune régression). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session). Rien de commité.

## 24. Simulation de BF-108/BF-125 dans le catalogue de démo (BF-126), 2026-09-26

Demande utilisateur : simuler dans `/demo-catalogue` le même comportement que le vrai catalogue multi-boutique (BF-108 §22, BF-125 §23) — grille de produits mélangés, bloc "Boutiques" + flèche vers une page listant toutes les boutiques, clic sur une boutique → sa propre page. **Clarifié avec l'utilisateur (réplique complète vs. version allégée)** : réplique complète — le catalogue de démo change de structure (jusque-là des sections par boutique avec ancres `#shopId` sur une seule page) plutôt que de simplement ajouter le bloc au-dessus de l'existant.

**Fait :**
- `CatalogueExplorer` (`src/components/storefront/`) : la grille/recherche/filtre/tri/bloc "Boutiques" de `MarketCataloguePageContent` extraite en composant partagé, purement présentationnel — ne touche jamais Firestore lui-même, `items: MarketProduct[] | undefined` est déjà résolu par l'appelant (le hook réel côté `/catalogue`, un tableau synchrone côté démo). `MarketCataloguePageContent` devient un simple wrapper (`useMarketCatalogue()` + hero réel).
- `ShopSummaryCard`/`StorefrontProductCard` : nouvelle prop optionnelle `href`/`shopHref` — par défaut `/boutique/{shopId}` (vraies boutiques), remplacée par `/demo-catalogue/boutique/{shopId}` côté démo. Sans cette prop, les cartes de démo auraient pointé vers la vraie route Firestore et affiché "Boutique introuvable".
- `/demo-catalogue` réécrite : construit `MarketProduct[]` en mémoire depuis `mockShops`/`getArticlesByShop` (`src/data/mockData.ts`, toujours aucun accès Firestore) puis délègue tout le rendu à `CatalogueExplorer`. Garde le repli auto vers `/catalogue` (inchangé).
- `/demo-catalogue/boutiques` (nouvelle) : équivalent démo de `/boutiques` — liste `mockShops`, cartes vers `/demo-catalogue/boutique/{shopId}`. Même repli auto vers `/catalogue`, couvre aussi l'accès direct par URL (cohérent avec `/demo-catalogue` elle-même).
- `/demo-catalogue/boutique/[shopId]` (nouvelle) : équivalent démo de `/boutique/[shopId]` — résout la boutique dans `mockShops`, affiche ses articles (`getArticlesByShop`), fait remonter son logo/nom vers `StorefrontHeader` via `ShopBrandingProvider` (même mécanisme que BF-124, §21) pour une simulation fidèle. "Boutique de démo introuvable" si l'id ne correspond à aucune boutique de démo, plutôt qu'une page cassée.

Tests : `demo-catalogue/page.test.tsx` réécrit (grille mélangée, bloc "Boutiques" vers `/demo-catalogue/boutiques`, attribution vers `/demo-catalogue/boutique/{shopId}`), `demo-catalogue/boutiques/page.test.tsx` (nouveau), `demo-catalogue/boutique/[shopId]/page.test.tsx` (nouveau), `ShopSummaryCard.test.tsx`/`StorefrontProductCard.test.tsx` étendus (prop `href`/`shopHref`).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (34 routes, +2) et `npm run test:coverage` (409 tests, +11, aucune régression, seuil global 87%). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session). Rien de commité.

## 25. Animation au survol/focus des images produit et boutique (BF-127), 2026-09-26

Demande utilisateur : animer les images de produits et de boutiques au survol et au focus. **Fait :**
- `StorefrontProductCard`/`ShopSummaryCard` : la carte entière est déjà un `<Link>` — `group` posé sur ce lien, `transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110` sur l'`<Image>` (le conteneur a déjà `overflow-hidden`). `group-focus-visible` plutôt que `group-focus` : ne déclenche pas au clic tactile/souris, seulement au focus clavier réel — cohérent avec l'esprit de "focus" demandé (navigation clavier), pas un doublon du survol.
- `ui/ProductCard.tsx` (landing page) : pas de `<Link>` enveloppant toute la carte (seul le bouton "+" en est un) — animation posée en SCSS (`ProductCard.module.scss`) via `.card:hover`/`.card:focus-within .card__image`, `:focus-within` couvrant le focus clavier du bouton "+" à l'intérieur.

Pas touché : l'image principale de `ProductDetailPageContent` (page de destination elle-même, pas une carte cliquable vers autre chose — aucune sémantique de survol/focus pertinente).

Tests : `StorefrontProductCard.test.tsx`/`ShopSummaryCard.test.tsx` étendus (classes `group`/`transition-transform`/`group-hover:scale-110`/`group-focus-visible:scale-110` présentes).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` et `npm run test:coverage` (411 tests, +2, aucune régression). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session — l'animation elle-même n'est vérifiable visuellement qu'en navigateur réel). Rien de commité.

## 26. `/api/uploads` renvoyait un 500 opaque en production, 2026-09-26

Signalé par l'utilisateur (console navigateur, `manu-shop.vercel.app`) : `POST /api/uploads` → 500. **Diagnostic** : le reste du dump console est du bruit sans rapport (une extension de navigateur tierce `content.js`/`initAllBots`, avertissements `Cross-Origin-Opener-Policy` normaux du popup Google pendant `signInWithPopup`, avertissements de préchargement CSS) — seule cette ligne est un vrai problème applicatif.

**Cause probable, à vérifier côté utilisateur (hors de portée du code)** : `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (`.env.example`) probablement absents ou incorrects dans les variables d'environnement Vercel de production — Cloudinary rejette alors l'upload avec une erreur d'authentification.

**Bug réel trouvé et corrigé, indépendant de la cause ci-dessus** : `POST` (`src/app/api/uploads/route.ts`) n'avait aucun `try/catch` autour de l'appel Cloudinary — une erreur (identifiants absents, réseau...) remontait comme une exception non attrapée, à laquelle Next.js répond par une page d'erreur HTML, pas du JSON. Côté client, `uploadImage()` (`src/lib/upload.ts`) fait toujours `await response.json()` même sur une réponse non-ok : ça plantait sur le parsing JSON avant même de pouvoir lire un message d'erreur utile, masquant complètement la vraie cause. Corrigé : `try/catch` autour de l'upload, réponse JSON `502` avec un message clair en cas d'échec — désormais diagnosticable, et l'UI peut afficher un vrai message au commerçant au lieu d'un échec silencieux.

Tests : `src/app/api/uploads/route.test.ts` (nouveau — aucun test n'existait avant pour cette route ; `@jest-environment node`, seule façon d'avoir `Request`/`FormData`/`File` du standard web, absents de jsdom).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` et `npm run test:coverage` (417 tests, +6, aucune régression). **Pour l'utilisateur** : vérifier les 3 variables Cloudinary dans les Environment Variables du projet Vercel (Production) — si elles manquent ou sont incorrectes, c'est la cause la plus probable du 500 initial, indépendamment du correctif ci-dessus qui rend l'erreur lisible plutôt que de la résoudre. Rien de commité.

## 27. Sélecteur de galerie inopérant dans l'assistant "Créer ma boutique", 2026-09-26

Signalé par l'utilisateur : dans l'étape Logo de l'assistant (`CreateShopWizard`), le bouton "Déposez votre logo ici" (mode Galerie) n'ouvrait aucun sélecteur — confirmé par une question de clarification (rien ne s'ouvre du tout, pas une erreur après sélection). Séparément, l'utilisateur a aussi signalé une erreur générique persistante à l'enregistrement final de la boutique.

**Enregistrement final** : pas de bug de code trouvé — `CreateShopWizard.onSubmit` avale déjà volontairement l'erreur réelle derrière un message générique, **exactement le même pattern que partout ailleurs dans le projet** (`OrdersPageContent`, `RegisterForm`, `InviteSellerForm`...) : convention délibérée, pas un oubli. La cause la plus probable reste une variable d'environnement manquante côté Vercel — cette fois `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` (requise par `getAdminDb()`, voir `lib/firebaseAdmin.ts`, utilisée par `createShopAction`), même famille de problème que §26 (Cloudinary) mais pour `firebase-admin`. À vérifier par l'utilisateur dans les Environment Variables Vercel (Production) et/ou les logs de fonction Vercel (qui reçoivent toujours le message d'erreur complet côté serveur, contrairement au navigateur).

**Sélecteur de galerie, bug réel trouvé et corrigé** : `ShopLogoStep` déclenchait l'input fichier caché via un `<label htmlFor="shop-logo-file">` — un `AccountSettingsForm` (page normale, pas de modale) utilise le même motif sans problème signalé, ce qui pointe vers le `Dialog`/`Portal` de Base UI (`CreateShopWizard`) : le transfert de clic natif label→input est moins fiable une fois l'élément imbriqué dans le focus-trap d'une boîte de dialogue portée. Remplacé par un `<button onClick={() => inputRef.current?.click()}>` (clic JS explicite et synchrone dans le gestionnaire, pas de dépendance au transfert natif) — même motif que `ProductImageUploader` (dashboard, hors modale), qui n'a jamais été signalé comme cassé.

Tests : `ShopLogoStep.test.tsx` (nouveau — aucun test n'existait avant pour ce composant), vérifie explicitement que le clic sur le bouton appelle `HTMLInputElement.prototype.click()`.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` et `npm run test:coverage` (421 tests, +4, aucune régression). Pas de vérification Playwright/appareil réel (aucun outil de navigateur ni accès Vercel disponibles dans cette session) — **à confirmer par l'utilisateur en conditions réelles** avant de considérer le correctif galerie comme validé. Rien de commité.

## 28. `/api/uploads` plantait encore : `CLOUDINARY_URL` lu par le SDK avant même notre code, 2026-09-27

Après avoir configuré les 3 variables Cloudinary et déployé le correctif du §26, l'utilisateur a signalé (nouvelle capture console) que `/api/uploads` renvoyait toujours un 500 **brut** (pas le 502 avec message clair attendu du §26) — le déploiement était pourtant confirmé réussi (`gh api .../status`). Cause trouvée en lisant `node_modules/cloudinary/lib/config.js` : le SDK Cloudinary lit `process.env.CLOUDINARY_URL` **lui-même**, dès son propre chargement (`node_modules/cloudinary/lib/utils/index.js` appelle `config()` en cascade dès `import "cloudinary"`) — et lève une exception **synchrone** si elle est présente mais mal formée (ne commence pas par `cloudinary://`). Un `import` statique de `"cloudinary"` en haut de `src/lib/cloudinary.ts` s'exécute donc immédiatement au chargement du module, **avant** que notre propre `delete process.env.CLOUDINARY_URL` (ajouté dans une première tentative) ait pu s'exécuter — le crash a lieu au chargement de `/api/uploads`, jamais dans le corps de la fonction, donc jamais intercepté par le `try/catch` du §26. Reproduit et confirmé par un test (`cloudinary.test.ts`) avant correction : `require("./cloudinary")` avec une `CLOUDINARY_URL` mal formée levait bien l'exception du SDK.

Cette variable `CLOUDINARY_URL` a probablement été ajoutée automatiquement par une intégration Vercel↔Cloudinary (visible verrouillée/"Sensitive" sur la capture de l'utilisateur) — notre code ne l'utilise jamais (les 3 champs `cloud_name`/`api_key`/`api_secret` sont toujours passés explicitement), donc aucune perte fonctionnelle à la neutraliser.

**Corrigé (`src/lib/cloudinary.ts`)** : `import` **dynamique** et paresseux (`await import("cloudinary")`) plutôt que statique — `delete process.env.CLOUDINARY_URL` s'exécute désormais *avant* que le paquet ne soit chargé, pas seulement avant notre propre `.config()`. Nouvel export `getCloudinary(): Promise<...>` (mémorisé après le premier appel) remplace l'ancien export `cloudinary` direct ; `route.ts` appelle `await getCloudinary()` **à l'intérieur** de son `try/catch`, donc même un échec futur à ce niveau resterait désormais correctement intercepté.

**Recommandé côté utilisateur, en complément (pas strictement nécessaire avec ce correctif)** : supprimer la variable `CLOUDINARY_URL` inutilisée dans Vercel, pour éviter toute confusion future.

Tests : `cloudinary.test.ts` (nouveau — reproduit le crash avec une `CLOUDINARY_URL` mal formée avant correction, vérifie l'absence de crash + la suppression de la variable + la mémorisation de l'instance après correction), `route.test.ts` mis à jour pour le nouvel export `getCloudinary`.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (l'import dynamique se bundle correctement, toujours 32 routes) et `npm run test:coverage` (425 tests, +4, aucune régression). Pas de test Cloudinary réel (aucun outil réseau/navigateur dans cette session) — **à confirmer par l'utilisateur une fois déployé**. Commité et mergé dans `main` via PR (voir journal).

## 29. Vraie cause du 500 persistant : `firebase-admin/auth` plantait au chargement (ERR_REQUIRE_ESM), 2026-09-27

Le correctif du §28 (`CLOUDINARY_URL`) n'a pas suffi — l'utilisateur a fourni les **logs de fonction Vercel** (la seule façon fiable de trancher, la console navigateur ne montrant qu'un 500 sans détail), révélant la vraie cause, complètement différente :

```
Error: Failed to load external module firebase-admin-.../auth: Error [ERR_REQUIRE_ESM]:
require() of ES Module .../node_modules/jose/dist/webapi/index.js from
.../node_modules/jwks-rsa/src/utils.js not supported.
```

`firebase-admin/auth` dépend de `jwks-rsa`, qui fait `require("jose")` — mais dans l'environnement serverless Vercel (bundlé par Turbopack, `firebase-admin` traité comme dépendance externe non re-bundlée), la résolution retombe sur le build "webapi" ESM-only de `jose`, qu'un `require()` CommonJS ne peut pas charger. **Crash au chargement du module**, avant même d'entrer dans un handler — donc jamais intercepté par un `try/catch` applicatif, quel qu'il soit.

**Portée réelle, plus large qu'`/api/uploads`** : `src/lib/firebaseAdmin.ts` importait `firebase-admin/auth` de façon **statique**, au même niveau que `firebase-admin/app`/`firebase-admin/firestore`. Un module ES évalue TOUS ses imports de premier niveau au chargement, pas seulement ceux réellement utilisés par l'appelant — donc `getAdminDb()` (utilisé par `createShopAction`, `orderActions.ts`, `platformAdminActions.ts`, `requireSuperAdmin.ts`) plantait aussi, à travers `verifyIdToken.ts` qui importe `getAdminAuth` depuis le même fichier. **Ce bug explique vraisemblablement aussi l'échec à l'enregistrement final de la boutique signalé par l'utilisateur** (§27), pas seulement l'upload.

**Corrigé (`src/lib/firebaseAdmin.ts`)** : import dynamique de `firebase-admin/auth`, uniquement à l'intérieur de `getAdminAuth()` (devenue `async`) — confirmé via `grep` dans `node_modules/firebase-admin` que `jwks-rsa`/`utils/jwt.js` n'est référencé QUE par `auth/token-verifier.js` (pas par `app`/`firestore`), donc `getAdminDb()` reste synchrone et inchangé, aucun appelant de `getAdminDb()` (`shopActions.ts`, `orderActions.ts`, `platformAdminActions.ts`, `requireSuperAdmin.ts`) n'a besoin d'être modifié. `verifyIdToken.ts` adapté pour `await getAdminAuth()` avant d'appeler `.verifyIdToken()` — son test existant passait déjà sans modification (le mock retournait une valeur synchrone, `await` dessus ne change rien).

Tests : `firebaseAdmin.test.ts` (nouveau — simule le crash réel en faisant planter `firebase-admin/auth` au chargement via `jest.mock`, vérifie que `getAdminDb()` n'est jamais affecté et que `getAdminAuth()` ne plante qu'à l'appel, pas à l'import).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` et `npm run test:coverage` (427 tests, +2, aucune régression). **À confirmer par l'utilisateur une fois déployé** : upload d'image ET enregistrement final de boutique (les deux dépendaient du même chemin de code cassé).
