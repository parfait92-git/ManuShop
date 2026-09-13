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
