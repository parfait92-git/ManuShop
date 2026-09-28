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

## 30. Informations vendeur sur la fiche produit (BF-128), 2026-09-27

Demande utilisateur : sur la fiche produit, un bloc "vendeur" avec logo, nom, description, durée d'existence de la boutique, et lien vers la page du réseau social principal de la boutique (Instagram ou Facebook selon la boutique). **Constat en explorant le modèle** : `Shop.primarySocialNetwork` existait déjà (choix Whatsapp/Facebook/Instagram/TikTok dans `ShopSettingsForm`, section "Publication multicanale"), de même que `Shop.facebookUrl`/`instagramUrl`/`tiktokUrl`/`whatsappBusinessUrl` — mais ces 4 derniers champs n'étaient reliés à AUCUN champ de formulaire, donc jamais remplissables par un commerçant ; `Shop.description` n'existait pas du tout.

**Fait :**
- `Shop.description?: string` (nouveau champ modèle).
- `ShopSettingsSchema`/`ShopSettingsForm` : textarea "Description" (section Profil, même motif `<textarea>` que `ProductForm`) + un **seul** champ dynamique "Lien de votre page {réseau}", rebranché sur `facebookUrl`/`instagramUrl`/`tiktokUrl`/`whatsappBusinessUrl` selon le `primarySocialNetwork` actuellement sélectionné (`register(SOCIAL_NETWORK_URL_FIELD[primarySocialNetwork])`) — plutôt que 4 champs toujours visibles dont 3 sans rapport avec le réseau choisi.
- `src/lib/shopSocialNetworks.ts` (nouveau) : `SOCIAL_NETWORK_LABELS`/`SOCIAL_NETWORK_URL_FIELD` (mapping partagé, remplace l'ancien `NETWORK_LABELS` local à `ShopSettingsForm`) + `getPrimarySocialNetworkUrl(shop)` (résout le lien à afficher, `null` si réseau ou lien absent).
- `src/lib/shopAge.ts` (nouveau) : `formatShopAge(createdAt)` — "Depuis moins d'un mois" / "Depuis N mois" / "Depuis N an(s) et M mois", en mois pleins (pas de mois arrondi si le jour du mois n'est pas encore atteint).
- `ProductDetailPageContent` : nouvel effet chargeant `shopService.getShop(product.shopId)` une fois le produit connu (échec silencieux, comme les avis — jamais bloquant pour l'affichage du produit). Bloc "Vendu par" : logo (icône `Store` de repli si absent), nom (lien vers `/boutique/{shopId}`), durée d'existence, description si renseignée, lien réseau social si renseigné — chaque sous-partie masquée individuellement si l'info manque, jamais de bloc à moitié vide avec des placeholders.

Tests : `shopAge.test.ts` (nouveau), `shopSocialNetworks.test.ts` (nouveau), `ShopSettingsForm.test.tsx` étendu (description, rebranchement dynamique du lien réseau), `ProductDetailPageContent.test.tsx` étendu (bloc vendeur complet, repli logo, masquage individuel), `lib/validation/auth.test.ts` étendu (nouveaux champs du schéma).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 32 routes) et `npm run test:coverage` (444 tests, +22, aucune régression). Pas de vérification Playwright (aucun outil de navigateur disponible dans cette session). Rien de commité.

## 31. Vraie cause du repli permanent sur `/demo-catalogue` : règles Firestore non republiées (encore), 2026-09-27

Signalé par l'utilisateur : 2 boutiques publiées avec de vrais produits publiés, mais `/catalogue` continuait à basculer vers `/demo-catalogue`. **Bug de diagnostic trouvé d'abord** : `useDemoCatalogueAvailable()` avalait toute erreur dans son `catch` sans jamais rien logger — impossible de savoir si le repli sur la démo venait d'un vrai manque d'inventaire ou d'une lecture Firestore en échec. Ajouté un `console.error` dans ce `catch` (§31), ce qui a immédiatement révélé la vraie cause une fois reproduite : `FirebaseError: Missing or insufficient permissions.` — les règles Firestore locales (notamment le bloc `configuration`, ajouté le 2026-09-26 pour BF-122) n'avaient, une fois de plus, jamais été republiées sur la vraie console Firebase. Contenu complet de `firestore.rules` redonné à l'utilisateur pour republication manuelle — résolu après ça.

**Bug supplémentaire découvert une fois les règles corrigées** : une fois `/catalogue` capable de charger de vraies données, une boutique dont le logo avait été renseigné via un lien externe collé à la main (mode "Lien" de `ShopLogoStep`/`ShopSettingsForm`, pas un upload Cloudinary) faisait planter `next/image` (`Invalid src prop ... hostname "img.magnific.com" is not configured under images in your next.config.js`) — Next.js exige que chaque domaine d'image externe soit explicitement whitelisté dans `next.config.ts`, ce qui est structurellement incompatible avec un champ "collez n'importe quel lien d'image". **Corrigé** : `unoptimized` ajouté aux 3 `<Image>` qui rendent `shop.logo`/`branding.logo` (`ShopSummaryCard`, `ProductDetailPageContent` bloc vendeur BF-128, `StorefrontHeader` branding BF-124) — contourne l'allowlist de domaines pour ce cas précis, sans perdre le lazy-loading/dimensionnement du composant. Le 4ᵉ endroit qui affiche un logo (`ShopLogoStep`, aperçu pendant l'assistant) n'est jamais concerné : sa prévisualisation ne s'affiche qu'en mode "Galerie", où l'URL vient toujours d'un upload Cloudinary déjà whitelisté.

Tests : `useDemoCatalogueAvailable.test.ts` étendu (vérifie le nouveau `console.error`). Pas de nouveau test pour `unoptimized` (attribut JSX statique, pas de comportement à verrouiller au-delà de ce que les tests existants de ces 3 composants couvrent déjà).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 32 routes) et `npm run test:coverage` (444 tests, aucune régression). Confirmé en conditions réelles par l'utilisateur (localhost) pour la partie règles Firestore ; le correctif `unoptimized` reste à confirmer par l'utilisateur après déploiement.

## 32. Survente possible au panier/à la commande (BF-130), 2026-09-27

Signalé par l'utilisateur : possibilité de commander 60 articles alors qu'il n'y en avait que 50 en stock, sans aucun avertissement. En relisant `createOrderAction`, c'était une limite déjà **documentée comme connue** ("mécanique minimale en attendant le Module 3, pas de vérification de survente") — jamais corrigée depuis. Le panier lui-même (`cartStore`) n'avait aucune notion de stock du tout.

**Fait, deux niveaux (client = confort, serveur = seule vérification fiable) :**
- `CartItem` gagne un champ `stock?: number` (connu au moment de l'ajout, via `product.stock`). `addItem`/`updateQuantity` bornent désormais la quantité à ce stock (`clampToStock`) — absent (article déjà dans le panier avant ce champ, persistance localStorage) traité comme "pas de limite connue", pour ne jamais bloquer une quantité déjà choisie avant ce correctif.
- `CartPanel` : bouton "+" désactivé et message "Stock maximum atteint (N disponible(s))" une fois la limite du panier atteinte.
- `createOrderAction` (le vrai rempart, le stock a pu changer depuis que le client a rempli son panier) : remplace le `batch()` précédent (qui n'a jamais rien lu) par une **transaction Firestore** — relit le stock réel de chaque produit, vérifie `stock >= quantity` pour chaque article, et rejette toute la commande (`ValidationError`, message nommant le produit et le stock restant) si un seul article en manque — avant d'écrire quoi que ce soit. Une transaction (pas juste "lire puis écrire en deux temps") est nécessaire pour rester protégé contre une commande concurrente sur le même produit, pas seulement contre la survente d'un client isolé.
- `PaymentMethodPageContent` : par exception à la convention du projet (messages toujours génériques ailleurs, voir §27), affiche le message d'erreur réel de `createOrderAction` — c'est une règle métier actionnable par le client (stock insuffisant), pas une erreur technique arbitraire à cacher.

Tests : `cartStore.test.ts`/`CartPanel.test.tsx` (nouveau)/`PaymentMethodPageContent.test.tsx` étendus, `orderActions.test.ts` étendu (mock `runTransaction` à la place de `batch()` pour `createOrderAction` — `updateOrderStatusAction` reste inchangé, toujours un `batch()`).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` et `npm run test:coverage` (472 tests, +28, aucune régression). Pas de vérification Playwright (aucun outil de navigateur dans cette session).

## 33. Favoris persistants (BF-129), 2026-09-27

Signalé par l'utilisateur : le cœur sur un article "ne fait absolument rien" — en réalité un pur état visuel local (`useState`), jamais enregistré, remis à zéro à chaque rechargement, sans page pour retrouver ses favoris. Clarifié avec l'utilisateur (question posée) : vrais favoris persistants souhaités, pas juste un correctif visuel.

**Fait :**
- `User.favoriteProductIds?: string[]` (nouveau champ) — un simple tableau, pas de sous-collection : `arrayUnion`/`arrayRemove` (`UserRepository.addFavorite`/`removeFavorite`, nouveaux) le manipulent atomiquement sans lecture préalable, à ce volume largement suffisant. **Aucun changement de `firestore.rules` nécessaire** : la règle `update` existante sur `users/{userId}` autorise déjà toute auto-modification qui ne touche pas `role` (bloqueur explicite) — tout autre champ, dont celui-ci, passe déjà (même schéma que `notifyByEmail`/`photoURL`/`activeSessionId` avant lui).
- `AuthProvider` expose `toggleFavorite(productId)` : met à jour `profile.favoriteProductIds` en local tout de suite (le cœur réagit sans attendre Firestore), persiste via `AuthService.addFavorite`/`removeFavorite`, annule la mise à jour optimiste + toast d'erreur en cas d'échec. Partagé par TOUTE l'app via `useAuth()` (pas un état par carte) : aimer un article depuis le catalogue et le revoir sur la fiche produit reflète immédiatement le même état.
- `StorefrontProductCard`/`ProductDetailPageContent` : le cœur lit `profile.favoriteProductIds` (plus un `useState` local) — invite à se connecter (`toast.error`) plutôt que d'agir silencieusement pour un visiteur non connecté. Couleur ajoutée à l'état "aimé" (`text-destructive`), pas seulement le remplissage de l'icône — plus lisible, probable cause du "ne fait absolument rien" perçu (le changement précédent était réel mais visuellement trop discret).
- `/mes-favoris` (`FavoritesPageContent`, sous `ProtectedRoute`) : charge chaque produit favori + sa boutique (même forme `MarketProduct` que `useMarketCatalogue`), affichage volontairement simple (pas de recherche/filtre — une liste de favoris reste courte). Lien ajouté au menu "Mon compte" de `StorefrontHeader`.

Tests : `UserRepository` non testé directement (wrapper Firestore fin, convention du projet) ; `AuthService.test.ts`/`AuthProvider.test.tsx` étendus (mise à jour optimiste, annulation sur échec, aucun effet si personne n'est connecté) ; `StorefrontProductCard.test.tsx`/`ProductDetailPageContent.test.tsx`/`StorefrontHeader.test.tsx` étendus ; `FavoritesPageContent.test.tsx` (nouveau).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (33 routes, +1 — `/mes-favoris`) et `npm run test:coverage` (472 tests, aucune régression). Pas de vérification Playwright.

## 34. Aucun lien visible vers /super-admin (BF-67/68), 2026-09-27

Signalé par l'utilisateur : connecté avec un compte à la fois Super Admin (`platformAdmins`) et gérant de boutique (`role: "admin"` sur son profil — un compte peut cumuler les deux, ce n'est ni un bug ni exclusif), il ne voyait "aucune différence" avec un compte admin normal. **Cause** : `isSuperAdmin` (exposé par `AuthProvider`, jamais dérivé de `profile.role` — voir `SuperAdminRoute`) n'était consommé **nulle part** dans l'interface, ni `StorefrontHeader` ni `DashboardTopbar` — `/super-admin` existe et fonctionne (protégé par `SuperAdminRoute`), mais rien n'y renvoyait : seul moyen d'y accéder, connaître l'URL à l'avance.

**Corrigé** : lien "Super Admin" → `/super-admin`, conditionné à `isSuperAdmin`, ajouté au menu "Mon compte" de `StorefrontHeader` (vitrine) et au menu du profil de `DashboardTopbar` (tableau de bord marchand) — un compte cumulant les deux rôles peut désormais atteindre `/super-admin` depuis n'importe lequel des deux espaces.

**Rappel du périmètre réellement construit derrière ce lien** (le reste de la demande initiale de l'utilisateur, clarifié par une question) : uniquement BF-68 (rechercher un compte, donner/retirer l'admin). BF-117→119 (liste des commerçants, détail, privilèges premium) et BF-109→111 (tags de catégorie système) restent non commencés — documentés comme tels dans `02-besoins-fonctionnels.md`, pas une régression de cette session.

Tests : `StorefrontHeader.test.tsx` étendu (lien affiché/masqué selon `isSuperAdmin`), `DashboardTopbar.test.tsx` (nouveau — aucun test n'existait avant pour ce composant).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 33 routes) et `npm run test:coverage` (476 tests, +4, aucune régression).

## 35. Vraie coquille de tableau de bord pour le Super Admin, 2026-09-27

Demande utilisateur, après avoir trouvé et rejoint `/super-admin` (§34) : "je veux un tableau de bord pour le super admin, et son titre doit être super-admin" — la page était jusque-là un simple panneau centré (recherche de compte + attribution de l'admin), sans rien pour la distinguer visuellement d'un tableau de bord marchand normal, y compris le titre d'onglet du navigateur (partagé avec tout le site, `src/app/layout.tsx`).

**Fait**, même structure que `/dashboard` (`DashboardLayout`/`DashboardSidebar`/`DashboardTopbar`), adaptée à l'échelle plateforme :
- `SuperAdminSidebar` (nouveau) : identité "Super Admin" distincte, un seul item de navigation ("Comptes", BF-68) — **volontairement pas de liens vers BF-117→119/BF-109→111**, non commencés (voir §34) : pas de lien mort, la barre grandira avec ces fonctionnalités quand elles seront construites, pas avant.
- `SuperAdminTopbar` (nouveau) : même motif que `DashboardTopbar` (photo/initiale, nom, déconnexion) sans les éléments propres à une boutique (nom de boutique, cloche de commandes) qui n'ont pas de sens à l'échelle plateforme.
- `src/app/super-admin/page.tsx` : devient la coquille complète (barre latérale + en-tête + menu mobile, copié du motif `DashboardLayout`) plutôt qu'un panneau seul ; `SuperAdminPanel` (BF-68) en devient le contenu de la page "Comptes".
- `src/app/super-admin/layout.tsx` (nouveau) : `export const metadata = {title: "Super Admin — ManuShop"}` — un Server Component distinct était nécessaire, `page.tsx` restant `"use client"` pour `SuperAdminRoute` (les Client Components ne peuvent pas exporter `metadata`).

Tests : `SuperAdminSidebar.test.tsx`/`SuperAdminTopbar.test.tsx` (nouveaux). Pas de test pour `page.tsx` lui-même — pur assemblage de composants déjà testés (`SuperAdminRoute`, `SuperAdminSidebar`, `SuperAdminTopbar`, `SuperAdminPanel`), même convention que `mes-commandes/page.tsx`/`mes-favoris/page.tsx`, jamais testés directement non plus dans ce projet.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 33 routes) et `npm run test:coverage` (481 tests, +5, aucune régression).

## 36. Commerçants + tags de catégorie système (BF-109, BF-117→119), 2026-09-27

Suite à §35 : demande utilisateur "quelles sont les fonctionnalités dont devrait bénéficier un super admin dans la plupart des plateformes ?", réponse donnée sous forme de liste catégorisée en distinguant ce qui est déjà documenté (BF-108→119) de ce qui serait nouveau, puis "implémente les". Plusieurs items de cette liste sont bloqués sur une décision externe (finance/BF-69 sans moyen de paiement branché, messagerie BF-113/114 sans infrastructure) ou trop spéculatifs pour être construits sans plus de cadrage (modération sans notion de signalement, analytics sans infrastructure de tracking) — périmètre réduit à ce qui est concrètement réalisable avec l'existant : BF-117→119 (commerçants) et BF-109 (tags de catégorie), tous deux déjà présents dans `02-besoins-fonctionnels.md`.

**BF-109 — Tags de catégorie système :**
- `CategoryTag` (nouveau modèle) : `{id, name, color, createdAt}`. `Category.tagId?: string` ajouté (optionnel, rétrocompatible) — prépare le lien mais n'est pas encore consommé côté commerçant.
- `categoryTags` (nouvelle collection Firestore) : même schéma que `configuration`/`platformAdmins` — `allow read: if true; allow write: if false;` dans `firestore.rules`. Lecture publique nécessaire : un commerçant doit pouvoir lister les tags disponibles en créant une catégorie (pas encore branché, voir plus bas).
- `categoryTagActions.ts` (nouvelles Server Actions `createCategoryTagAction`/`deleteCategoryTagAction`) : `requireSuperAdmin` revérifié en code avant toute écriture, même convention que `platformAdminActions.ts` — ne dépend jamais uniquement de la règle Firestore. Validation : nom non vide (`trim`), couleur en hexadécimal strict (`/^#[0-9a-fA-F]{6}$/`).
- `CategoryTagRepository`/`ICategoryTagRepository` (lecture seule, `listAll()`) + `CategoryTagService` (ajoute les deux Server Actions ci-dessus) — même découpage repository/service que le reste du projet.
- `/super-admin/tags` (`CategoryTagsPageContent`, nouveau) : formulaire de création (nom + `<input type="color">`), liste avec suppression (confirmation `window.confirm`).
- **Non fait, volontairement** : le sélecteur de tag côté commerçant dans `CategoryManager.tsx` (choisir un `CategoryTag` en créant une catégorie) et le tri de la page Marché par tag (BF-110) — `Category.tagId` reste un champ mort tant que ces deux morceaux ne sont pas construits. Reste documenté comme non fait dans `02-besoins-fonctionnels.md` (BF-110/BF-111).

**BF-117→119 — Commerçants et privilèges premium par boutique :**
- `Shop.premiumFeatures?: string[]` (nouveau champ) — tableau de clés de fonctionnalité, pas un booléen par fonctionnalité : évite d'ajouter un champ au modèle à chaque nouveau privilège.
- `lib/premiumFeatures.ts` (nouveau) : 5 clés (`salesIntervalFilter`, `advancedContact`, `socialFooterLinks`, `visitStats`, `contactForm`), chacune correspondant à un besoin déjà documenté mais **non encore construit côté commerçant** (BF-102, BF-105, BF-106, BF-107, BF-112 respectivement). Activer un privilège ici ne débloque donc rien de visible pour l'instant — seul le champ `Shop.premiumFeatures` est écrit ; les fonctionnalités elles-mêmes restent à construire, ce champ n'est qu'un interrupteur prêt à l'emploi pour quand elles existeront.
- `listMerchantsAction` (nouvelle Server Action, `platformAdminActions.ts`) : un commerçant est déduit des boutiques elles-mêmes, groupées par `ownerId` — pas d'un rôle sur `users`, un compte peut redevenir client (BF-70/93) sans perdre ses boutiques. Une lecture complète de `shops` (même échelle que `listPublishedShops`), puis un profil par propriétaire distinct ; `"Compte supprimé"` en repli si le document `users/{ownerId}` n'existe plus.
- `setShopPremiumFeatureAction` (nouvelle Server Action) : `FieldValue.arrayUnion`/`arrayRemove` plutôt qu'un remplacement complet du tableau — reste sûr même si deux Super Admin modifiaient la même boutique en même temps.
- `PlatformAdminService.listMerchants()`/`setShopPremiumFeature()` (nouveaux) : enveloppent les deux Server Actions ci-dessus avec le jeton d'ID de l'appelant, même motif que le reste du service.
- `/super-admin/commercants` (`MerchantsPageContent`, nouveau) : une ligne par commerçant, dépliable (pas de page de détail séparée — la liste complète arrive en un seul appel, inutile de recharger). Une fois dépliée : une carte par boutique (nom, statut publié/non publié) avec un interrupteur par privilège premium. Mise à jour optimiste (même motif que `AuthProvider.toggleFavorite`, §33) : l'état local change immédiatement, la Server Action s'exécute en tâche de fond, annulation + `toast.error` (sonner) en cas d'échec.

**Refonte de la coquille Super Admin** (nécessaire pour accueillir ces deux nouvelles pages) : `SuperAdminShell` (nouveau) extrait la structure barre latérale/en-tête/menu mobile qui vivait directement dans `super-admin/page.tsx` (§35), même motif que `DashboardShell` pour `/dashboard`. `super-admin/layout.tsx` rend désormais `SuperAdminShell` autour de `{children}` — `/super-admin`, `/super-admin/commercants` et `/super-admin/tags` (tous trois de simples pages fines) en héritent automatiquement, sans dupliquer la coquille. `SuperAdminSidebar` passe d'un item ("Comptes") à trois ("Comptes", "Commerçants", "Tags de catégorie").

Tests (nouveaux/étendus) : `categoryTagActions.test.ts` (nouveau — revérification `requireSuperAdmin`, validations nom/couleur, création/suppression), `platformAdminActions.test.ts` étendu (`listMerchantsAction` : regroupement par propriétaire, repli "Compte supprimé" ; `setShopPremiumFeatureAction` : `arrayUnion`/`arrayRemove` selon l'état), `CategoryTagService.test.ts` (nouveau), `PlatformAdminService.test.ts` étendu, `MerchantsPageContent.test.tsx`/`CategoryTagsPageContent.test.tsx` (nouveaux — y compris l'interrupteur `Switch` de Base UI, qui nécessite le polyfill `PointerEvent` déjà établi dans `CategoryManager.test.tsx`, jsdom ne l'implémentant pas).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (37 routes au total, +2 nouvelles pages — `/super-admin/commercants`, `/super-admin/tags`) et `npm run test:coverage` (514 tests, +33, aucune régression). Pas de vérification Playwright.

**Rappel du périmètre restant, explicitement hors de cette tranche** : messagerie (BF-113→116, pas d'infrastructure), finance (BF-69 et assimilés, pas de moyen de paiement branché), modération (pas de notion de signalement), statistiques de plateforme au-delà de BF-107 (pas d'infrastructure de tracking), journal d'audit et annonces plateforme (jamais documentés comme BF, purement suggérés en discussion) — aucun de ces items n'est commencé.

## 37. Interrupteur Super Admin pour `/demo-catalogue` (BF-122), 2026-09-27

Demande utilisateur, juste après §36 : "ajoute dans la page super-admin le moyen d'activer ou désactiver l'affichage de la démo". `configuration/general.demoCatalogueEnabled` existait déjà (BF-122, §19) et pilotait déjà `useDemoCatalogueAvailable`, mais n'était modifiable qu'à la main depuis la console Firebase (`ConfigurationRepository` en lecture seule, comme `platformAdmins`) — aucune UI pour ça.

**Fait :**
- `configurationActions.ts` (nouvelle Server Action `setDemoCatalogueEnabledAction`) : `requireSuperAdmin` revérifié en code, même convention que le reste des Server Actions Super Admin. `set(..., {merge: true})` plutôt que `update` : le document `configuration/general` peut ne pas encore exister au premier basculement.
- `ConfigurationService` : `isDemoCatalogueEnabled()` (négation de `isDemoCatalogueForceDisabled()`, nommée du point de vue de l'UI) et `setDemoCatalogueEnabled()` (enveloppe la Server Action avec le jeton d'ID de l'appelant, même motif que `PlatformAdminService`/`CategoryTagService`).
- `/super-admin/reglages` (`PlatformSettingsPageContent`, nouveau) : un seul interrupteur pour l'instant ("Afficher le catalogue de démonstration"), mise à jour optimiste + retour arrière et `toast.error` en cas d'échec, même motif que les privilèges premium (§36). Un 4ᵉ item de sidebar ("Réglages") — cette page grandira avec d'autres réglages plateforme plus tard plutôt que d'en créer une nouvelle par réglage.
- Commentaires de `PlatformConfiguration.ts`/`IConfigurationRepository.ts`/`firestore.rules` mis à jour : ils décrivaient encore l'écriture comme "à la main depuis la console Firebase uniquement", ce qui n'est plus vrai (la règle `allow write: if false` elle-même n'a pas changé — l'écriture passe par `firebase-admin`, qui contourne les règles, comme pour `categoryTags`/`platformAdmins`).

Tests : `configurationActions.test.ts` (nouveau), `ConfigurationService.test.ts` étendu, `PlatformSettingsPageContent.test.tsx` (nouveau — interrupteur `Switch` de Base UI, polyfill `PointerEvent` déjà établi), `SuperAdminSidebar.test.tsx` étendu (lien "Réglages").

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (38 routes, +1 — `/super-admin/reglages`) et `npm run test:coverage` (525 tests, +11, aucune régression). Pas de vérification Playwright.

## 38. Messagerie commerçant ↔ Super Admin (BF-112→115), 2026-09-27

Demande utilisateur, en réponse à "comment l'admin entre en contact avec le super admin ?" : jusqu'ici, aucun moyen intégré à l'app — seul le formulaire de la landing page publique existait, sans rapport avec l'espace commerçant. Version minimale proposée puis validée : un ticket simple (objet + corps), pas un fil de discussion à plusieurs échanges. Volontairement réduit par rapport à la spécification complète de BF-112/114 : ni signature à initiales générées automatiquement, ni choix d'un modèle de mise en forme, ni signature "ManuShop" automatique sur la réponse — texte libre des deux côtés.

**Gating premium, pas juste construit "en dur"** : BF-112 est marqué "premium" dans la spécification, et `lib/premiumFeatures.ts` (§36) définissait déjà une clé `contactForm` jamais consommée jusqu'ici. Ce tour la branche enfin : le formulaire n'est utilisable que si `Shop.premiumFeatures` contient `contactForm` (activé par un Super Admin depuis `/super-admin/commercants`, §36) — **revérifié côté serveur** à l'envoi (`sendSupportMessageAction`), pas seulement masqué côté UI, même exigence que le reste des Server Actions privilégiées du projet.

**Fait :**
- `SupportMessage` (nouveau modèle, `src/models/support/`) : `{id, shopId, shopName, senderId, senderName, subject, body, status: "open"|"answered", createdAt, reply?: {body, createdAt}}` — un ticket, une réponse au plus.
- `supportMessages` (nouvelle collection Firestore) — même schéma que `orders` (§8) : lecture directe par le commerçant propriétaire (admin/seller de la boutique concernée, via `firestore.rules`), écriture entièrement verrouillée côté client (`allow write: if false`), tout passe par `firebase-admin`. Le Super Admin, qui doit lire TOUTES les boutiques, n'est pas exprimable proprement par une règle scopée par boutique — même limite que `listMerchantsAction` (§36) — donc une Server Action dédiée plutôt qu'une règle qui interrogerait `platformAdmins`.
- `supportMessageActions.ts` (nouvelles Server Actions) :
  - `sendSupportMessageAction(idToken, subject, body)` : `requireCaller` (identité seule, pas de privilège présupposé — même schéma que `createShopAction`), puis lit `users/{uid}` pour dériver `shopId`/`role` (jamais fourni par l'appelant, pour ne faire confiance à aucune valeur cliente) et `shops/{shopId}` pour vérifier `premiumFeatures.includes("contactForm")` avant d'écrire.
  - `listSupportMessagesAction(idToken)` : `requireSuperAdmin`, tous les messages, plus récent en premier (`orderBy` admin SDK, sans risque d'index composite ici — un seul champ de tri, pas de filtre d'égalité combiné).
  - `answerSupportMessageAction(idToken, messageId, replyBody)` : `requireSuperAdmin`, marque `status: "answered"`, écrit `reply`. `NotFoundError` si le message a été supprimé entre-temps (aucune suppression construite cette tranche, mais la vérification coûte rien).
- `SupportMessageRepository` (lecture seule, `listForShop(shopId)`) : `where("shopId","==",shopId)` **sans** `orderBy` — même contrainte que `OrderRepository.listByShop` (évite un index composite), tri fait en mémoire par `SupportMessageService.listForShop`.
- `SupportMessageService` : point d'entrée unique pour les deux audiences (comme `CategoryTagService`) — `listForShop`/`sendMessage` côté commerçant, `listAllMessages`/`replyToMessage` côté Super Admin. Les DTO des Server Actions (`Timestamp` → ISO string, même raison que `SearchedUserDto`) sont reconvertis en vrais `Timestamp` avant de ressortir du service.
- `/dashboard/support` (`SupportPageContent`, nouveau, 8ᵉ item de `DashboardSidebar`) : état honnête "réservé aux boutiques disposant du privilège premium" si `contactForm` n'est pas activé (pas un lien caché — la sidebar reste inconditionnelle pour ne pas lui ajouter une dépendance de lecture boutique rien que pour masquer un lien, `useCurrentShop()` reste au niveau de la page qui en a réellement besoin), sinon formulaire + liste des messages envoyés avec leur réponse affichée en ligne.
- `/super-admin/messages` (`SupportMessagesPageContent`, nouveau, 5ᵉ item de `SuperAdminSidebar`) : une ligne par message, dépliable (même motif que `MerchantsPageContent`, §36) — formulaire de réponse si "en attente", réponse déjà donnée affichée sinon.

Tests : `supportMessageActions.test.ts` (nouveau — vérification du privilège premium et du rôle/boutique de l'appelant, validations objet/corps/réponse vides, `NotFoundError`), `SupportMessageService.test.ts` (nouveau — tri, reconstruction des `Timestamp`), `SupportPageContent.test.tsx`/`SupportMessagesPageContent.test.tsx` (nouveaux), `SuperAdminSidebar.test.tsx` étendu (lien "Messages"). Pas de test dédié pour `SupportMessageRepository` (wrapper Firestore fin, convention déjà établie pour `OrderRepository`/etc.) ni pour `DashboardSidebar` (aucun test n'existait avant pour ce composant, hors périmètre de cette tranche).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (40 routes, +2 — `/dashboard/support`, `/super-admin/messages`) et `npm run test:coverage` (553 tests, +28, aucune régression). Pas de vérification Playwright.

**Rappel du périmètre restant** : BF-116 (notifications push) reste hors de portée (Firebase Cloud Messaging non branché, Module 11 jamais commencé) ; signature à initiales/modèle de mise en forme (BF-112/114) volontairement non construits, voir plus haut.

## 39. Moyens de contact client configurables (BF-105), 2026-09-27

Demande utilisateur, en réponse à "comment le client contacte le commerçant ?" : réponse — uniquement au moment de payer (BF-39, WhatsApp) ou via le lien réseau social principal de la fiche produit (BF-128, §21) ; pas de choix configurable. BF-105 correspond exactement à ce manque, déjà défini dans la spec et déjà relié à un privilège premium jamais consommé (`advancedContact`, `lib/premiumFeatures.ts`, §36).

**Réutilisation plutôt que duplication de champs** : WhatsApp/Facebook/Instagram avaient déjà chacun un champ sur `Shop` (`whatsapp`, `facebookUrl`, `instagramUrl`) — BF-105 les réutilise tels quels plutôt que d'en dupliquer une copie "pour les clients". Seul l'email a besoin d'un champ dédié (`Shop.publicContactEmail`, nouveau) : `Shop.contactEmail` existe déjà mais désigne l'adresse qui reçoit le RÉSUMÉ DES COMMANDES du commerçant (`notifyOrdersByEmail`, section "Contacts de commande" de `ShopSettingsForm`) — un usage interne totalement différent, le réutiliser aurait fait dépendre silencieusement deux réglages sans rapport du même champ.

**Pas de nouvelle Server Action, contrairement à BF-112 (§38)** — et c'est un choix délibéré, pas un oubli : `firestore.rules` (`match /shops/{shopId}`) autorise déjà le propriétaire d'une boutique à écrire n'importe quel champ de son propre document, `clientContactMethods`/`publicContactEmail` inclus, exactement comme tous les autres champs de `ShopSettingsForm` (nom, logo, réseaux sociaux...). Revalider ces deux champs précis en code via `firebase-admin` n'aurait ajouté aucune vraie barrière : rien n'empêche aujourd'hui un commerçant d'appeler `updateDoc` directement pour n'importe quel champ de sa boutique — **y compris `premiumFeatures` lui-même**, censé n'être modifiable que par un Super Admin (`setShopPremiumFeatureAction`, §36). C'est un vrai trou de sécurité pré-existant (pas introduit par ce tour), découvert en vérifiant s'il fallait gater ces deux nouveaux champs — signalé à l'utilisateur, pas corrigé ici (nécessite une règle Firestore comparant les champs modifiés à ceux autorisés, ex. `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`, un vrai chantier de règles, hors périmètre de cette tâche).

**Fait :**
- `Shop.ClientContactMethod` (nouveau type, `"email"|"whatsapp"|"facebook"|"instagram"`) + `Shop.clientContactMethods?: ClientContactMethod[]` + `Shop.publicContactEmail?: string`.
- `ShopSettingsSchema` (`lib/validation/auth.ts`) étendu — `clientContactMethods: z.array(z.enum([...]))` (tableau requis, jamais `undefined`, défaut `[]` côté `defaultValuesFrom`), `publicContactEmail` même validation que `contactEmail`.
- `lib/clientContactMethods.ts` (nouveau) : `buildClientContactLink(shop, method)` — un seul point de vérité pour "quel lien ouvrir pour ce canal", réutilisé par le formulaire (état désactivé si la coordonnée sous-jacente manque) ET par la fiche produit (ne jamais afficher de lien cassé si un commerçant a coché un canal puis vidé le champ correspondant depuis). `lib/whatsapp.ts` gagne `buildWhatsAppContactLink` — message générique ("j'ai une question"), distinct de `buildWhatsAppOrderLink` (BF-39, contenu du panier).
- `ShopSettingsForm.tsx` : nouvelle section "Moyens de contact client", état verrouillé honnête si `advancedContact` n'est pas activé (même motif que `/dashboard/support`, §38) — sinon un interrupteur par canal (désactivé tant que sa coordonnée n'est pas renseignée, avec un indice pointant vers la section où la renseigner) + le nouveau champ email.
- `ProductDetailPageContent.tsx` (bloc vendeur, BF-128) : si `advancedContact` est actif ET qu'au moins un canal configuré a une coordonnée utilisable, affiche la liste des canaux choisis **à la place** du lien "Voir sur {réseau principal}" — pas en plus, pour éviter deux façons redondantes de montrer le même réseau. Repli automatique sur l'ancien comportement (lien unique) si la liste est vide, y compris quand `advancedContact` est actif mais qu'aucun canal n'a de coordonnée valide.

Tests : `whatsapp.test.ts` étendu (`buildWhatsAppContactLink`), `clientContactMethods.test.ts` (nouveau), `auth.test.ts` étendu (nouveaux champs du schéma), `ShopSettingsForm.test.tsx` étendu (état verrouillé, interrupteur désactivé/activé selon la coordonnée, sauvegarde), `ProductDetailPageContent.test.tsx` étendu (canaux affichés à la place du lien social, repli quand aucun canal n'est utilisable).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes — aucune nouvelle page, uniquement des sections dans des pages existantes) et `npm run test:coverage` (572 tests, +19, aucune régression). Pas de vérification Playwright.

## 40. `/erreur?code=401` remplacé par un repli vers `/catalogue`, 2026-09-27

Signalé par l'utilisateur (capture d'écran) : se déconnecter (ou une session expirée, BF-123) depuis une page protégée renvoyait vers `/erreur?code=401` ("Connexion requise" + bouton "Se connecter") plutôt que vers une page utile — `ProtectedRoute`/`SuperAdminRoute` redirigeaient déjà `!firebaseUser` vers cette page d'erreur, pour tout cas de figure (accès direct jamais connecté, déconnexion en cours de visite, session expirée).

**Corrigé** : les deux gardes redirigent maintenant vers `/catalogue` dans ce cas — un visiteur non connecté y retrouve `StorefrontHeader` avec un lien "Se connecter" dans le menu compte, donc le chemin de retour reste disponible, juste moins intrusif qu'une page d'erreur dédiée. Le cas `403` (rôle non autorisé) est inchangé : ce message reste utile, contrairement à "vous n'êtes pas connecté" qui ne l'était pas vraiment. `/erreur?code=401` lui-même n'est pas supprimé (reste accessible par URL directe, au cas où), seulement plus jamais atteint par ces deux gardes.

Tests : `ProtectedRoute.test.tsx`/`SuperAdminRoute.test.tsx` (nouveaux — aucun test n'existait avant pour ces deux gardes de route).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (582 tests, +10, aucune régression). Pas de vérification Playwright.

## 41. Connexion "échouait" (auto-déconnexion immédiate) sur un navigateur où le compte était déjà actif ailleurs (BF-123), 2026-09-27

Signalé par l'utilisateur (capture d'écran, erreurs console `Cross-Origin-Opener-Policy`/`FirebaseError: Missing or insufficient permissions` sur `/catalogue`) : se connecter alors qu'un autre navigateur avait déjà une session active sur le même compte ne fonctionnait pas. Clarifié par une question : la connexion échoue réellement (pas juste du bruit console), confirmé.

**Diagnostic** — vraie cause d'abord non évidente : les erreurs `Cross-Origin-Opener-Policy` visibles dans la capture sont un avertissement Chrome connu et généralement bénin autour de `signInWithPopup` (mécanisme de détection de fermeture de popup de Firebase Auth), pas la cause du blocage. La vraie cause était une **course** dans `AuthProvider` (§19, BF-123) :

```
const existing = getLocalSessionId();
const sessionId = existing ?? createLocalSessionId();
setLocalSessionId(sessionId);          // (1) déclenche l'écouteur ci-dessous
if (!existing) {
  await authService.updateProfile(user.uid, { activeSessionId: sessionId });  // (2)
}
```

`setLocalSessionId` (1) était appelé **avant** que l'écriture Firestore revendiquant la session (2) ne soit terminée. Comme (1) ne dépend d'aucun `await` préalable, React peut committer ce changement d'état — et donc armer l'écouteur `onSnapshot(doc(db,"users",uid))` du second `useEffect`, qui dépend de `localSessionId` — avant que (2) (un vrai aller-retour réseau) n'ait eu le temps de resoudre. Sur un navigateur **fraîchement connecté alors qu'un autre navigateur avait déjà une session active**, ce timing fait toute la différence : la première snapshot reçue par l'écouteur montre encore l'**ancien** `activeSessionId` (celui de l'autre navigateur) alors que `localSessionId` est déjà le **nouveau** — l'écouteur croit alors qu'une autre session vient de prendre le dessus et appelle `authService.logout()` **sur lui-même**, aussitôt après la connexion. Le `signOut(auth)` qui en résulte invalide brutalement les écouteurs Firestore encore en vol (dont celui-là même), d'où le `Missing or insufficient permissions` observé juste après. Sans connexion préexistante ailleurs (premier login, `activeSessionId` absent), la même course ne se manifeste jamais : `remoteSessionId` est `undefined`, donc falsy, donc aucune déconnexion déclenchée — ce qui explique pourquoi le bug n'apparaissait que dans ce scénario précis.

**Corrigé** : inversion de l'ordre — l'écriture Firestore (2) est maintenant attendue **avant** `setLocalSessionId` (1), garantissant que l'écouteur ne s'arme qu'une fois que ce navigateur a déjà pris possession de la session (garantie "lecture de ses propres écritures" de Firestore, y compris hors ligne/avant confirmation serveur).

Tests : `AuthProvider.test.tsx` étendu — un nouveau test contrôle manuellement la résolution de l'écriture (`updateProfile`) et vérifie que `onSnapshot` n'est pas encore appelé tant qu'elle n'est pas résolue, confirmé comme échouant sur l'ancien code (vérifié en local, `git stash` temporaire) avant d'appliquer le correctif.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (583 tests, +1, aucune régression). Pas de vérification Playwright ni de reproduction manuelle multi-navigateur (corrigé sur la base du diagnostic de la course, pas d'un test en conditions réelles).

## 42. Une boutique publiée mais sans produit se repliait sur `/demo-catalogue` au lieu de s'afficher, 2026-09-27

Demande utilisateur : "si une boutique a été publiée, j'aimerais qu'elle affiche même si elle ne contient pas encore de produit". `CataloguePageContent` (le composant de `/boutique/[shopId]`, **une seule boutique précise**, distinct de `MarketCataloguePageContent` qui agrège tout le marché) redirigeait vers `/demo-catalogue` dès qu'une boutique était vide **et** qu'aucune autre boutique de la plateforme n'avait encore de produit réel (`useDemoCatalogueAvailable`) — logique héritée de `/catalogue` (le marché agrégé), où basculer sur la démo tant que rien n'est réel sur TOUTE la plateforme a du sens. Appliquée à la page d'**une** boutique précise, déjà confirmée publiée par `ShopStorefrontPage` avant même de monter ce composant, cette même logique n'avait aucun sens : visiter `/boutique/{id}` d'une vraie boutique publiée mais pas encore garnie renvoyait vers une démo sans rapport plutôt que d'afficher cette boutique avec un état honnête "aucun produit".

**Corrigé** : `CataloguePageContent` n'utilise plus `useDemoCatalogueAvailable` ni ne redirige jamais — une boutique vide affiche systématiquement "Cette boutique n'a pas encore de produit à afficher.", que la démo soit par ailleurs affichée ailleurs sur la plateforme ou non. `/catalogue` (le marché agrégé, `catalogue/page.tsx`) garde sa propre logique de repli, inchangée — c'est la bonne place pour ce comportement, pas ici.

**Vérifié que ça ne cassait rien d'autre** : `CataloguePageContent` n'est monté que depuis `ShopStorefrontPage` (`/boutique/[shopId]/page.tsx`), qui vérifie déjà `isPublished` avant de le rendre — aucun autre appelant dans le code. `AllShopsPageContent` (`/boutiques`) et `ShopSummaryCard` listaient déjà toutes les boutiques publiées sans filtrer sur le nombre de produits, donc pas concernés par ce bug.

Tests : `CataloguePageContent.test.tsx` réécrit — retire les tests de redirection (n'ont plus de sens), garde/adapte les cas "boutique vide → état honnête", "tous les produits masqués (BF-90) → état honnête" (redirigeait avant), "recherche sans résultat → pas l'état vide boutique".

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (581 tests, -2 nets — tests de redirection retirés, remplacés par moins de cas désormais nécessaires — aucune régression). Pas de vérification Playwright.

## 43. Catégories non modifiables (juste supprimables) + produits/catégories publiés par défaut à la création, 2026-09-27

Demande utilisateur, en deux parties : (1) "on doit être capable de modifier tout ce qu'on ajoute, soit au double clic soit à travers l'icône de modification, ce qui n'est pas fait [...] on est obligé de supprimer et récréer" ; (2) "la valeur par défaut des produits et catégories ajoutés ne doit pas être active à publier".

**Partie 1 — édition manquante.** Vérifié en premier ce qui existait déjà : les produits ont bien un vrai flux d'édition (`ProductList` → icône crayon → `/dashboard/products/{id}/edit`, réutilise `ProductForm` en mode édition, `productService.updateProduct` déjà branché) — rien à faire côté produits. Les **catégories**, en revanche, n'avaient que "afficher/masquer" (`Switch`) et "supprimer" (corbeille) — renommer une catégorie ou changer sa description obligeait à la supprimer et en recréer une, perdant son lien avec les produits déjà associés (association par nom, pas par id, voir `ProductForm`). `CategoryService.updateCategory`/`ICategoryRepository.update` existaient déjà côté service, mais n'étaient jamais appelés depuis l'UI.

**Fait** : `EditCategoryDialog` (nouveau, dans `CategoryManager.tsx`) — réutilise `CategorySchema` (déjà là pour la création) et `categoryService.updateCategory`, jamais branchés à une UI jusqu'ici. Ouvrable des deux façons demandées : double-clic sur la ligne (zone nom/description uniquement, pas sur le switch/bouton supprimer, pour ne pas déclencher deux actions à la fois), ou icône crayon (même convention que `ProductList`). Le statut affiché/masqué reste modifiable directement depuis la liste (`Switch`), pas dupliqué dans la boîte de dialogue.

**Partie 2 — valeur par défaut.** Deux endroits distincts :
- `CategoryManager`'s `CategoryForm` : `defaultValues.isActive` passe de `true` à `false` (la case à cocher "Afficher la catégorie" du formulaire de création — déjà là, juste retournée).
- `ProductForm.tsx` (création uniquement, pas l'édition) : `productService.createProduct({..., isPublished: false})` — jusqu'ici le champ n'était jamais écrit à la création, et `Product.isPublished` absent = publié (`ProductService.isVisibleToCustomers`, choix délibéré de compatibilité ascendante pour ne pas faire disparaître les produits créés avant l'ajout du champ, voir son commentaire dans le modèle) — un nouveau produit apparaissait donc publié sans que le commerçant l'ait décidé. Cette sémantique "absent = publié" pour les anciens produits n'est PAS changée ; seule la création écrit désormais explicitement `false`. `ProductList` permet déjà de publier d'un clic une fois prêt (photos, prix vérifiés).

Tests : `CategoryManager.test.tsx` — les deux tests de bascule "Afficher la catégorie" à la création réécrits pour le nouveau défaut (un test "reste `false` sans toucher au switch", un "passe à `true` si activé"), 3 nouveaux tests pour `EditCategoryDialog` (ouverture par icône pré-remplie + sauvegarde, ouverture par double-clic, annulation sans écriture). `ProductForm.test.tsx` étendu (`isPublished: false` à la création).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (585 tests, +4, aucune régression). Pas de vérification Playwright.

## 44. Aucun retour possible vers `/dashboard`/`/catalogue` depuis l'espace Super Admin, 2026-09-27

Signalé par l'utilisateur : "lorsqu'on est super-admin et qu'on a une boutique avec le même compte, il n'a aucun moyen de voir ses boutiques, d'administrer ses boutiques ou de retourner à la page catalogue pour consulter". Symétrique de §34 : ce tour-là avait ajouté un lien vers `/super-admin` depuis `DashboardTopbar`/`StorefrontHeader` pour un compte cumulant les deux rôles, mais jamais l'inverse — une fois dans `/super-admin`, `SuperAdminTopbar` n'offrait que "Déconnexion", aucun chemin de retour vers l'espace marchand ni vers la vitrine publique.

**Corrigé** : menu profil de `SuperAdminTopbar` étendu, même structure que `DashboardTopbar` (miroir exact, juste dans l'autre sens) :
- "Mes boutiques" → `/dashboard`, conditionné à `profile.role === "admin" || "seller"` (compte cumulant Super Admin et gérant) — absent pour un Super Admin sans boutique (`role: "client"`), pas un lien mort.
- "Catalogue" → `/catalogue`, toujours affiché : n'importe quel Super Admin peut vouloir consulter la vitrine publique, pas seulement ceux qui gèrent une boutique.

Tests : `SuperAdminTopbar.test.tsx` étendu — lien Catalogue toujours présent, lien "Mes boutiques" affiché/masqué selon le rôle.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (588 tests, +3, aucune régression). Pas de vérification Playwright.

## 45. "Nous contacter" de la landing page (mailto:) remplacé par un vrai message au Super Admin, 2026-09-27

Signalé par l'utilisateur (capture d'écran) : le bouton "Nous contacter" de la landing page ouvrait Gmail (`mailto:bonjour@manushop.cm`) — "il devrait ouvrir un popup pour entrer l'objet et le message à envoyer au super admin et pour envoyer on doit l'obliger à se connecter avant. une fois qu'il se connecte son message est envoyé dans la boîte des contacts clients. cela doit être notifié".

**Distinct de BF-112 (§38), pas une extension** : le formulaire du tableau de bord commerçant (`/dashboard/support`) est réservé aux boutiques ayant le privilège premium `contactForm` — n'a aucun sens pour un visiteur de la landing page, qui n'a généralement pas de boutique du tout. Plutôt que de dupliquer toute l'infrastructure (nouvelle collection, nouvelle page Super Admin), le message atterrit dans la **même** boîte de réception (`/super-admin/messages`) via une **nouvelle** Server Action sans le gating premium, `sendContactMessageAction` — seule condition : être connecté (`requireCaller`, identité seule). `SupportMessage.shopId`/`shopName` deviennent optionnels pour accueillir ce cas ; l'affichage Super Admin retombe sur "Site web — {nom}" quand `shopName` est absent.

**Fait :**
- `ContactSuperAdminCta` (nouveau, `src/components/storefront/`) : bouton client remplaçant l'entrée `ctas` `mailto:` de la landing page (`src/app/page.tsx`, resté un Server Component — voir plus bas). Ouvre un dialogue (objet + corps) rédigeable par n'importe qui, connecté ou non ; l'envoi exige la connexion, vérifiée à la soumission plutôt qu'à l'ouverture, pour ne pas décourager avant même d'avoir vu le formulaire — message d'erreur + lien "Se connecter" si non connecté, le texte déjà saisi n'est pas perdu (pas de redirection automatique).
- `HeroSection` (`src/components/sections/`) : `HeroCta` gagne un champ `render?: React.ReactNode`, rendu tel quel à la place d'un `GlassButton` lien pour ce CTA précis. Nécessaire parce que `page.tsx` reste un Server Component (aucune fonction `onClick` ne peut y être définie) — `HeroSection` reste elle aussi un composant de présentation pur, c'est l'appelant qui lui passe un Client Component déjà instancié (`<ContactSuperAdminCta />`), pattern RSC standard ("children as slot").
- `sendContactMessageAction` (nouvelle Server Action, `supportMessageActions.ts`) : `requireCaller` seul, aucune vérification de boutique/privilège contrairement à `sendSupportMessageAction`. Écrit dans `supportMessages` sans `shopId`/`shopName`.
- `countOpenSupportMessagesAction` (nouvelle Server Action) : `count()` agrégé (`firebase-admin` ≥ v11) sur `status == "open"` — alimente le badge de notification, sans récupérer tous les messages juste pour les compter.
- **"Cela doit être notifié"** : badge rouge sur l'item "Messages" de `SuperAdminSidebar`, nombre de messages en attente (plafonné à "9+"). Pas de `onSnapshot` temps réel possible ici (contrairement à `useNewOrdersCount`/BF-58) : `supportMessages` n'accorde de lecture côté client qu'au commerçant propriétaire de la boutique concernée (`firestore.rules`), jamais au Super Admin — délibérément non exprimé par une règle (voir §38, même raisonnement que `listSupportMessagesAction`). `useNewSupportMessagesCount` (nouveau hook) sonde donc `countOpenSupportMessagesAction` toutes les 60s plutôt qu'un flux temps réel.

Tests : `ContactSuperAdminCta.test.tsx` (nouveau — ouverture, blocage si non connecté sans perdre la saisie, envoi, échec, annulation), `HeroSection.test.tsx` (nouveau — CTA `render` vs lien `href`), `supportMessageActions.test.ts` étendu (`sendContactMessageAction`, `countOpenSupportMessagesAction`), `SupportMessageService.test.ts` étendu, `useNewSupportMessagesCount.test.ts` (nouveau — sondage, échec silencieux, arrêt au démontage), `SuperAdminSidebar.test.tsx` étendu (badge), `page.test.tsx` étendu (mock de `SupportMessageService` ajouté — sans lui, `ContactSuperAdminCta` charge transitivement `jose`, ESM pur, et plante sous Jest, même piège que `firebase-admin/auth` §29).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (610 tests, +22, aucune régression). Pas de vérification Playwright.

## 46. Tags de catégorie invisibles en production malgré des documents réels dans Firestore, 2026-09-27

Signalé par l'utilisateur (deux captures d'écran : `/super-admin/tags` en production affichant "Échec du chargement des tags. Réessayez.", et la console Firebase montrant 11 documents bien présents dans `categoryTags`). Règle Firestore locale déjà correcte (`allow read: if true`, §36) et code de lecture sans particularité (`CategoryTagRepository.listAll()`, un simple `getDocs` sans filtre) — tout pointe une fois de plus vers le même piège récurrent de ce projet (§31, §19, journal du 2026-09-26/27 à plusieurs reprises) : les règles modifiées en local pendant les sessions précédentes (dont le bloc `categoryTags`, ajouté le 2026-09-27 pour BF-109→111) n'ont jamais été republiées sur la vraie console Firebase.

**Diagnostic aggravé par un `catch` silencieux** : `CategoryTagsPageContent` (et, en vérifiant, les 3 autres pages Super Admin construites cette session — `MerchantsPageContent`, `SupportMessagesPageContent`, `PlatformSettingsPageContent`) attrapaient l'erreur de lecture sans jamais la logger, rendant impossible de distinguer un vrai refus Firestore d'une collection simplement vide — exactement le même bug de diagnostic déjà corrigé une fois pour `useDemoCatalogueAvailable` (§31), jamais reproduit pour ces pages plus récentes.

**Corrigé** : `console.error` ajouté avant le repli sur l'état d'erreur dans les 4 pages ci-dessus — un futur échec réel (règles, réseau...) sera visible dans la console du navigateur au lieu de se confondre avec "aucun tag/commerçant/message pour le moment".

**Action requise côté utilisateur (pas un changement de code)** : republier `firestore.rules` sur la console Firebase — voir la réponse donnée à l'utilisateur dans la conversation pour le contenu complet du fichier à coller.

Tests : aucun nouveau (changement de logging pur, comportement déjà couvert par les tests existants de ces 4 composants).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (610 tests, aucune régression). Pas de vérification Playwright.

## 47. Tags de catégorie non modifiables (BF-109), 2026-09-27

Demande utilisateur, une fois les tags à nouveau visibles après republication des règles (§46) : "comment je fais pour modifier mes valeurs tags ?" — même lacune que celle déjà corrigée pour les catégories du commerçant (§43), jamais reproduite ici : `CategoryTagsPageContent` n'avait que créer/supprimer, aucun moyen de renommer un tag ou changer sa couleur sans le supprimer et le recréer (perdant la référence pour toute catégorie qui l'utilisait déjà, `Category.tagId`). Contrairement à `CategoryService.updateCategory` (§43, existait déjà côté service, seule l'UI manquait), rien n'existait ici à aucune couche — Server Action, service et UI construits ensemble.

**Fait :**
- `updateCategoryTagAction` (nouvelle Server Action, `categoryTagActions.ts`) : mêmes validations que `createCategoryTagAction` (nom non vide, couleur hexadécimale stricte), `requireSuperAdmin` revérifié.
- `CategoryTagService.updateTag(id, name, color)` (nouveau).
- `EditTagDialog` (nouveau, dans `CategoryTagsPageContent.tsx`) : même motif que `EditCategoryDialog` (§43) — ouvrable par double-clic sur le nom du tag ou icône crayon, pré-rempli.

Tests : `categoryTagActions.test.ts`/`CategoryTagService.test.ts` étendus, `CategoryTagsPageContent.test.tsx` étendu (ouverture par icône pré-remplie + sauvegarde, ouverture par double-clic, échec, annulation).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (620 tests, +10, aucune régression). Pas de vérification Playwright.

## 48. Messagerie commerçant ↔ Super Admin sans mise à jour en temps réel, 2026-09-27

Signalé par l'utilisateur : "les messages ne se mettent pas à jour en temps réel" — `/dashboard/support` et `/super-admin/messages` (§38, §45) lisaient chacun une seule fois au montage (`.then()`), jamais rafraîchis ensuite : une réponse du Super Admin, ou un nouveau message, n'apparaissait qu'après un rechargement manuel de la page.

**Deux solutions différentes, pas la même contrainte des deux côtés** :
- **Côté commerçant** (`/dashboard/support`) : un vrai `onSnapshot` est possible — `firestore.rules` accorde déjà au commerçant la lecture des messages de sa propre boutique (§38). Nouveau hook `useSupportMessagesForShop(shopId)`, même structure que `useNewOrdersCount` (BF-58) mais renvoie les documents complets triés plutôt qu'un compteur — pas d'`orderBy` côté requête (même contrainte que `SupportMessageRepository.listForShop`, évite un index composite), tri fait à chaque snapshot. `SupportPageContent` l'utilise à la place de `supportMessageService.listForShop()` ; le ré-appel manuel après l'envoi d'un message devient inutile, l'écouteur reçoit déjà ce nouveau document.
- **Côté Super Admin** (`/super-admin/messages`) : un `onSnapshot` direct reste impossible (même limite que `listSupportMessagesAction`/`useNewSupportMessagesCount`, §45 — `firestore.rules` n'accorde de lecture qu'au commerçant propriétaire, jamais au Super Admin, délibérément non exprimé par une règle). `SupportMessagesPageContent` sonde maintenant `listAllMessages()` toutes les 15s (plus court que les 60s du badge de la sidebar, une notification d'ambiance — ici l'utilisateur regarde activement la liste). Un échec de sondage ponctuel garde désormais la dernière liste connue à l'écran (juste le message d'erreur en plus) plutôt que de la vider — un comportement correct pour un chargement unique devenait faux une fois répété périodiquement.

Aucun changement pour le badge de `SuperAdminSidebar` (§45, 60s) — déjà un sondage, pas concerné par ce signalement.

Tests : `useSupportMessagesForShop.test.ts` (nouveau — snapshot trié, repli sur `[]` en cas d'erreur, désabonnement), `SupportPageContent.test.tsx` réécrit (mock du nouveau hook plutôt que de `listForShop`), `SupportMessagesPageContent.test.tsx` étendu (sondage périodique — nouveau message reflété après l'intervalle, liste conservée après un échec ponctuel, arrêt au démontage).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (629 tests, +9, aucune régression). Pas de vérification Playwright.

## 49. Sélecteur de tag système enfin branché côté commerçant (BF-109→111), 2026-09-27

Signalé par l'utilisateur (capture d'écran, `/dashboard/categories`) : aucun champ pour associer un tag Super Admin à une catégorie créée par un commerçant. Justifié explicitement par l'utilisateur : c'est le chaînon manquant pour pouvoir un jour filtrer, sur le Marché agrégé (`/catalogue`), les produits de plusieurs boutiques par une taxonomie commune — filtrer par nom de catégorie brut ne marche pas à l'échelle (deux boutiques nommant différemment des catégories similaires, ou identiquement des catégories sans rapport). Exactement le champ volontairement laissé de côté au tour de la construction des tags (§36) : "le sélecteur de tag côté commerçant... n'est volontairement pas branché cette tranche."

**Fait — uniquement le champ, pas encore le filtre du Marché lui-même (voir périmètre restant ci-dessous)** :
- `CategorySchema` (`lib/validation/product.ts`) gagne `tagId: z.string().optional()` — chaîne vide = "aucun tag", pas une valeur invalide.
- `CategoryService.createCategory` : `tagId` ajouté à `CreateCategoryInput`, jamais écrit comme `undefined` explicite (Firestore refuse ce cas sur `setDoc`, contrairement à l'absence pure et simple de la clé) — `...(tagId ? {tagId} : {})`.
- `ICategoryRepository.UpdateCategoryDto` : `tagId` élargi à `string | FieldValue`, pour accepter `deleteField()` — nécessaire pour qu'un commerçant puisse **retirer** un tag déjà associé (`updateDoc` refuse aussi `undefined`, mais accepte le sentinel `deleteField()`, contrairement à `setDoc`/`create` qui n'a pas cette distinction utile ici).
- `CategoryManager.tsx` : `CategoryForm` (création) et `EditCategoryDialog` (édition, §43) gagnent chacun un `<Select>` "Tag de catégorie système" (facultatif), alimenté par `categoryTagService.listTags()` (lecture publique, déjà existante) chargée une fois dans `CategoryManager` et transmise en props — pas de nouvel appel par sous-composant. `EditCategoryDialog` construit son payload en trois branches : un tag choisi → l'écrire ; aucun tag choisi mais la catégorie en avait un → `deleteField()` ; ni l'un ni l'autre → la clé reste absente du payload. `CategoryRow` affiche désormais le tag associé (pastille de couleur + nom) à côté du nom de la catégorie, pour qu'un commerçant voie d'un coup d'œil ce qui est déjà taggé.

**Périmètre restant, explicitement hors de cette tranche** : le Marché agrégé (`/catalogue`, `CatalogueExplorer`/`useMarketCatalogue`) filtre toujours par nom de catégorie brut (`product.category`), pas par tag système — la raison même invoquée par l'utilisateur pour ce champ. Le brancher demande de résoudre, pour chaque produit affiché, la catégorie de sa boutique correspondant à `product.category` puis son `tagId` (une jointure supplémentaire par boutique dans `useMarketCatalogue`, aujourd'hui absente), et de refléter ça dans `/demo-catalogue` pour rester fidèle (`mockData.ts` n'a aujourd'hui aucune notion de tag) — un chantier à part entière, pas fait ici faute de demande explicite pour cette partie précise cette fois-ci.

Tests : `lib/validation/product.test.ts` étendu (accepte un `tagId` ou son absence) ; `CategoryService.test.ts` étendu (`tagId` inclus quand choisi, omis — jamais `undefined` — quand vide) ; `CategoryManager.test.tsx` étendu (liste des tags disponibles, création avec/sans tag, affichage du tag sur la ligne, modification et retrait via la boîte de dialogue d'édition).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (638 tests, +9, aucune régression). Pas de vérification Playwright.

## 50. Aucun moyen de modifier le logo d'une boutique déjà créée (galerie ou lien), 2026-09-27

Signalé par l'utilisateur : `/dashboard/shop` (paramètres de boutique) n'offrait qu'un simple champ texte "URL du logo" — aucun moyen d'uploader une image depuis la galerie, contrairement à l'assistant "Créer ma boutique" (BF-81), qui a toujours eu les deux modes (`ShopLogoStep`, bascule Galerie/Lien avec recadrage, §27 pour son historique de bugs déjà corrigés). Une fois la boutique créée, ce composant n'était simplement jamais réutilisé pour l'édition.

**Fait** : `ShopLogoStep` réutilisé tel quel dans `ShopSettingsForm` (aucune duplication de logique d'upload/recadrage) :
- `ShopSettingsSchema` gagne `logoMode: z.enum(["gallery","link"])` — purement local au formulaire (bascule d'affichage), jamais envoyé à `shopService.updateProfile` (déstructuré et exclu avant l'appel, `Shop` ne connaît que l'URL finale du logo, peu importe comment elle a été obtenue).
- `defaultValuesFrom` : `logoMode` démarre toujours à `"gallery"` à l'ouverture — l'aperçu en mode Galerie fonctionne quelle que soit l'origine réelle du logo existant (Cloudinary ou lien externe), donc ce choix affiche systématiquement un bel aperçu circulaire plutôt qu'un champ texte brut.
- `ShopLogoStep` gagne une prop `hideHeading` (le titre "Ajoutez votre logo" et son texte d'aide "vous pourrez l'ajouter plus tard" n'avaient de sens que dans l'assistant de création) et corrige son `<Image>` de prévisualisation avec `unoptimized` — jusqu'ici absent car ce composant n'était accessible qu'en création, où `logoUrl` ne pouvait venir que d'un upload Cloudinary (donc toujours dans l'allowlist de domaines de `next.config.ts`) ; réutilisé maintenant pour éditer une boutique existante, `logoUrl` peut être un lien externe collé à la main (mode "Lien"), même piège que `ShopSummaryCard`/`ProductDetailPageContent`/`StorefrontHeader` déjà corrigé plus tôt cette session.

Tests : `ShopLogoStep.test.tsx` étendu (`hideHeading`, aperçu non passé par l'allowlist de domaines) ; `ShopSettingsForm.test.tsx` étendu (mode Galerie par défaut, bascule vers Lien + sauvegarde, `logoMode` jamais envoyé au service) ; `lib/validation/auth.test.ts` étendu (`logoMode` accepté/rejeté, fixture `validShop` mise à jour).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (643 tests, +5, aucune régression). Pas de vérification Playwright.

## 51. Deux erreurs console distinctes sur `/dashboard/shop`, 2026-09-27

Signalé par l'utilisateur (deux captures d'écran, sans description — erreurs lues directement dans la console du navigateur). Deux bugs sans rapport entre eux :

**1. `[react-phone-number-input] Expected the initial value to be a E.164 phone number. Got "4388606896"`** — `PhoneInput` (`ShopSettingsForm`) suppose toujours une valeur E.164 (`"+..."`) en entrée, mais `CreateShopWizard.tsx` (l'assistant de création, BF-79→85) n'a **jamais** utilisé `PhoneInput` pour `phone`/`whatsapp` — deux simples `<Input>` texte sans indicatif ni validation de format, `register()`-branchés directement. Toute boutique créée via l'assistant enregistre donc un numéro brut ("4388606896", sans "+1"), qui plante ensuite silencieusement l'hypothèse E.164 de `PhoneInput` à l'édition. Un vrai bug de fond, pas seulement pour ce compte : **toutes** les boutiques créées jusqu'ici via l'assistant sont concernées.

**Corrigé** : `CreateShopWizard.tsx` utilise désormais `PhoneInput` pour ces deux champs, même câblage que `ShopSettingsForm` (`useWatch`/`setValue`, colonne unique plutôt que `grid-cols-2` — un `PhoneInput` a besoin de plus de largeur qu'un champ texte, encore plus marqué dans la largeur réduite d'une boîte de dialogue). Empêche le problème pour toute **nouvelle** boutique ; ne corrige pas rétroactivement les numéros déjà enregistrés en brut (aucune migration Firestore effectuée — le prochain enregistrement via `ShopSettingsForm` les normalisera).

**2. `Uncaught (in promise) FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined (found in field metadata...)`** — au clic sur "Enregistrer les paramètres", `ActivityLogService.logShopSettingsUpdated()` appelle la méthode privée `log()` **sans** 5ᵉ argument `metadata` (seul appelant de `log()` à le faire — tous les autres, `logProductPublished`/`logOrderCreated`/etc., passent toujours un objet). `log()` construisait `{..., metadata}` sans jamais vérifier que `metadata` était défini — Firestore refuse `undefined` explicite sur `setDoc`. Un bug réellement ancien (présent depuis l'écriture initiale de `logShopSettingsUpdated`), pas introduit aujourd'hui, seulement remarqué maintenant que l'utilisateur teste ce flux.

**Conséquence plus grave que le message d'erreur seul ne le laisse penser** : `ShopSettingsForm.onSubmit` n'avait **aucun** `try/catch` — `shopService.updateProfile()` (qui réussissait bien) était suivi d'un `await activityLogService.logShopSettingsUpdated()` qui **plantait** systématiquement, empêchant `setSaved(true)` de s'exécuter. Résultat : les paramètres étaient réellement enregistrés, mais la confirmation "Paramètres enregistrés." ne s'affichait jamais — un faux négatif silencieux à chaque sauvegarde.

**Corrigé** :
- `ActivityLogService.log()` : `...(metadata ? { metadata } : {})` plutôt que `metadata` toujours présent — même garde déjà appliquée ailleurs cette session (`Category.tagId`, §43/§49) pour ce même piège Firestore.
- `ShopSettingsForm.onSubmit` : désormais un vrai `try/catch`. L'écriture principale (`updateProfile`) et la journalisation d'activité sont découplées — un échec de la seconde (secondaire) est loggé en console mais n'empêche plus `setSaved(true)` de s'exécuter puisque l'enregistrement principal, lui, a bien réussi. Un échec de la première affiche désormais un message d'erreur honnête (`formError`, nouveau state) au lieu d'un rejet de promesse non intercepté.

Tests : `ActivityLogService.test.ts` — le test existant `logShopSettingsUpdated` asserait `metadata: undefined` dans le payload envoyé au repository mocké, ce qui masquait le bug (`toHaveBeenCalledWith`/`toEqual` traitent `{metadata: undefined}` et `{}` comme égaux — la distinction qui compte pour Firestore n'est vérifiable qu'avec `.not.toHaveProperty("metadata")`, pas une simple égalité) ; réécrit en conséquence, vérifié comme échouant sur l'ancien code avant le correctif (`git stash` temporaire). `ShopSettingsForm.test.tsx` étendu (confirmation affichée malgré un échec de journalisation, message d'erreur si l'enregistrement principal échoue). `CreateShopWizard.test.tsx` étendu (numéro soumis en E.164, pas les chiffres bruts tapés).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (646 tests, +3, aucune régression). Pas de vérification Playwright.

## 52. Champs téléphone limités à 3 pays (Cameroun, USA, Canada), 2026-09-27

Demande explicite de l'utilisateur, suite à §51 : "tous les champs de numéro téléphone doivent avoir une limite et un formatage stricte, pour le moment prenons en compte juste 3 numéros de téléphone : cameroun, usa canada." `PhoneInput` (`react-phone-number-input`) proposait par défaut la liste mondiale complète des pays (~200) dans son sélecteur — la longueur maximale et le formatage propres à chaque pays sont déjà gérés strictement par la bibliothèque elle-même (`limitMaxLength`, confirmé par les tests déjà existants — 9 chiffres pour le Cameroun, 10 pour le plan de numérotation nord-américain), donc le vrai changement demandé est la **restriction de la liste de pays sélectionnables**, pas l'ajout d'un formatage qui existait déjà.

**Fait** : `SUPPORTED_PHONE_COUNTRIES: Country[] = ["CM", "US", "CA"]` (nouveau, exporté depuis `phone-input.tsx`), passé au prop `countries` de `ReactPhoneNumberInput` — un seul point de vérité, propagé automatiquement à **tous** les champs téléphone de l'app (`ShopSettingsForm`, `CreateShopWizard`, `AccountSettingsForm`, `ManualOrderDialog`, `PaymentMethodPageContent`), puisqu'ils passent tous par ce même composant `PhoneInput`. Vérifié qu'aucun champ téléphone de l'app ne contournait ce composant par un `<Input>` texte brut (recherche exhaustive des usages de "phone"/"téléphone" dans `src/components`) — les seules occurrences restantes sont de l'affichage (`TeamList`, `StorefrontHeader`) ou une recherche floue (`SuperAdminPanel`, pseudo/email/téléphone), pas de la saisie, donc hors sujet ici.

Tests : `phone-input.test.tsx` étendu (liste de pays restreinte aux 3 exacts) ; le test existant "resets the number when a different country is selected" utilisait la France (`FR`), désormais exclue de la liste — changé pour `US`.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (toujours 40 routes) et `npm run test:coverage` (647 tests, +1, aucune régression). Pas de vérification Playwright.

## 53. "Aucun produit n'affiche" (boutique et /catalogue) + lien de retour explicite (BF-131), 2026-09-28

Deux captures d'écran de l'utilisateur : `/boutique/{id}` et `/catalogue` affichent tous deux "aucun produit" malgré des boutiques et articles que l'utilisateur croit publiés, avec une erreur console non rattrapée (`{name:'r', httpError:true, httpStatus:404, ...}`).

**Investigation** : tracé toute la chaîne lecture (`ProductRepository.listByShop`, règles Firestore — lecture publique `allow read: if true` sur `products`/`categories`/`shops`, correspondance `profile.shopId` ↔ id du document boutique à la création) et écriture (interrupteur "Publié" dans `ProductList`, `productService.setPublished`) : aucune anomalie de code trouvée. L'erreur console (forme `httpError`/`httpStatus`/`code`) ne correspond à aucune `FirebaseError` Firestore typique — vraisemblablement le SDK Firebase Installations, sans rapport avec l'affichage des produits, écartée. Le rendu observé ("Cette boutique n'a pas encore de produit à afficher.", pas "Chargement...") implique nécessairement que la lecture a réussi (juste avec un résultat filtré à vide) — cohérent avec le comportement voulu de §43 : les produits sont créés `isPublished: false` par défaut, donc invisibles tant qu'ils ne sont pas explicitement basculés sur "Publié" dans `/dashboard/products`. Cause la plus probable : confusion utilisateur avec le changement de comportement introduit par §43, pas un bug.

**Fait, pour fiabiliser le diagnostic si ça se reproduit** : deux trous de gestion d'erreur comblés, même motif que §31/§46 — un échec de lecture ne doit jamais se replier silencieusement sur un état indiscernable d'un contenu réellement vide.
- `CataloguePageContent.tsx` : l'effet de chargement des produits/catégories n'avait **aucun** `.catch()` — un échec bloquait `products` sur `null` pour toujours (page coincée sur "Chargement...", sans trace en console). Ajout d'un `.catch()` qui journalise (`console.error`) et se replie sur un catalogue honnêtement vide plutôt que de rester bloqué.
- `useMarketCatalogue.ts` : le `.catch()` existant se repliait déjà sur `[]` mais sans `console.error` — ajouté.

**Confirmé par l'utilisateur, exigence explicite** : "même si aucun produit n'est publié la boutique doit s'afficher" — déjà couvert par le code existant depuis §42 (`isEmptyShop` affiche un état honnête plutôt que de rediriger, et `PublicationBanner` ne conditionne la publication de la boutique à aucun nombre minimum de produits) ; vérifié, aucune régression à corriger ici.

**BF-131, lien de retour explicite** : demande explicite de l'utilisateur ("à chaque fois qu'on entre dans une page ou un composant ça doit être facile de rentrer où on était précédemment"), précisée via question de clarification → lien "Retour" explicite (plutôt que fil d'Ariane ou préservation d'état de liste). Recherche exhaustive des pages de détail/édition du dashboard marchand et du Super Admin (`find src/app/dashboard src/app/super-admin`, aucune route dynamique hors `/dashboard/products/[id]/edit` — les autres listes du Super Admin utilisent une expansion en ligne, pas une navigation) : seul `ProductFormPageContent` (partagé par `/dashboard/products/new` et `/dashboard/products/[id]/edit`) en manquait — ajouté (icône `ChevronLeft` + "Retour aux produits" vers `/dashboard/products`), y compris sur l'état "Produit introuvable." Le storefront public avait déjà ce lien (`ProductDetailPageContent`, "Retour à la boutique").

Tests : `CataloguePageContent.test.tsx` étendu (nouveau test vérifiant le repli sur l'état vide + `console.error` en cas d'échec de lecture, vérifié comme échouant sur l'ancien code via `git stash`) ; `ProductFormPageContent.test.tsx` (nouveau fichier, aucun test existant sur ce composant) couvrant le lien de retour sur les trois états (création, édition, produit introuvable).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (aucune nouvelle route) et `npm run test:coverage` (651 tests, +4, aucune régression). Pas de vérification Playwright.
