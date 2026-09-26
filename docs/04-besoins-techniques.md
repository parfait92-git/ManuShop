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
