# Journal de Progression — ManuShop

Ce fichier sert de mémoire de session entre les conversations avec Claude Code.

**Règles d'usage (pour Claude) :**
- Avant de commencer tout travail, lire la **toute dernière entrée** ci-dessous pour savoir où on s'est arrêté.
- À la fin de chaque session (ou étape significative), ajouter une **nouvelle entrée en bas du fichier** (ne jamais réécrire les entrées précédentes) avec : date, ce qui a été fait/décidé, l'état du code, et la prochaine étape prévue.
- Rester concis : ce n'est pas un compte-rendu exhaustif, juste de quoi reprendre le fil rapidement.

---

## Ordre de travail retenu (Phase 1 — MVP)

1. **Module 1 — Auth & Utilisateurs** (BF-01→05) — prérequis technique aux autres modules (rôles déjà utilisés dans firestore.rules)
2. **Module 2 — Catalogue produits** (BF-06→12)
3. **Module 3 — Stock** (BF-13→17)
4. **Module 4 — Commandes** (BF-18→23)
5. **Module 5 — Facturation** (BF-24→29)
6. **Module 7 — Vitrine publique** (BF-35→40) — brancher sur les vraies données Firestore au lieu des données en dur
7. **Module 10 — Dashboard** (BF-53→57)

(Modules 6, 8, 9, 11 = Phases 2/3, plus tard)

---

## Entrées

### 2026-09-20 — État des lieux initial

**Constat (lecture complète du code existant) :**
- Phase 0 (setup) terminée : Firebase, Cloudinary, PWA, CI/CD, règles Firestore déployées, modèles TypeScript créés (`src/models/*`).
- `src/repositories/`, `src/services/`, `src/factories/`, `src/strategies/publishing/` sont **vides** (juste `.gitkeep`) — aucun pattern métier implémenté.
- Aucune authentification, aucun CRUD réel vers Firestore, aucune route `/api/*`.
- Seul élément construit : la landing page marketing (`src/app/page.tsx` + composants `sections/`, `ui/`) avec des produits **en dur dans le code** (pas de données réelles).

**Décision :** on part sur le Module 1 (Auth) en premier, puis Catalogue, Stock, Commandes, Facturation, Vitrine publique, Dashboard (voir ordre ci-dessus).

**Prochaine étape :** démarrer le Module 1 — Auth & Utilisateurs (BF-01→05) : inscription/connexion gérant (Firebase Auth email/password), rôles Admin/Vendeur/Client, profil boutique, reset mot de passe. Pas encore commencé.

### 2026-09-20 — Module 1 (Auth & Utilisateurs) implémenté

**Fait :**
- Repositories Firestore (`IUserRepository`/`UserRepository`, `IShopRepository`/`ShopRepository`) suivant le Repository Pattern déjà documenté.
- `AuthService` (inscription gérant = crée le compte Firebase Auth + le profil `users/{uid}` en rôle `admin` + une boutique par défaut dans `shops`, connexion, déconnexion, reset mot de passe) et `ShopService` (lecture/mise à jour du profil boutique).
- `AuthProvider` (contexte React client) + `useAuth()` : écoute `onAuthStateChanged` et charge le profil Firestore correspondant. Branché dans `src/app/layout.tsx`.
- `ProtectedRoute` : garde de route **optimiste** côté client (redirige vers `/login` si non connecté, ou vers `/dashboard` si le rôle ne correspond pas à `allowedRoles`). L'autorisation réelle reste imposée par `firestore.rules` — voir le guide `authentication.md` de Next (pas de session serveur possible ici : le projet n'a pas `firebase-admin`, tout passe par le SDK client Firebase, donc pas de Server Actions pour l'auth, tout est en Client Components).
- Pages : `/login`, `/register` (BF-01/02/05 inscription+connexion), `/forgot-password` (BF-05), `/dashboard` (accueil protégé), `/dashboard/shop` (BF-04 profil boutique, réservé au rôle `admin`).
- Composants UI ajoutés : `Input`, `Label` (même convention cva/`cn` que `Button` existant).
- Tests unitaires ajoutés pour les schémas Zod (`src/lib/validation/auth.test.ts`, 100% de couverture sur ce fichier). `npm run lint`, `npm run build` et `npm run test:coverage` passent tous (couverture globale ~86%, seuil CI à 70%).

**Non fait / limites connues :**
- Pas de tests unitaires sur `AuthService`/`ShopService`/repositories (nécessiteraient de mocker le SDK Firebase) ni sur les formulaires (React Testing Library) — la couverture Jest par défaut ne mesure que les fichiers touchés par un test, donc leur absence ne fait pas échouer le seuil CI, mais ça reste un trou de couverture à combler.
- BF-03 (rôles) : le rôle `admin` est posé à l'inscription, mais il n'existe pas encore d'écran pour qu'un admin invite/crée des comptes Vendeur — à faire quand le Module 4 (Commandes) ou la gestion d'équipe sera abordée.
- Pas de vérification d'email après inscription (Firebase Auth le permet via `sendEmailVerification`, non branché).

**Prochaine étape :** Module 2 — Catalogue produits (BF-06→12) : repository/service `Product`, CRUD Firestore, upload images vers Cloudinary, écrans de gestion dans `/dashboard`.

### 2026-09-20 — Couverture de tests de `SiteHeader.tsx` comblée

En marge du Module 1, ajout de `src/components/sections/SiteHeader.test.tsx` (préexistant sans test) : comportement de masquage/affichage au scroll (seuil de délta, offset du haut), toggle du menu mobile, fermeture au clic sur un lien, soumission du formulaire de recherche. Couverture du fichier passée de 68.57/47.36/77.77/65.62 (stmts/branch/funcs/lines) à 100/94.73/100/100 — seule la branche de garde anti-rafale (`ticking`) reste non couverte, difficile à déclencher sans machine à état de timers plus complexe. Couverture globale du projet : 86% → 93.24%. `npm run lint` et `npm run test:coverage` passent toujours.

### 2026-09-20 — Correction d'un bug d'hydratation (`ScrollReveal`) + hint perf images

Signalés par l'utilisateur via la console du navigateur en dev :

1. **Hydration mismatch** sur `src/components/ui/ScrollReveal.tsx` : l'état initial `isVisible` était calculé via `typeof IntersectionObserver === "undefined"`, qui vaut `true` côté serveur (Node n'a pas cet objet) et `false` côté client (le navigateur l'a déjà avant même l'hydratation) → le premier rendu client n'a jamais la classe `reveal--visible` que le serveur a émise, React log un mismatch sur toutes les instances de `ScrollReveal` de la page. **Fix :** l'état initial est maintenant toujours `false` (identique serveur/client) ; la révélation immédiate en environnement sans `IntersectionObserver` (vieux navigateurs, tests) se fait dans l'effet via `queueMicrotask` (pour respecter la règle ESLint `react-hooks/set-state-in-effect` qui interdit un `setState` synchrone dans le corps de l'effet). Tests ajoutés dans `ScrollReveal.test.tsx` (6 cas : rendu caché initial, révélation différée si `IntersectionObserver` absent, révélation sur intersection, non-révélation si `isIntersecting` est faux, variables CSS `--reveal-delay`/`--reveal-distance`, prop `as`) — couverture du fichier 57%→95%.
2. **Hint perf `next/image`** sur `PageBackground.tsx` : les deux images de fond (mobile/desktop) utilisaient `fill` + `sizes="100vw"` alors que l'une des deux est toujours `display:none` selon le breakpoint (largeur rendue 0), ce qui ne correspond pas à `100vw`. **Fix :** `sizes` conditionné par le même breakpoint `md` (768px) que le CSS (`(min-width: 768px) 0px, 100vw` pour la variante mobile, l'inverse pour la variante desktop).

`npm run lint`, `npm run build` et `npm run test:coverage` passent (couverture globale 93.24% → 98.65%, 37 tests). Rien de commité — changements en attente de confirmation utilisateur.

### 2026-09-20 — BF-03 complété : gestion d'équipe (invitation de Vendeurs)

BF-03 n'était que partiel (rôle posé à l'inscription mais aucun moyen de créer un Vendeur). Complété :

- **`src/lib/firebase.ts`** : ajout de `getSecondaryAuth()`, une seconde instance d'app Firebase nommée "Secondary". Nécessaire car il n'y a pas de `firebase-admin` dans ce projet (SDK client uniquement) : créer un compte via `createUserWithEmailAndPassword` connecte automatiquement le SDK à ce nouveau compte, ce qui déconnecterait l'admin de sa propre session s'il le faisait sur l'instance `auth` principale. C'est le contournement standard documenté par Firebase pour ce cas (admin qui crée des comptes pour d'autres) sans backend.
- **`AuthService.inviteSeller()`** : crée le compte Auth du vendeur sur l'instance secondaire, écrit son profil Firestore (`role: "seller"`, `shopId` de l'admin) via l'instance **principale** (donc avec les droits de l'admin), envoie un email de réinitialisation de mot de passe (le vendeur choisit lui-même son mot de passe, l'admin ne le manipule jamais), puis déconnecte l'instance secondaire — y compris si l'écriture Firestore échoue (`finally`). `AuthService.listTeamMembers(shopId)` liste les membres via `UserRepository.listByShop`.
- **`firestore.rules`** : la collection `users` autorisait seulement `request.auth.uid == userId`. Étendue pour qu'un admin puisse aussi **lire** et **créer** (avec `role: 'seller'` et le même `shopId`) les documents des membres de sa propre boutique — nécessaire pour lister l'équipe et provisionner un Vendeur. `update` reste restreint à soi-même (pas de retrait/changement de rôle depuis l'UI pour l'instant).
- **UI** : `/dashboard/team` (admin uniquement, via `ProtectedRoute allowedRoles={["admin"]}`) — formulaire d'invitation (`InviteSellerForm`, juste nom + email) et liste des membres avec leur rôle (`TeamList`). Lien "Équipe" ajouté à `DashboardNav` à côté de "Boutique".
- Tests : `InviteSellerSchema` (validation), et surtout `AuthService.test.ts` (8 cas, mock de `firebase/auth` + injection des repositories) qui vérifie notamment que la création utilise bien l'instance secondaire (pas `auth`), que l'email de reset part de l'instance principale, et que la déconnexion de l'instance secondaire a lieu même si l'écriture Firestore échoue.

**Règles déployées :** l'utilisateur a collé le contenu mis à jour dans l'éditeur de la console Firebase et publié — les nouvelles règles `users` (lecture/création par un admin des membres de sa boutique) sont donc actives en production. L'invitation de Vendeurs peut être testée sur le projet réel.

**Limite restante (hors scope BF-03) :** le rôle Client n'a pas de flux de création dédié — probablement à traiter au Module 7 (Vitrine publique), où les clients s'inscrivent depuis la boutique elle-même plutôt que depuis le dashboard admin.

`npm run lint`, `npm run build` et `npm run test:coverage` passent (48 tests ; couverture globale redescendue à 85.9% du fait des repositories désormais chargés dans les tests mais pas encore testés directement — toujours largement au-dessus du seuil CI de 70% sur les 4 métriques). Rien de commité.

### 2026-09-20 — Module 2 (Catalogue produits) implémenté

BF-06→12 : ajout/modification/suppression de produit, catégories, recherche, galerie photos, produit en promotion. Le modèle `Product` (`src/models/product/Product.ts`) existait déjà depuis la Phase 0 et couvrait déjà tous les champs nécessaires (`images: string[]`, `isPromo`/`promoPrice`/`promoEnd`) — pas de changement de modèle nécessaire, juste ajout d'un modèle `Category` (`shopId`, `name`).

**Fait :**
- `ProductRepository`/`CategoryRepository` (+ interfaces) et `ProductService`/`CategoryService`, mêmes patterns que le Module 1.
- **Recherche (BF-10)** : filtrage en mémoire côté client (`ProductService.search`) sur nom/catégorie — pas de moteur de recherche dédié, le catalogue d'une boutique reste petit. À revoir si le catalogue grossit significativement.
- **Photos (BF-11)** : upload vers Cloudinary via une nouvelle route `POST /api/uploads` (Route Handler côté serveur, utilise le SDK `cloudinary` déjà configuré avec la clé secrète — pas de preset "unsigned" à configurer côté dashboard Cloudinary). `ProductImageUploader` gère la galerie (ajout multiple, suppression, aperçus).
  - **⚠️ Limite de sécurité connue :** cette route n'a **aucune vérification d'authentification** côté serveur — impossible de valider un ID token Firebase sans `firebase-admin` (absent du projet) ni lib JWT dédiée (type `jose`). N'importe qui connaissant l'URL peut uploader une image vers le compte Cloudinary du projet (impact limité : consommation de quota/stockage, pas d'accès aux données Firestore qui restent protégées par les règles). À corriger si ça devient un problème réel (ajouter `jose` + vérification du token, ou passer par les Firebase Admin Auth REST API).
- **Promotion (BF-12)** : case à cocher "Produit en promotion" + prix promo + date de fin optionnelle dans le formulaire produit, réutilise les champs déjà présents sur le modèle.
- `next.config.ts` : ajout de `images.remotePatterns` pour autoriser `res.cloudinary.com` (nécessaire pour que `next/image` affiche les photos produits).
- Nouveau composant `Select` dans `src/components/ui/` (même style que `Input`/`Label`).
- **UI** : `/dashboard/products` (liste + recherche + suppression avec confirmation `window.confirm`), `/dashboard/products/new`, `/dashboard/products/[id]/edit`, `/dashboard/categories`. Accessible aux rôles **admin et vendeur** (pas juste admin, contrairement à `/dashboard/shop` et `/dashboard/team`) — cohérent avec `firestore.rules` qui autorisait déjà l'écriture des produits aux deux rôles. Liens "Produits"/"Catégories" ajoutés à `DashboardNav`.
- **`firestore.rules`** : la règle `products` était déjà là (Phase 0) mais **pas scopée par boutique** — n'importe quel admin/vendeur, même d'une autre boutique, pouvait écrire sur n'importe quel produit. Corrigé sur le même modèle que `users` (BF-03) : `shopId` du document doit correspondre à celui de l'utilisateur. Nouvelle règle `categories` ajoutée avec la même logique.
- Tests : `product.test.ts` (schéma Zod, y compris le refine prix promo < prix normal), `ProductService.test.ts` (recherche + délégation CRUD), `CategoryService.test.ts`.

**Note technique react-hook-form + zod v4 :** `ProductSchema` utilise `z.coerce.number()` pour les champs numériques (les `<input type="number">` renvoient des chaînes). Ça casse le typage de `useForm<ProductInput>` avec `@hookform/resolvers/zod` (le type d'entrée du formulaire diffère du type de sortie après coercion). Fixé avec la signature à 3 génériques de RHF 7.55+ : `useForm<ProductFormValues, unknown, ProductInput>` où `ProductFormValues = z.input<...>` et `ProductInput = z.output<...>`.

**⚠️ Règles Firestore à déployer :** comme pour BF-03, les nouvelles règles `products`/`categories` sont dans le fichier local mais **pas encore publiées** sur la console Firebase — il faut refaire le copier-coller habituel dans l'onglet Règles avant de tester la création de produits en réel.

`npm run lint`, `npm run build` et `npm run test:coverage` passent (64 tests). Rien de commité.

### 2026-09-21 — Correction de la faille sur `/api/uploads`

La route d'upload d'images (Module 2, BF-11) n'avait aucune vérification d'authentification. Corrigé sans `firebase-admin` (absent du projet) :

- Ajout de `jose` (dépendance directe) et `src/lib/verifyIdToken.ts` : vérifie la signature RS256 du token Firebase Auth contre le JWKS public de Google (`securetoken@system.gserviceaccount.com`), plus `issuer`/`audience` (project ID). C'est l'approche documentée par Firebase pour les runtimes sans Admin SDK.
- `src/app/api/uploads/route.ts` exige désormais un header `Authorization: Bearer <idToken>` et répond `401` si absent/invalide/expiré.
- `src/lib/upload.ts` récupère le token du `currentUser` Firebase (`getIdToken()`) et l'attache à la requête.
- Tests : `verifyIdToken.test.ts` (6 cas, mock de `jose`, 100% de couverture).

**Limite restante :** ça vérifie qu'un utilisateur Firebase valide du projet est connecté, pas qu'il a le rôle admin/vendeur — une vérification de rôle stricte demanderait un appel Firestore côté serveur (REST API + compte de service, ou `firebase-admin`), hors scope pour l'instant. Le risque résiduel est faible : au pire un client authentifié consomme du quota Cloudinary, mais ne peut toujours pas écrire dans Firestore (protégé séparément par `firestore.rules`).

`npm run lint`, `npm run build` et `npm run test:coverage` passent (70 tests). Rien de commité.

### 2026-09-21 — Refonte visuelle de `/login` + 4 nouvelles méthodes de connexion

L'utilisateur a fourni une maquette (deux captures) pour l'écran de connexion : panneau à deux volets (marketing à gauche, formulaire à droite), onglets Email/Téléphone, case "Se souvenir de moi", boutons Google/Facebook/Anonyme. Question posée à l'utilisateur sur le niveau de finition (visuel seulement vs. fonctionnel) → réponse : **tout rendre fonctionnel**.

**UI :**
- `src/app/(auth)/layout.tsx` refondu : fond sombre (`PageBackground` + `bg-slate-950`), en-tête avec logo à gauche et "Retour à l'accueil" à droite. Le mode sombre du design system est activé par une classe `.dark` sur un ancêtre (pas par la préférence système, voir `@custom-variant dark` dans `globals.css`) — appliquée sur tout le layout `(auth)`, donc `/register` et `/forgot-password` en héritent aussi automatiquement (ils utilisent déjà des tokens sémantiques, pas de couleurs codées en dur).
- `/login` reconstruit avec `LiquidGlassCard` (composant "verre liquide" déjà utilisé sur la landing page). **Piège rencontré :** `LiquidGlassCard` enveloppe ses enfants dans son propre `<div>` interne (pour la couche du blob qui suit le curseur) — mettre les classes `grid`/`grid-cols-2` directement sur le `className` du `LiquidGlassCard` n'a donc aucun effet, il faut les poser sur un `<div>` enfant à l'intérieur. Repéré par une capture d'écran Playwright où les deux colonnes s'empilaient verticalement au lieu de se répartir côte à côte — corrigé, revérifié par une deuxième capture (desktop 1440px et mobile 390px) qui matche fidèlement la maquette.
- Icônes de marque (`src/components/icons/BrandIcons.tsx`) : `lucide-react` n'inclut plus les logos de marques (Google/Facebook), donc SVG inline pour ces deux-là ; `Ghost` de lucide pour "Anonyme".

**`AuthService` (`src/services/AuthService.ts`) :**
- `loginWithGoogle()`/`loginWithFacebook()` : `signInWithPopup` + provider correspondant.
- `loginAnonymously()` : `signInAnonymously`.
- `startPhoneSignIn(phone, verifier)`/`confirmPhoneCode(confirmation, code)` : flow SMS OTP à deux étapes. Le `RecaptchaVerifier` est créé dans `LoginForm` (nécessite le DOM, `<div id="recaptcha-container">` invisible) et recréé à chaque tentative plutôt que mis en cache dans un ref (plus simple, et Firebase recommande un verifier neuf après un échec).
- `setRememberMe(bool)` : bascule `browserLocalPersistence`/`browserSessionPersistence` — à appeler avant `login`/`loginWith*`.
- **Nouveau : `completeMerchantSignup({ displayName, shopName })`** — termine la création du compte gérant pour l'utilisateur Firebase **déjà connecté** (après Google/Facebook/téléphone/anonyme, qui n'ont pas de nom de boutique à donner au moment de l'auth). `registerShopOwner` (email) et cette méthode partagent maintenant un helper privé `createShopOwnerProfile`.
- `User.email` est devenu **optionnel** (`src/models/user/User.ts`) : un compte créé par téléphone ou anonymement n'a pas d'email. `TeamList` retombe sur `phone` si `email` est absent.

**Nouveau flux d'onboarding (`/onboarding`, `src/components/auth/OnboardingForm.tsx`) :** après une connexion Google/Facebook/téléphone/anonyme, si aucun profil Firestore n'existe encore pour cet utilisateur (première connexion), il est redirigé ici pour donner son nom + le nom de sa boutique, plutôt que d'atterrir dans un dashboard cassé sans `shopId`.

**Bug corrigé dans `ProtectedRoute` :** le garde ne redirigeait vers `/login` que si `firebaseUser` était absent, mais si `firebaseUser` existait sans `profile` (uid Firebase valide sans doc Firestore — exactement le cas d'un premier login social/téléphone/anonyme), la vérification de rôle (`allowedRoles && profile && ...`) était **silencieusement court-circuitée** (profile est `null`, donc la condition est fausse) et laissait passer l'utilisateur dans des pages réservées à un rôle sans qu'aucun rôle ne soit vérifiable. Corrigé : `profile === null` redirige maintenant explicitement vers `/onboarding`.

**⚠️ Actions requises dans la console Firebase avant que ça fonctionne en réel** (Authentication → Sign-in method) :
1. **Google** : activer, rien d'autre à configurer (Firebase gère tout).
2. **Anonyme** : activer, un clic.
3. **Téléphone** : activer. Le plan gratuit (Spark) suffit pour tester (quota limité) ; au-delà il faut le plan Blaze pour l'envoi de SMS en volume.
4. **Facebook** : plus impliqué — créer une app sur [developers.facebook.com](https://developers.facebook.com), récupérer son App ID + App Secret, les coller dans Firebase Console, puis configurer l'URI de redirection OAuth `https://<project-id>.firebaseapp.com/__/auth/handler` dans les paramètres de l'app Meta. Je peux détailler étape par étape si besoin.

**Non fait :** `/register` et `/forgot-password` n'ont pas été redessinés (la maquette fournie ne couvrait que `/login`) — ils héritent du nouveau fond sombre via le layout partagé mais gardent leur mise en page simple d'origine. À revoir si des maquettes équivalentes arrivent pour ces écrans.

Tests ajoutés : `AuthService.test.ts` (+11 cas sur les nouvelles méthodes), `auth.test.ts` (+7 cas sur les nouveaux schémas). Vérifié visuellement avec Playwright (capture desktop + mobile, aucune erreur console). `npm run lint`, `npm run build` et `npm run test:coverage` passent (86 tests, couverture 81.87/84.04/77.52/83.45 stmts/branch/funcs/lines — la couverture fonctions était tombée sous le seuil CI de 70% juste après l'ajout des nouvelles méthodes, remontée à 77.52% après les tests). Rien de commité.

**Prochaine étape :** Module 3 — Gestion du Stock (BF-13→17), ou poursuivre la refonte visuelle si d'autres maquettes arrivent.

### 2026-09-21 — Page catalogue publique (Module 7 anticipé, BF-36/38/39)

L'utilisateur a fourni une maquette (3 captures) pour une page "Catalogue" **publique** (client, pas dashboard admin) : header avec nav Accueil/Catalogue/Promotions + notifications/profil/panier, hero, filtres par catégorie, recherche, tri, grille de produits avec badges, bannière promo. Ça correspond au Module 7 (Vitrine publique), prévu plus tard dans le plan de travail, mais l'utilisateur a voulu avancer dessus maintenant — logique puisque le Module 2 (catalogue admin) est déjà en place.

**Question posée avant de commencer :** le cahier des charges (BF-39) prévoit un bouton "Commander via WhatsApp" par produit (pas de panier), mais la maquette montre un vrai panier avec badge. Réponse retenue : **panier local (persisté navigateur) + WhatsApp au moment du checkout** — concilie la maquette et le BF-39 sans construire un module de paiement/commandes.

**Nouveau :**
- **`src/store/cartStore.ts`** — premier usage de Zustand dans le projet (déjà en dépendance, jamais utilisé). Panier persisté en `localStorage` (`persist` middleware). **Piège d'hydratation évité** (même famille de bug que `ScrollReveal` plus tôt dans la session) : un visiteur revenant avec un panier non vide aurait un state serveur (vide) différent du premier rendu client (rempli) une fois `persist` réhydraté. `useCartItemCount()` renvoie toujours `0` avant le montage, peu importe le contenu réel du panier, pour que le premier rendu client soit identique au HTML serveur.
- **`src/lib/whatsapp.ts`** — construit un lien `wa.me/<numéro>?text=<message>` récapitulant le panier (articles, quantités, total), en utilisant le `whatsapp` de la boutique (déjà dans le modèle `Shop` depuis le Module 1).
- **`ProductService.getBadge(product)`** — badge affiché sur la vitrine, dérivé de données réelles seulement : `-X%` si en promo (calculé depuis `price`/`promoPrice`), `Nouveau` si créé il y a moins de 14 jours, sinon rien. **Volontairement pas de "Populaire"/"Coup de cœur"/"Édition limitée"** comme dans la maquette : le modèle `Product` n'a aucun champ pour ça, et je ne voulais pas fabriquer de faux signaux marketing.
- **`ShopRepository.getFirst()` / `ShopService.getPrimaryShop()`** — le projet est mono-tenant pour l'instant (un déploiement = une boutique) ; la vitrine publique n'a pas de `shopId` à disposition, donc elle prend la première (et normalement unique) boutique trouvée.
- **UI** : nouveau groupe de routes `src/app/(storefront)/` avec son propre layout (header clair `StorefrontHeader`, distinct du header sombre de la landing page et du header admin `DashboardNav`) et `/catalogue` (`CataloguePageContent`) : filtres par catégorie (réel, via `CategoryService`), recherche (réutilise `ProductService.search` du Module 2), tri (nouveauté/prix), panier ouvrable depuis l'icône du header (`CartPanel`).
- Le lien nav "Promotions" pointe vers `/catalogue?promo=1` (filtre les produits en promo) plutôt que vers une page dédiée — aucune maquette fournie pour une page Promotions séparée pour l'instant.
- Icônes de marque manquantes dans `lucide-react` déjà contournées pour Google/Facebook (session précédente) ; réutilisées ici si besoin plus tard pour la fiche produit.

**Non fait (hors scope de la maquette fournie) :**
- Fiche produit détaillée (BF-37) — pas de maquette fournie, à faire séparément.
- Bannière promo avec code ("BIENVENUE20" dans la maquette) — pas implémentée : nécessiterait un vrai module Promotions (Module 6, pas commencé) pour ne pas afficher un code qui ne fonctionne pas réellement.
- Mode hors ligne (BF-40, PWA) — pas testé spécifiquement pour cette page.
- Cœur "favoris" sur chaque carte produit : purement visuel (état local, non persisté) — pas de backend "wishlist".

Vérifié visuellement avec Playwright (desktop 1440px, mobile 390px, ouverture du panier, aucune erreur console) contre le vrai projet Firebase connecté — affiche "Boutique introuvable" car aucune boutique n'existe encore dans les données réelles (état attendu, pas un bug : il faut qu'un compte gérant soit créé via `/register` ou l'onboarding social pour qu'une boutique existe).

Tests ajoutés : `cartStore.test.ts`, `whatsapp.test.ts`, `ShopService.test.ts` (nouveau), `ProductService.test.ts` (+5 cas sur `getBadge`). `npm run lint`, `npm run build` et `npm run test:coverage` passent (108 tests, couverture 83.72/83.76/82.35/85.16 stmts/branch/funcs/lines). Rien de commité.

**Prochaine étape :** Module 3 (Stock) ou Module 7 en continuant sur la vitrine publique (fiche produit, page promotions) selon ce que l'utilisateur préfère / les prochaines maquettes.

### 2026-09-21 — Câblage des liens de la landing page vers les vraies pages

Demande explicite : relier les boutons/liens de l'app aux pages réellement construites. Audit de `src/app/page.tsx` et `SiteHeader.tsx` (seuls endroits avec des liens non câblés — `/dashboard`, `/dashboard/*`, `(auth)/*` et `(storefront)/*` étaient déjà correctement liés en interne depuis leur propre module).

**Contexte clarifié en le relisant** : `docs/01-business-plan.md` confirme que ManuShop **n'est pas** une plateforme SaaS multi-marchands — c'est l'app d'**une seule boutique physique** en train de se digitaliser. Donc la landing page (`/`) et le catalogue public (`/catalogue`) parlent bien de **la même boutique** : ça a du sens de faire pointer "Boutique" vers le vrai catalogue plutôt que vers la section de démo à données codées en dur.

**`SiteHeader.tsx` :**
- "Se connecter" (desktop + mobile) : `href="#connexion"` (ancre morte, aucune section `id="connexion"` n'existe) → `/login`.
- Icône panier : `href="#boutique"` (scrollait vers la section démo) → `/catalogue` (le vrai panier vit là).
- Lien nav "Boutique" (desktop + mobile) : `#boutique` → `/catalogue`.
- Recherche du header : scrollait vers la section démo → redirige maintenant vers `/catalogue?q=<terme>` ; `CataloguePageContent` lit ce paramètre au montage pour pré-remplir la recherche (même mécanisme que `?promo=1` de la session précédente).
- "Fonctionnalités"/"À propos" **non touchés** : ce sont de vraies ancres vers des sections de la page, pas des pages à part.

**`page.tsx`** : CTA "Découvrir la boutique" → `/catalogue` (au lieu de `#boutique`).

**`ProductCard.tsx`** (cartes de démo) : le `href` par défaut du bouton "+" pointait vers `#boutique` (rescroll vers sa propre section) → `/catalogue`.

**Effet de bord découvert et corrigé** : une fois la navigation par route ajoutée sur la landing page, Next a signalé `scroll-behavior: smooth` sur `<html>` (déjà présent dans `globals.css` pour les ancres "Fonctionnalités"/"À propos") comme pouvant perturber la restauration du scroll pendant les transitions de route côté client. Ajout de `data-scroll-behavior="smooth"` sur `<html>` dans `src/app/layout.tsx`, comme recommandé par le message d'avertissement — vérifié disparu après coup.

**Tests mis à jour** : `SiteHeader.test.tsx` et `page.test.tsx` utilisaient `useRouter()` sans mock (fonctionnait tant qu'il n'était pas appelé) — `useRouter()` de `next/navigation` lève une erreur ("invariant expected app router to be mounted") hors d'un vrai contexte de routeur Next, donc mock ajouté dans les deux fichiers. Les tests qui vérifiaient l'ancien comportement de scroll (`scrollIntoView`) ont été réécrits pour vérifier la navigation réelle (`router.push` appelé avec la bonne URL).

Vérifié avec Playwright : clic sur "Se connecter" → `/login`, clic sur le panier → `/catalogue`, recherche "wax" + Entrée → `/catalogue?q=wax`, aucune erreur/avertissement console après le correctif `data-scroll-behavior`.

`npm run lint`, `npm run build` et `npm run test:coverage` passent (110 tests, couverture 83.93/84.03/82.5/85.38 stmts/branch/funcs/lines). Rien de commité.

### 2026-09-21 — Correction de lisibilité sur register/forgot-password/onboarding

L'utilisateur a repartagé la maquette de login en demandant explicitement que login **et register** soient lisibles en respectant le design. Capture d'écran avant modification pour vérifier : `/register` et `/forgot-password` n'avaient **aucune carte en arrière-plan** — juste du texte et des champs flottant directement sur l'illustration du fond (`PageBackground`), quasi illisibles (labels et titres qui se fondent dans l'image). `/onboarding` avait le même problème, en pire : cette page n'était même pas dans le groupe de routes `(auth)`, donc elle n'héritait ni du fond sombre ni du `LiquidGlassCard`.

**Corrigé :**
- `/register` : reconstruite avec le même panneau à deux volets que `/login` (`LiquidGlassCard`, panneau marketing à gauche avec badge "Nouvelle boutique", formulaire à droite).
- `/forgot-password` et `/onboarding` : carte `LiquidGlassCard` centrée simple (pas de panneau marketing, juste un formulaire court — inutile de dupliquer le volet gauche pour une seule question).
- `/onboarding` déplacée de `src/app/onboarding/` vers `src/app/(auth)/onboarding/` pour hériter du layout sombre partagé (fond, en-tête) — les groupes de routes `(auth)` n'ajoutent pas de segment d'URL donc `/onboarding` reste identique. L'ancien fichier supprimé pour éviter un conflit de route (next aurait vu deux `page.tsx` pour la même URL).

Vérifié avec Playwright (desktop 1440px + mobile 390px pour register, desktop pour forgot-password) : les deux sont maintenant aussi lisibles que `/login`, aucune erreur console. `/onboarding` non vérifiable visuellement sans session authentifiée réelle, mais suit exactement le même patron que `/forgot-password` (déjà vérifié) et compile sans erreur.

`npm run lint`, `npm run build` et `npm run test:coverage` passent (110 tests, aucune régression). Rien de commité.

### 2026-09-21 — Trois bugs d'authentification signalés par l'utilisateur

Signalés ensemble : (1) la photo de profil Google n'est jamais reprise, (2) impossible de se déconnecter, (3) après connexion, la création de boutique boucle indéfiniment sans jamais atteindre le dashboard.

**Cause racine commune de (2) et (3)** : `AuthProvider` ne recharge `profile` que dans le callback `onAuthStateChanged`, qui ne se déclenche qu'à la connexion/déconnexion — jamais quand le document Firestore `users/{uid}` est créé pendant une session déjà active. Séquence du bug : connexion Google → pas de profil Firestore → `ProtectedRoute` renvoie vers `/onboarding` → `OnboardingForm` crée le profil + la boutique avec succès → `router.push("/dashboard")` → mais le contexte d'auth garde toujours `profile === null` (jamais rafraîchi) → `ProtectedRoute` renvoie de nouveau vers `/onboarding`, qui se réaffiche comme si rien n'avait été fait → boucle. Le même problème touchait `RegisterForm` (inscription email/mot de passe) de façon identique. Et puisque la boucle empêche d'atteindre toute page du dashboard, le bouton "Déconnexion" de `DashboardNav` n'est jamais accessible — d'où (2), qui n'était pas un bug de `logout()` lui-même (qui fonctionne) mais une conséquence de (3).

**Corrigé :**
- `AuthProvider` expose désormais `refreshProfile()`, qui relit le profil Firestore de `auth.currentUser` (pas le `firebaseUser` du state React, qui peut être encore obsolète juste après une création de compte) et met à jour le contexte.
- `RegisterForm` et `OnboardingForm` appellent `refreshProfile()` juste après la création du profil, avant `router.push("/dashboard")`.
- Échappatoire défensive ajoutée sur `/onboarding` : un lien "Se déconnecter" (jusque-là, un utilisateur bloqué là pour une autre raison — ex. échec réseau pendant la création de la boutique — n'avait strictement aucun moyen de sortir sans vider ses cookies).

**Photo de profil (1)** : `User.photoURL` (nouveau champ optionnel) capturé depuis `firebaseUser.photoURL` dans `AuthService.completeMerchantSignup` (chemin Google/Facebook/téléphone/anonyme — le seul qui a une vraie photo). Affichée dans `DashboardNav` (avatar rond, ou initiale du nom en repli). `next.config.ts` : ajout de `lh3.googleusercontent.com` et `platform-lookaside.fbsbx.com` aux `remotePatterns` pour que `next/image` puisse charger ces photos sans `unoptimized`.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (17 routes) et `npm run test:coverage` (110 tests, aucune régression) passent tous. Pas de test end-to-end possible pour la boucle elle-même (nécessiterait un vrai compte Google OAuth), mais la cause a été tracée avec certitude dans le code — `profile` ne pouvait objectivement pas se mettre à jour avant ce correctif. Rien de commité.

### 2026-09-21 — Garde `GuestRoute` + page `/erreur` à codes

Demande : empêcher un utilisateur déjà authentifié d'accéder aux pages réservées aux visiteurs (login, register, forgot-password), et gérer une page dédiée avec un code d'erreur pour chaque cas de redirection.

**Ajouté :**
- `src/app/(auth)/erreur/page.tsx` — page unique, lit `?code=` via `window.location.search` (pas `useSearchParams()`, même choix que `CataloguePageContent` : évite d'imposer un `Suspense` boundary pour une page statique). Trois codes gérés, chacun avec icône/titre/message/bouton d'action dédiés :
  - `401` — non connecté → "Se connecter" (`/login`)
  - `403` — connecté mais rôle non autorisé → "Retour au tableau de bord" (`/dashboard`)
  - `already-authenticated` — connecté visitant une page invité → "Aller au tableau de bord" (`/dashboard`)
  - code absent/inconnu → message générique de repli, pas d'erreur JS.
- `src/components/auth/GuestRoute.tsx` — inverse de `ProtectedRoute`. Utilisateur authentifié avec profil → redirigé vers `/erreur?code=already-authenticated` ; authentifié mais onboarding pas terminé → redirigé directement vers `/onboarding` (pas une erreur, juste la suite du parcours) ; sinon laissé passer. Appliqué sur `/login`, `/register`, `/forgot-password`.
- `ProtectedRoute` redirige maintenant vers `/erreur?code=401` (non connecté) et `/erreur?code=403` (rôle refusé) au lieu de renvoyer silencieusement vers `/login`/`/dashboard`.

**Bug annexe trouvé et corrigé au passage** : le bouton d'action de `/erreur` (`Button render={<Link .../>}`) déclenchait un avertissement console Base UI ("expected a native <button>... set `nativeButton` to `false`") — corrigé avec `nativeButton={false}`. Le même pattern sans ce correctif existe déjà dans `ProductList.tsx` (préexistant, hors scope de cette demande, non corrigé).

Vérifié avec Playwright : les 3 codes + cas par défaut affichent le bon message/bouton, aucune erreur console après le correctif Base UI, `/login` reste accessible normalement pour un visiteur non connecté. `npm run lint`, `npx tsc --noEmit`, `npm run build` (18 routes) et `npm run test:coverage` (110 tests, aucune régression) passent tous. Le blocage réel pour un utilisateur déjà connecté (redirection depuis `/login`) n'a pas pu être testé de bout en bout sans session Firebase authentifiée réelle, mais suit exactement le même patron déjà vérifié pour `ProtectedRoute`. Rien de commité.

**Correction du même avertissement ailleurs, signalé par l'utilisateur dans `/dashboard/products`** : `ProductList.tsx` (boutons "Nouveau produit" et "Modifier") et `CartPanel.tsx` (bouton "Commander via WhatsApp") utilisaient le même pattern `<Button render={<Link/>}>`/`<Button render={<a/>}>`. En lisant la doc Base UI (`node_modules/@base-ui/react/docs/react/components/button.md`), `nativeButton={false}` n'est en fait pas la bonne réponse pour un lien : la doc dit explicitement qu'un `<a>` a sa propre sémantique et ne doit **pas** être rendu comme bouton via `render`, quelle que soit la valeur de `nativeButton` — la doc recommande de styler directement l'élément lien avec les classes du bouton. Remplacé les 4 occurrences (dont celle de `/erreur` ci-dessus) par `<Link className={buttonVariants({...})}>` (ou `<a>` pour le lien WhatsApp externe), en gardant un vrai `<button disabled>` dans `CartPanel` pour le cas où la boutique n'est pas encore chargée (pas de lien valide à proposer). `buttonVariants` était déjà exporté par `button.tsx` mais jamais utilisé jusque-là.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (18 routes) et `npm run test:coverage` (110 tests, aucune régression) passent tous. Playwright sur le serveur `next dev` déjà lancé par l'utilisateur (port 3000, réutilisé tel quel plutôt que d'en démarrer un second) : `/erreur`, `/catalogue` (panier ouvert) et `/dashboard/products` (redirection non connecté) sans aucune erreur ni avertissement console. Rien de commité.

### 2026-09-21 — Refonte du dashboard admin/vendeur (maquette sidebar + topbar)

L'utilisateur a fourni une maquette (2 captures : au chargement + après scroll) d'un dashboard admin classique : sidebar gauche (logo, "Menu principal" avec Dashboard/Produits/Commandes/Clients, "Configuration" avec Statistiques/Paramètres), topbar (breadcrumb boutique, notifications, avatar+nom+rôle), salutation avec date du jour, 4 cartes statistiques, table "Catalogue produits" (recherche + filtre catégorie + colonnes Produit/Catégorie/Prix/Stock/Statut/Actions), puis "Ventes récentes" + carte sombre "Conseil du jour". Demande explicite : responsive sur toutes les pages désormais, pas seulement celle-ci.

**Décision prise sans redemander** (cohérente avec le principe déjà établi ailleurs dans le projet — voir `ProductService.getBadge` — de ne jamais fabriquer de données) : les stats qui dépendent de modules pas encore construits (Commandes, Clients, Ventes) affichent "Bientôt" plutôt que des chiffres inventés comme sur la maquette (284 500 FCFA, 42 commandes, etc.). Seule "Produits actifs" est une vraie donnée (comptage réel des produits de la boutique). Idem pour "Ventes récentes" (état vide honnête) et "Conseil du jour" (recalculé à partir du vrai stock : nombre de produits en `low-stock`/`out-of-stock`, pas un "3" en dur).

**Ajouté :**
- `DashboardSidebar.tsx` — nav complète, lien actif surligné (`usePathname`), section "Configuration" filtrée par rôle (Paramètres/Équipe = admin seulement, comme avant). "Équipe" ajoutée en plus de la maquette (absente de celle-ci mais fonctionnalité BF-03 existante à ne pas perdre — l'utilisateur avait déjà dit "tu peux ajuster selon le contexte" pour une maquette précédente).
- `DashboardTopbar.tsx` — breadcrumb avec le vrai nom de la boutique (`useShop`), avatar réel (`profile.photoURL`, la même donnée ajoutée plus tôt pour Google/Facebook), menu déroulant avec déconnexion. Cloche de notifications gardée à l'identique visuellement mais désactivée (`disabled`, `title="bientôt disponible"`) — aucun système de notifications n'existe, mieux vaut l'assumer visuellement que de fabriquer un lien mort.
- `DashboardHomeContent.tsx` — salutation, 4 cartes stats, table produits intégrée, sections Ventes récentes / Conseil du jour.
- `ProductService.getStockStatus()` (+ tests) — dérive `in-stock`/`low-stock`/`out-of-stock` de `stock`/`stockThreshold`, réutilisé à la fois par le badge Statut de la table et par le calcul du Conseil du jour.
- `ProductList.tsx` reconstruite en vraie table (colonnes de la maquette), ajout d'un filtre catégorie (`Select`) en plus de la recherche existante ; réutilisée telle quelle sur `/dashboard/products` (via `ProductsPageContent`, qui charge maintenant aussi les catégories) et intégrée dans le dashboard — un seul composant, pas de duplication.
- Pages stub `/dashboard/orders`, `/dashboard/clients`, `/dashboard/stats` (`ComingSoonCard` partagée) : la sidebar ne pointe plus vers des liens morts, conformément à la préférence déjà exprimée par l'utilisateur ("chaque bouton/lien doit mener à une vraie page").
- `src/app/dashboard/layout.tsx` refondu : sidebar fixe en `md:` et plus, tiroir mobile (overlay + panneau coulissant) en dessous, remplace l'ancienne barre `DashboardNav` (supprimée).

**Non touché (hors scope de cette demande)** : `/dashboard/shop`, `/dashboard/team`, `/dashboard/products/new` et `/dashboard/products/[id]/edit` gardent leur ancienne mise en page simple (formulaire centré) — pas dans la maquette fournie, laissés tels quels pour ne pas élargir le scope sans le demander.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes) et `npm run test:coverage` (113 tests, +3 pour `getStockStatus`, aucune régression) passent tous. Playwright (desktop 1440px + mobile 390px) confirme que `/dashboard` non connecté redirige proprement vers `/erreur?code=401` sans erreur console sur les deux formats — la vue authentifiée elle-même n'a pas été capturée en screenshot : je n'ai pas voulu créer un compte Firebase jetable pour éviter d'écrire des données de test dans le vrai projet Firebase de l'utilisateur (déjà connecté sur son propre serveur `next dev` local). Demandé à l'utilisateur de vérifier visuellement sur sa session déjà active. Rien de commité.

### 2026-09-21 — Recadrage carré obligatoire des photos produit (`react-easy-crop`)

Demande : ajouter une librairie de recadrage/rognage d'image, pour forcer toutes les photos produit à la même taille — celle attendue par l'affichage en carte.

**Taille choisie** : carré 1000×1000. `StorefrontProductCard` et la nouvelle table `ProductList` affichent toutes les deux les photos en `aspect-square` + `object-cover` — c'est la seule taille qui compte, donc un carré. 1000px couvre confortablement le plus grand affichage réel (`StorefrontProductCard` : jusqu'à `33vw` sur un écran large) sans peser inutilement lourd pour une photo de catalogue.

**Ajouté :**
- `react-easy-crop` (6.2.3) — zoom/déplacement tactile et souris, aspect verrouillé à 1:1, aucune CSS à importer (auto-injectée).
- `src/lib/imageCrop.ts` — `cropImageToSquare(imageSrc, crop, size)` : dessine la zone recadrée sur un `<canvas>` 1000×1000 et encode en JPEG (qualité 0.9).
- `src/components/ui/dialog.tsx` — wrapper Tailwind de `@base-ui/react/dialog` (première utilisation dans le projet), même convention que `button.tsx`/`select.tsx`.
- `src/components/dashboard/ImageCropDialog.tsx` — dialogue contrôlé (`open`/`onOpenChange`), slider de zoom, aperçu carré.
- `ProductImageUploader.tsx` réécrit : la sélection de fichiers (potentiellement plusieurs) alimente une file d'object URLs ; chacune passe par le dialogue de recadrage avant d'être uploadée (une à la fois), au lieu d'être envoyée brute comme avant.
- `uploadProductImage()` (`src/lib/upload.ts`) élargi de `File` à `Blob` (le recadrage canvas produit un `Blob` sans nom) — `formData.append("file", blob, "product-image.jpg")` : le 3ᵉ argument est nécessaire pour que `/api/uploads` (qui vérifie `instanceof File`) accepte le blob converti.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (113 tests, aucune régression) passent tous. Pas de test unitaire pour `cropImageToSquare` (manipule `<canvas>`/`Image`, pas raisonnablement testable sous jsdom sans mock lourd pour peu de valeur — même exemption déjà appliquée à `RecaptchaVerifier`/Cloudinary ailleurs dans le projet). Vérification visuelle du dialogue de recadrage lui-même non faite : `/dashboard/products/new` nécessite une session authentifiée que je n'ai pas voulu simuler avec un compte Firebase jetable (même raison que l'entrée précédente). Demandé à l'utilisateur de tester en conditions réelles sur sa session déjà active. Rien de commité.

### 2026-09-21 — Refonte de `/dashboard/categories` (maquette) + bascule affichée/masquée

L'utilisateur a fourni une maquette (2 captures) pour la page de création de catégories : en-tête ("Configuration du catalogue" / "Catégories produits"), formulaire à gauche avec bulles d'aide "?" sur chaque champ, deux cartes d'info à droite ("Pourquoi créer des catégories ?" / "Conseils pour débuter"), et une liste "Vos catégories" en bas avec état vide illustré. Demandes explicites : (1) des indications pour débutants sur le but de chaque champ, (2) la possibilité d'afficher/désactiver une catégorie plutôt que seulement la supprimer.

**Catégorie enrichie** — `Category` gagne `description?` et `isActive?` (optionnels dans le modèle : les catégories déjà existantes en Firestore n'ont pas ces champs ; lues avec un repli `?? true` / `?? ""` partout). `CategorySchema` les rend obligatoires côté formulaire de création (description non vide, `isActive` avec défaut `true`).

**Bug de règles Firestore découvert en passant** : `firestore.rules` n'avait **aucune règle `allow update`** pour `categories` — seulement `create`/`read`/`delete`. La bascule affichée/masquée est un `update`, donc elle aurait échoué silencieusement contre les vraies règles Firebase (les tests unitaires ne le voient pas, ils mockent le repository). Règle ajoutée, symétrique à `create`/`delete` (rôle admin/vendeur + même `shopId`). **⚠️ à recoller dans la console Firebase**, comme pour les mises à jour de règles précédentes.

**Ajouté :**
- `ICategoryRepository.update()` / `CategoryRepository.update()` (Firestore `updateDoc`).
- `CategoryService.createCategory()` change de signature (`shopId, {name, description, isActive}` au lieu de `shopId, name`) ; nouvelles méthodes `updateCategory()` et `setCategoryActive()`.
- `src/components/ui/switch.tsx` — wrapper Tailwind de `@base-ui/react/switch` (première utilisation dans le projet), même convention que `button.tsx`/`select.tsx`/`dialog.tsx`.
- `CategoryManager.tsx` entièrement reconstruite : formulaire (nom + description + toggle "Afficher") avec bulles d'aide `FieldHint` (icône `?`, `title` natif — pas de librairie de tooltip pour un simple texte statique), panneau d'info à droite (texte de la maquette repris tel quel), liste des catégories existantes avec toggle affichée/masquée + suppression par ligne, état vide illustré identique à la maquette.
- `ProductForm.tsx` : le `<Select>` catégorie ne propose plus que les catégories actives (`isActive ?? true`) — sauf celle déjà assignée au produit en cours d'édition, pour ne pas la faire disparaître silencieusement si elle a été masquée depuis (cas non couvert par la maquette, ajouté pour ne pas perdre de donnée).

Vérifié : `npm run lint` (1 avertissement React Compiler sur `watch()` de react-hook-form, corrigé en passant à `useWatch` comme le fait déjà `ProductForm`), `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (116 tests, +3, aucune régression) passent tous. Vérification visuelle non faite pour la même raison que les entrées précédentes (session authentifiée requise, pas de compte Firebase jetable créé). Rien de commité — et penser à recoller les règles Firestore mises à jour.

**Correction immédiate** : l'utilisateur a signalé qu'aucun bouton/menu ne menait à `/dashboard/categories` — oubli lors de la refonte de la sidebar (maquette du dashboard) : "Catégories" existait dans l'ancien `DashboardNav` mais n'a pas été repris. Rajoutée dans "Menu principal", juste après "Produits", même rôle (admin+vendeur).

### 2026-09-21 — Brouillon local du formulaire "Nouveau produit" + confirmation de sortie

Demande : en quittant le formulaire d'ajout de produit en cours de remplissage pour faire autre chose dans le dashboard, proposer de sauvegarder les données dans le stockage local ou de les abandonner ; à un retour ultérieur sur la page, reprendre où on s'était arrêté ; vider le brouillon une fois le produit réellement créé.

**Portée retenue** : uniquement le formulaire de **création** (`ProductForm` sans `product`), pas l'édition — c'est ce qui a été demandé littéralement, et mélanger un brouillon d'ajout avec l'édition d'un produit existant serait dangereux (écraserait les vraies données du produit). Egalement : le blocage ne couvre que la navigation interne via les liens de la sidebar (`next/link`) — pas les boutons qui appellent `router.push()` directement (ex. déconnexion), qui restent hors scope. Une actualisation/fermeture d'onglet déclenche l'avertissement natif du navigateur (texte non personnalisable), sans sauvegarde automatique — la sauvegarde reste un choix explicite, pas un autosave silencieux, conformément à la demande.

**Ajouté :**
- `src/lib/productDraft.ts` — `loadProductDraft`/`saveProductDraft`/`clearProductDraft`, clé `localStorage` unique, échoue silencieusement si indisponible (navigation privée, quota). Testé (4 cas, y compris JSON corrompu).
- `src/components/providers/NavigationBlockerProvider.tsx` — implémente le patron officiellement documenté par Next pour ce cas précis (`Link` avec prop `onNavigate`, voir `node_modules/next/dist/docs/.../link.md#blocking-navigation`), étendu avec un vrai dialogue (au lieu d'un `window.confirm`) à 3 choix : **Sauvegarder** / **Abandonner** / **Annuler**. Un formulaire s'enregistre auprès du contexte (`guard(isDirty, {onSave, onDiscard})`) ; un lien intercepté appelle `blockNavigation(href)`, qui n'exécute la navigation qu'après la décision de l'utilisateur.
- Provider branché dans `src/app/dashboard/layout.tsx` (englobe sidebar + contenu, seul point commun entre le formulaire et les liens de nav).
- `DashboardSidebar.tsx` : chaque `NavLink` intercepte sa propre navigation via `onNavigate` si `isDirty`.
- `ProductForm.tsx` (branche création) : restaure un brouillon existant au montage (`reset()` + `setImages()`, bannière "Brouillon restauré"), enregistre son état `isDirty || images.length > 0` auprès du garde à chaque changement, et vide le brouillon après une création réussie.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (120 tests, +4, aucune régression) passent tous. Vérification visuelle non faite pour la même raison que les entrées précédentes (session authentifiée requise). Rien de commité.

### 2026-09-21 — Deux bugs signalés : catégories masquées visibles quand même, brouillon introuvable

L'utilisateur a signalé (1) qu'une catégorie non cochée "afficher" apparaît quand même dans le combo du formulaire produit, et (2) qu'il n'y a nulle part moyen de récupérer un brouillon sauvegardé.

**Méthode** : plutôt que de deviner, écrit des tests ciblés (RTL) pour chaque maillon de la chaîne avant de toucher au code, en environnement isolé — sans session Firebase réelle (toujours refusé de créer un compte jetable dans le vrai projet de l'utilisateur).

- Le filtre `availableCategories` de `ProductForm` exclut bien correctement les catégories `isActive: false` → test au vert, ce maillon n'est pas en cause.
- Le formulaire de création de `CategoryManager` soumet bien correctement `isActive: false` quand le switch est décoché → test au vert (après un polyfill `PointerEvent`, absent de jsdom, sans quoi le clic sur le switch Base UI levait une exception avant même d'atteindre `onCheckedChange` — faux négatif au premier essai).

**Cause racine réelle trouvée : `CategoryRow.handleToggle` n'avait aucune gestion d'erreur.** Si la bascule affichée/masquée d'une catégorie *existante* échoue (le cas le plus probable : la règle Firestore `allow update` ajoutée à la session précédente n'a peut-être pas encore été recollée dans la console Firebase), le `switch` revient simplement à sa position précédente sans aucun message — la catégorie n'est jamais réellement passée à `isActive: false` côté Firestore, donc elle continue logiquement d'apparaître partout, ce qui ressemble à un bug de filtrage alors que c'est un échec d'écriture silencieux.

**Cause racine du brouillon introuvable : la seule façon de sauvegarder était de déclencher la boîte de dialogue via un clic sur un lien de la sidebar** — un déclencheur étroit et peu visible. Le mécanisme de restauration lui-même fonctionne correctement une fois un brouillon réellement présent (prouvé par test), le problème était qu'aucun brouillon n'était jamais créé si l'utilisateur ne passait pas par ce chemin précis.

**Corrigé :**
- `CategoryManager.tsx` : `handleToggle`/`handleDelete` affichent désormais un message d'erreur visible en cas d'échec (`listError`), au lieu de laisser le switch revenir silencieusement en arrière.
- `ProductForm.tsx` (création uniquement) : ajout d'un bouton explicite **"Enregistrer le brouillon"**, toujours visible, qui écrit immédiatement l'état courant du formulaire dans `localStorage` sans dépendre de la tentative de navigation — avec confirmation visuelle temporaire ("Brouillon sauvegardé"). La boîte de dialogue de navigation reste en place en complément, pas en remplacement.
- Tests permanents ajoutés : `ProductForm.test.tsx` (restauration, filtrage catégories, sauvegarde manuelle, purge après création) et `CategoryManager.test.tsx` (soumission du toggle à la création, message d'erreur si la bascule échoue, succès si elle passe).

**⚠️ Action à vérifier côté utilisateur** : si la bascule affichée/masquée d'une catégorie existante échoue encore après ce correctif (le message d'erreur devrait maintenant s'afficher), c'est très probablement que les règles Firestore mises à jour à la session précédente (ajout de `allow update` sur `categories`) n'ont pas été recollées dans la console Firebase.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (127 tests, +7, aucune régression) passent tous. Rien de commité.

### 2026-09-21 — Synchronisation de la documentation (besoins fonctionnels, plan de travail)

Demande : mettre à jour `02-besoins-fonctionnels.md` et `05-plan-de-travail.md` pour que tout ce qui a été ajusté en session (mais jamais noté) apparaisse — terminé, partiel, ou pas commencé — et clarifier la prochaine étape.

**`02-besoins-fonctionnels.md`** :
- BF-09 (Catégories) : description mise à jour pour mentionner la description de catégorie et la bascule affichée/masquée, ajoutées cette session.
- Module 7 (Vitrine publique, BF-35→40) et Module 10 (Dashboard, BF-53→57) — **jamais annotés jusqu'ici alors que largement construits en avance sur l'ordre de travail initial** — chaque besoin marqué terminé/partiel/non commencé avec le détail exact de ce qui manque (fiche produit absente, filtre prix/disponibilité absent, bouton WhatsApp par produit remplacé par un panier + un bouton au paiement, rapports de ventes dépendant du Module 4 pas encore construit, etc.). Note ajoutée en tête de chaque module précisant qu'il a été anticipé hors de l'ordre initial.

**`05-plan-de-travail.md`** :
- Modules 1 et 2 passés à `[x]` avec une note "quasi complet" renvoyant au détail partiel dans `02-besoins-fonctionnels.md` (BF-03, BF-12).
- Modules 7 et 10 passés à `[~]` (partiel, anticipés hors ordre).
- Case Jest/couverture dupliquée et contradictoire (une cochée, une non cochée pour la même tâche) nettoyée en une seule ligne à jour (127 tests, ~84% de couverture).
- Ajout d'une ligne "Prochaine étape" explicite en tête de la Phase 1 : **Module 3 — Stock (BF-13→17), pas commencé**. Les champs `stock`/`stockThreshold` existent déjà sur `Product` (posés au Module 2), mais ni suivi automatique, ni historique de mouvements, ni réapprovisionnement manuel, ni variantes (le modèle `ProductVariant` existe en type mais n'est utilisé nulle part dans le code).

Aucun changement de code dans cette entrée — uniquement de la documentation. Rien de commité.

### 2026-09-21 — Refonte de `/dashboard/shop` en "Paramètres de la boutique" (maquette)

L'utilisateur a fourni une maquette (2 captures) pour la page "Paramètres" : Régionalisation (langue, devise), Publication multicanale (réseau principal + format d'image recommandé), Notifications de commande (3 bascules), Contacts de commande (email, téléphone urgent), avec un panneau "À retenir" et un bouton d'enregistrement unique à droite.

**Décision prise sans redemander** : la maquette ne montre ni nom, ni logo, ni adresse — les champs du "Profil de la boutique" existant (BF-04, déjà en place sur cette même page). Plutôt que de les supprimer, ils ont été conservés comme première section de la page, avant les sections de la maquette — cohérent avec le principe déjà appliqué à "Équipe" (garder une fonctionnalité réelle absente d'une maquette).

**Limites de portée assumées, aucune ne devait être découverte tardivement** :
- **Langue** : le champ est enregistré mais ne change encore rien à l'interface — le projet n'a aucune infrastructure d'internationalisation (prévue en Phase 4 du plan de travail, pas commencée).
- **Devise** : idem, enregistrée mais les prix restent affichés en "FCFA" codé en dur à plusieurs endroits (`ProductForm`, `ProductList`, `CartPanel`, dashboard). Changer la devise ici ne change pas l'affichage ailleurs.
- **Notifications de commande** (email/réseaux/téléphone urgent) : les 3 préférences sont sauvegardées, mais n'ont aujourd'hui rien à déclencher — le Module 4 (Commandes) n'existe pas encore. Un texte sous la section le précise explicitement plutôt que de laisser croire que c'est déjà fonctionnel.
- **Format recommandé** : le texte reste honnête avec ce qui est réellement implémenté — le recadrage carré 1:1 des photos (ajouté plus tôt en session) est déjà systématique quel que soit le réseau choisi, donc le message ne prétend pas s'adapter automatiquement par réseau, seulement le conseil textuel change.

**Ajouté :**
- `Shop` (modèle) : nouveaux champs optionnels `language`, `primarySocialNetwork`, `notifyOrdersByEmail`, `notifyOrdersBySocial`, `urgentPhoneAlerts`, `contactEmail`, `urgentPhone` ; `currency` élargi de la valeur unique `"XAF"` à `string` et rendu modifiable (`UpdateShopDto` l'excluait jusqu'ici).
- `ShopSettingsSchema` (remplace `ShopProfileSchema`) dans `lib/validation/auth.ts`.
- `src/components/dashboard/FieldHint.tsx` — bulle d'aide "?" extraite de `CategoryManager` pour être réutilisée ici (déjà dupliquée mentalement, maintenant partagée pour de vrai).
- `ShopSettingsForm.tsx` (remplace `ShopProfileForm.tsx`) — un seul formulaire, un seul bouton d'enregistrement, 5 sections dans la colonne principale + panneau "À retenir" à droite, repris de la maquette.
- Tests : `ShopSettingsForm.test.tsx` (valeurs par défaut pour une boutique sans paramètres avancés, soumission avec une préférence basculée) et extension de `ShopSettingsSchema` dans `auth.test.ts`.

Aucune règle Firestore à modifier : `shops` s'écrit déjà en bloc par l'admin, sans validation champ par champ.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (131 tests, +4, aucune régression) passent tous. Vérification visuelle non faite pour la même raison que les entrées précédentes (session authentifiée requise, pas de compte Firebase jetable créé) — juste un contrôle que `/dashboard/shop` répond (200) sur le serveur `next dev` déjà lancé par l'utilisateur. Rien de commité.

### 2026-09-21 — Changement de modèle : ManuShop devient une plateforme multi-boutique (documentation uniquement, rien codé)

L'utilisateur a décrit un changement de cap majeur : ManuShop n'est plus une seule boutique digitalisée, mais une plateforme sur laquelle plusieurs commerçants publient chacun leur propre boutique. Un utilisateur connecté sur la plateforme n'est "que" client des boutiques des autres, sauf s'il a lui-même payé pour créer la sienne. Demande explicite : ajuster la documentation et pointer la prochaine étape — pas de code dans cette entrée.

**Ce qui a été décrit et retranscrit fidèlement :**
- Bascule "publier ma boutique" dans Paramètres.
- L'onboarding devient un annuaire des boutiques publiées.
- Chaque boutique publiée a sa propre page d'accueil (vitrine : logo, nom, tous les articles, etc.) et sa propre URL, construite à partir d'un identifiant opaque encodant `ownerId`+`shopId` (pas l'id Firestore brut), suivi du nom de page puis d'un identifiant de contenu précis.
- Un client peut consulter/ajouter au panier/commander, et visiter les pages Facebook/Instagram/TikTok/WhatsApp Business de la boutique — seulement les réseaux réellement renseignés, et seulement pour un article réellement publié dessus.
- Rôle **Super Admin** unique (l'éditeur de la plateforme, l'utilisateur lui-même) : peut retrouver les commerçants ayant payé et leur donner le rôle Admin. Exigence de sécurité explicite : ce rôle Super Admin ne doit **jamais** pouvoir être obtenu via l'application, uniquement en modifiant directement Firestore depuis la console Firebase.

**Deux points laissés ouverts par l'utilisateur, documentés avec une proposition par défaut plutôt que tranchés unilatéralement** (voir `04-besoins-techniques.md` §11.3 et §11.5) : le schéma d'encodage exact du token d'URL, et le mécanisme de vérification du paiement (aucune passerelle de paiement n'existe dans le projet — proposé : vérification manuelle par le Super Admin en v1).

**Documentation mise à jour :**
- `01-business-plan.md` — nouvelle §10 documentant le pivot, sans réécrire les sections existantes (elles restent valables pour comprendre la proposition de valeur *par boutique*).
- `02-besoins-fonctionnels.md` — nouveau Module 12 (BF-62→68).
- `04-besoins-techniques.md` — nouvelle §11 : hiérarchie des rôles (`super-admin` au-dessus d'`admin`, `client` désormais sans `shopId`), modèle `Shop`/`User`/`Product` étendu, schéma d'URL proposé, note explicite sur le verrou de sécurité Super Admin, et la liste de ce qui devra être adapté ailleurs (`useShop()`, storefront, `ProtectedRoute`/`GuestRoute`, `firestore.rules`) puisque tout le code actuel suppose une seule boutique.
- `05-plan-de-travail.md` — nouvelle **Phase 1bis** insérée juste après la Phase 1, avec une checklist dans l'ordre suggéré (le plus isolé d'abord : modèles → règles Firestore → page Super Admin → bascule publication → annuaire → routing multi-tenant → liens réseaux sociaux par article, ce dernier bloqué tant que le Module 8 n'existe pas). Le Module 3 (Stock), pointé comme prochaine étape plus tôt dans la journée, repasse derrière : continuer d'empiler des modules sur l'hypothèse mono-tenant actuelle serait du travail à refaire.

**Prochaine étape : Phase 1bis — Module 12, en commençant par les points les plus isolés** (extension des modèles `User`/`Shop`, règles Firestore pour le verrou Super Admin et la publication) plutôt que par le routing multi-tenant, qui touche large (storefront, auth, dashboard) et mérite que les deux points ouverts soient d'abord confirmés avec l'utilisateur.

Aucun changement de code. Rien de commité.

### 2026-09-21 — Module 12 : modèles étendus + verrou Firestore Super Admin (première tranche)

Suite à "lance la prochaine étape" : les deux premiers points de la checklist Phase 1bis, les plus isolés (extension des modèles, règles Firestore), sans toucher au routing ni à la vitrine.

**Deux failles de sécurité pré-existantes découvertes et corrigées au passage**, pas seulement le verrou super-admin demandé :
1. `firestore.rules` autorisait `allow update: if request.auth.uid == userId;` sur `users` **sans aucune restriction de champ** — n'importe quel utilisateur authentifié pouvait donc déjà s'auto-attribuer `role: 'admin'` (ou pire, `'super-admin'` une fois ce rôle ajouté) directement via le SDK Firestore, en contournant complètement l'app. C'est exactement le trou que la demande de l'utilisateur ("aucun chemin de code ne doit permettre...") visait à empêcher — sauf qu'il existait déjà pour `admin`, pas seulement pour le nouveau rôle.
2. `shops` s'écrivait avec `allow write: if ... role == 'admin'` **sans vérifier que le demandeur est bien le propriétaire de CETTE boutique** — inoffensif en mono-tenant (une seule boutique existe), mais serait devenu un vrai trou dès la première boutique multi-tenant (n'importe quel admin aurait pu modifier la boutique de n'importe quel autre commerçant).

**Corrigé dans `firestore.rules` :**
- `users` : mise à jour de son propre profil autorisée sauf sur `role`/`shopId` (via `diff().affectedKeys()`) ; un `super-admin` peut changer le rôle de n'importe qui, **mais jamais vers `'super-admin'`** — cette dernière contrainte s'applique à toutes les branches (`create` comme `update`), y compris quand c'est un super-admin lui-même qui écrit. Lecture élargie pour qu'un super-admin puisse lister tous les utilisateurs (nécessaire pour la page Super Admin, pas encore construite).
- `shops` : `create` exige `ownerId == request.auth.uid` ; `update`/`delete` exigent que le demandeur soit soit le propriétaire (`resource.data.ownerId`), soit un `super-admin`.

**Décision délibérée, notée pour ne pas être oubliée** : je n'ai **pas** restreint l'auto-création d'un profil avec `role: 'admin'` (BF-01, le flux d'inscription commerçant existant, `AuthService.registerShopOwner`/`completeMerchantSignup`) — la faire dépendre d'une validation Super Admin dès maintenant casserait l'inscription self-service qui fonctionne aujourd'hui, avant que le nouveau parcours "payer puis être promu par le Super Admin" (BF-68) n'existe réellement dans l'app. Ce point reviendra quand la page Super Admin et l'annuaire seront construits.

**Modèles étendus (additifs, rien de cassé) :**
- `UserRole` : ajout de `"super-admin"`.
- `User` : ajout de `hasPaid?: boolean`, commentaire clarifiant que `shopId` reste propre à admin/seller (jamais un client).
- `Shop` : ajout de `isPublished?`, `publicToken?`, `facebookUrl?`, `instagramUrl?`, `tiktokUrl?`, `whatsappBusinessUrl?` — tous optionnels, aucune UI ne les lit/écrit encore.
- `TeamList.tsx` : `ROLE_LABELS` mis à jour (le compilateur a immédiatement signalé l'entrée manquante pour `"super-admin"` — utile).

**Non fait dans cette tranche, volontairement** : pas de restriction de lecture publique conditionnée à `isPublished` sur `shops`/`products`/`categories` — l'appliquer maintenant casserait `/catalogue` (mono-tenant, ne vérifie aucun flag de publication). Ça viendra avec le routing multi-tenant.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (131 tests, aucune régression) passent tous. Pas de test automatisé des règles Firestore elles-mêmes (le projet n'a pas l'infrastructure `@firebase/rules-unit-testing`/émulateur — mettre ça en place serait un chantier à part). Raisonnement fait à la main, ligne par ligne, mais **à vérifier en conditions réelles une fois les nouvelles règles collées dans la console Firebase** — en particulier que l'inscription commerçant (BF-01) fonctionne toujours.

**⚠️ Nouvelles règles Firestore à coller dans la console Firebase** (comme à chaque fois cette session). Rien de commité.

**Prochaine étape : page Super Admin** (liste des utilisateurs avec indicateur `hasPaid`, attribution du rôle admin) — le morceau suivant le plus isolé de la checklist Phase 1bis, puisque les modèles et les règles qui la sous-tendent sont maintenant en place.

### 2026-09-21 — Correction du design Super Admin + inscription qui ne donne plus jamais le rôle admin

L'utilisateur a précisé le flux juste après avoir demandé les règles à coller — heureusement avant qu'il ne les colle, plusieurs choses changent par rapport à l'entrée précédente :

1. **Le Super Admin n'est plus un rôle sur `users`** : c'est désormais l'appartenance à une collection Firestore dédiée `platformAdmins` (id de document = email), remplie uniquement à la main depuis la console Firebase. Conception plus propre que ma première tentative (`role: 'super-admin'`) : aucune ambiguïté possible avec le champ `role` normal, et ça correspond exactement à la demande de l'utilisateur ("je fournis mon adresse mail dans cette collection").
2. **L'inscription ne doit plus jamais créer `role: 'admin'` directement** — j'avais laissé ce chemin ouvert dans l'entrée précédente pour ne pas casser BF-01 tout de suite ; l'utilisateur a tranché explicitement dans l'autre sens.
3. **Devenir admin, deux chemins distincts** : attribution manuelle par le Super Admin (recherche par pseudo/email/téléphone, révocable à tout moment — BF-68), ou abonnement payant avec une durée choisie (quotidien/hebdo/mensuel/trimestriel/annuel — BF-69), qui expire automatiquement et repasse le compte en client, avec redirection vers la vue cliente de sa propre boutique en cas de tentative d'accès au dashboard après expiration (BF-70).

**Code corrigé/réécrit dans la foulée, avant que les anciennes règles ne soient collées :**
- `UserRole` : retour à `'admin' | 'seller' | 'client'` (retrait de `'super-admin'`, qui n'était en place que depuis l'entrée précédente).
- `User` : `hasPaid` remplacé par `adminSource?: 'manual' | 'subscription'`, `subscriptionPlan?: SubscriptionPlan`, `subscriptionExpiresAt?: Timestamp` — plus fidèle au flux réel (une attribution manuelle ne "paie" pas et n'expire pas, un abonnement si).
- `src/models/platform/PlatformAdmin.ts` — nouveau modèle pour la collection `platformAdmins`.
- `firestore.rules` — `platformAdmins/{email}` : lecture réservée à son propre email, **écriture interdite pour tout le monde** (`allow write: if false`). Les vérifications "Super Admin ?" dans `users`/`shops` utilisent maintenant `exists(.../platformAdmins/$(request.auth.token.email))` au lieu de `role == 'super-admin'`. La règle `create` sur `users` n'accepte plus `role` que `'client'` pour une auto-création (l'ancienne version acceptait tout sauf `'super-admin'`). La règle `update` autorise un admin à relier `shopId` à une boutique qu'il vient de créer (`get()` sur `shops` pour vérifier `ownerId`), nécessaire pour la nouvelle méthode `AuthService.createShop()`.
- `AuthService.registerShopOwner`/`completeMerchantSignup` : créent désormais `role: 'client'`, plus de création de boutique à l'inscription. Nouvelle méthode `createShop(shopName)` — crée la boutique et relie `shopId` au profil, utilisable seulement une fois `role === 'admin'` (les règles Firestore l'imposent). Pas encore appelée par aucune UI (pas de formulaire "créer ma boutique" post-promotion construit — hors scope de cette tranche).
- `RegisterForm`/`OnboardingForm` : champ "Nom de la boutique" retiré (il ne sert plus à rien à ce stade) ; redirection post-inscription vers `/catalogue` au lieu de `/dashboard` (un client n'a rien à faire sur le dashboard). Copie des pages `/register` et `/onboarding` ajustée pour ne plus promettre "votre boutique est prête".
- `/dashboard` (layout) : `ProtectedRoute` restreint à `allowedRoles={["admin", "seller"]}` — un client qui y accéderait tombe maintenant proprement sur `/erreur?code=403` au lieu de rester bloqué sur "Chargement..." indéfiniment (`DashboardHomeContent` a besoin de `profile.shopId`, qu'un client n'a jamais).
- `TeamList.tsx` : `ROLE_LABELS` remis à jour (retrait de l'entrée `super-admin`, qui n'a plus de raison d'être puisque ce n'est plus une valeur de `role`).

**Conséquence assumée, à ne pas oublier** : tant que la page Super Admin n'existe pas, plus personne (pas même l'utilisateur en train de développer) ne peut devenir admin autrement qu'en éditant Firestore à la main depuis la console — acceptable en développement actif, la page Super Admin (prochaine étape) résout ça pour de vrai.

Documentation mise à jour en conséquence dans les 4 fichiers (`01-business-plan.md` §10, `02-besoins-fonctionnels.md` Module 12 avec 2 nouveaux besoins BF-69/BF-70, `04-besoins-techniques.md` §11 réécrite, `05-plan-de-travail.md` Phase 1bis).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (21 routes, aucune nouvelle route) et `npm run test:coverage` (135 tests, +4, aucune régression une fois `AuthService.test.ts` et `auth.test.ts` mis à jour pour le nouveau comportement) passent tous.

**⚠️ Nouvelles règles Firestore à coller dans la console Firebase — celles données dans l'entrée précédente sont obsolètes, ne pas les coller.** Redonné à l'utilisateur le fichier complet à jour.

**Prochaine étape, inchangée : page Super Admin** — recherche d'un compte par pseudo/email/téléphone, attribution/révocation du rôle admin, protégée par l'appartenance à `platformAdmins`.

### 2026-09-21 — Page Super Admin construite (BF-68)

L'utilisateur a d'abord demandé un script pour s'ajouter automatiquement dans `platformAdmins` en visitant `/super-user` — refusé : ça contredit directement l'exigence de sécurité qu'il avait lui-même posée deux messages plus tôt ("uniquement via la console Firebase"), et de toute façon la règle `allow write: if false` sur `platformAdmins` aurait rejeté l'écriture même en la tentant. Donné à la place les étapes manuelles exactes (créer le document dans la console, ~30 secondes). Confirmé "oui" pour enchaîner sur la vraie prochaine étape.

**Ajouté :**
- `IUserRepository.listAll()` / `UserRepository.listAll()` — liste tous les utilisateurs, réservé au Super Admin par les règles Firestore posées dans l'entrée précédente (la condition `platformAdmins` ne dépend pas du document ciblé, donc une requête sans filtre est autorisée pour lui).
- `src/repositories/PlatformAdminRepository.ts` (+ interface) — `exists(email)`, lecture seule, `getDoc` sur `platformAdmins/{email en minuscules}`.
- `src/services/PlatformAdminService.ts` — `isSuperAdmin(email)` (toujours `false` sans email : un compte téléphone/anonyme ne peut jamais être Super Admin), `searchUsers(term)` (filtrage en mémoire sur pseudo/email/téléphone, même approche que `ProductService.search` — pas de fetch tant qu'aucun terme n'est saisi), `grantAdmin(userId)` (`role: 'admin'`, `adminSource: 'manual'`), `revokeAdmin(userId)` (`role: 'client'`, les champs `adminSource`/`subscription*` sont laissés tels quels plutôt que nettoyés avec `deleteField()` — jamais lus pour un compte non-admin, seront de toute façon écrasés à la prochaine attribution).
- `AuthProvider` expose désormais `isSuperAdmin` : calculé en parallèle du chargement du profil (`Promise.all`) à chaque changement d'état d'authentification, jamais à partir de `profile.role` (le Super Admin n'en est pas un).
- `src/components/auth/SuperAdminRoute.tsx` — garde de route dédiée (même patron que `ProtectedRoute`/`GuestRoute`, mêmes codes `/erreur`), mais teste `isSuperAdmin` du contexte plutôt qu'un rôle.
- `src/components/super-admin/SuperAdminPanel.tsx` + `src/app/super-admin/page.tsx` — recherche (déclenchée à la soumission, pas à chaque frappe, pour ne pas refaire un `listAll()` par lettre tapée), résultats avec bouton "Donner l'admin"/"Retirer l'admin" (confirmation avant retrait), page autonome hors du layout `/dashboard` (persona différente, aucune pertinence de la sidebar marchande ici).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, +`/super-admin`) et `npm run test:coverage` (146 tests, +11, aucune régression) passent tous. Vérification visuelle non faite pour la même raison que toutes les entrées précédentes (nécessite d'être reconnu Super Admin, donc une session réelle + le document `platformAdmins` que seul l'utilisateur peut créer) — juste un contrôle que la page répond (200) sur le serveur `next dev` déjà lancé. Rien de commité.

**Prochaine étape** : selon la checklist Phase 1bis, soit l'abonnement payant avec expiration automatique (bloqué sur deux points ouverts : moyen de paiement, mécanisme d'expiration côté serveur), soit la bascule "Publier ma boutique" dans Paramètres (BF-62, plus isolée, aucun point ouvert) — probablement plus logique de continuer par cette dernière en attendant que l'utilisateur tranche les points ouverts de l'abonnement.

### 2026-09-21 — Trois bugs trouvés en testant en conditions réelles (inscription, boucle d'erreur, en-têtes non connectées)

L'utilisateur a testé le flux complet (inscription, Super Admin, navigation) et rencontré trois problèmes distincts, diagnostiqués un par un plutôt que corrigés à l'aveugle :

**1. Inscription bloquée par `OPERATION_NOT_ALLOWED`.** Reproduit avec Playwright et un compte jetable (`diagnostic-*@example.com`, jamais créé côté Firebase Auth puisque l'inscription elle-même a été rejetée par Google avant toute écriture Firestore — aucune pollution de données). La requête `identitytoolkit.googleapis.com/v1/accounts:signUp` renvoyait `OPERATION_NOT_ALLOWED` : le fournisseur Email/Mot de passe était désactivé dans la console Firebase (probablement débranché par erreur en activant Google/Facebook/téléphone plus tôt dans la session). Pas un bug de code — réactivé côté utilisateur dans Authentication → Sign-in method.

**2. Boucle infinie entre `/erreur?code=403` et `/dashboard`.** La page `/erreur` n'avait aucune échappatoire : son bouton d'action pour le code 403 pointe vers `/dashboard`, qui renvoie vers `/erreur?code=403` si le rôle ne convient toujours pas — et il n'y avait nulle part où cliquer pour sortir de cette boucle. Corrigé : un lien "Se déconnecter" toujours visible sur `/erreur`, quel que soit le code, tant qu'un `firebaseUser` existe.

**Clarification, pas un bug** : l'utilisateur a cru que devenir Super Admin (ajout dans `platformAdmins`) devait automatiquement changer son `role` sur `users/{uid}`. C'est volontairement séparé (voir l'entrée précédente) — expliqué à nouveau plus explicitement, avec le chemin exact pour se donner le rôle admin depuis `/super-admin`.

**3. L'icône "Mon compte" de la vitrine et le lien "Se connecter" de la landing pointaient vers `/login` sans jamais vérifier si l'utilisateur était déjà connecté** — d'où le rebond systématique vers `/erreur?code=already-authenticated` et l'incompréhension de l'utilisateur ("les informations de l'utilisateur connecté ne s'affichent pas... pourtant j'ai l'option se déconnecter qui prouve que je suis connecté"). Deux endroits concernés, même cause :
- `StorefrontHeader.tsx` (icône profil de `/catalogue`) — remplacée par un `AccountMenu` : lien `/login` si déconnecté, sinon un menu déroulant montrant le nom/email de l'utilisateur, un lien "Tableau de bord" (seulement pour admin/vendeur) et "Se déconnecter".
- `SiteHeader.tsx` (lien "Se connecter" de la landing, desktop et mobile) — devient "Se déconnecter" quand un `firebaseUser` existe, au lieu de continuer à pointer vers `/login`.

Tests mis à jour/ajoutés pour les trois en-têtes affectées (`SiteHeader.test.tsx` : nouveau cas authentifié ; `StorefrontHeader.test.tsx`, nouveau fichier : lien vs menu selon l'état de connexion, lien dashboard conditionné au rôle ; `src/app/page.test.tsx` : mocks `AuthProvider`/`AuthService` ajoutés, cassés par le nouvel import de `useAuth` dans `SiteHeader`).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, aucune nouvelle route) et `npm run test:coverage` (150 tests, +4, aucune régression) passent tous. Rien de commité.

### 2026-09-21 — Formulaire "Créer ma boutique" manquant (le vrai trou du parcours admin manuel)

L'utilisateur a promu son propre compte `role: 'admin'` à la main dans Firestore (suite à l'échange précédent), puis atterri sur `/dashboard/shop` bloqué sur "Chargement..." indéfiniment. Diagnostic : pas un bug de chargement, mais `profile.shopId` légitimement absent — `AuthService.createShop()` existe depuis la refonte de l'inscription (Module 12) mais n'était branché à aucun formulaire. Exactement le trou déjà noté dans `04-besoins-techniques.md` §11.6 ("un formulaire 'créer ma boutique'... pas encore construit"), qui se révèle dès qu'un admin est créé par un chemin autre que l'ancien flux d'inscription mono-tenant.

**Bug annexe trouvé au passage** : `DashboardTopbar` affichait le nom de boutique via `useShop()`/`ShopService.getPrimaryShop()` — "la première boutique de toute la base", sans rapport avec l'utilisateur connecté. C'est ce qui affichait "LOREN IPSUM" (la boutique d'un autre compte de test) dans l'en-tête alors que le compte connecté n'avait pas encore de boutique du tout. Corrigé pour résoudre la boutique via `profile.shopId` du compte réellement connecté.

**Corrigé :**
- `src/components/dashboard/CreateShopPrompt.tsx` — formulaire minimal (nom de la boutique, réutilise `CreateShopSchema` déjà présent dans `lib/validation/auth.ts`), appelle `AuthService.createShop()` puis `refreshProfile()`.
- `src/app/dashboard/layout.tsx` — extrait la coquille (sidebar/topbar/contenu) dans un composant `DashboardShell` qui affiche `CreateShopPrompt` à la place du dashboard normal quand `profile` existe (donc rôle admin/vendeur confirmé par `ProtectedRoute`) mais `profile.shopId` est absent. Corrige ce problème pour **toutes** les pages du dashboard d'un coup (produits, catégories, équipe, paramètres...), pas seulement `/dashboard/shop` où il a été repéré.
- `DashboardTopbar.tsx` : remplace `useShop()` par une résolution directe de `shopService.getShop(profile.shopId)`.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, aucune nouvelle route) et `npm run test:coverage` (150 tests, aucune régression — aucun test n'exerçait `DashboardLayout`/`DashboardTopbar`, donc rien à mettre à jour côté tests). Vérification visuelle non faite (nécessite une session admin réelle) — juste un contrôle que `/dashboard/shop` répond (200). Rien de commité.

### 2026-09-21 — Formatage du téléphone selon le pays sélectionné

Ajout de `libphonenumber-js` et d'un composant `src/components/ui/phone-input.tsx` : sélecteur de pays (liste complète via `getCountries()`, noms en français via `Intl.DisplayNames` — pas de table de correspondance à maintenir à la main) + numéro reformaté en direct pendant la saisie (`AsYouType`) selon le pays choisi. La valeur échangée avec le formulaire reste toujours au format E.164 (`+237600000000`), déjà ce qu'attendaient les schémas existants (`PhoneLoginSchema`, `ShopSettingsSchema`) — aucune migration de données nécessaire.

Composant contrôlé (`value`/`onChange`), pas branché sur `register()` — même convention que `Switch` ailleurs dans le projet pour les champs qui ne sont pas de simples inputs natifs. Un détail technique a demandé un peu plus de soin qu'un champ simple : le composant garde un état interne (`country`/`national`) synchronisé avec la prop `value` UNIQUEMENT quand elle change de source externe (ex. `reset()` au chargement d'une boutique existante) et pas à chaque frappe — sinon, comme `value` est reconstruit après chaque `onChange`, l'effet de resynchronisation entrerait en compétition avec la saisie en cours.

**Branché sur les 4 champs téléphone existants** :
- `LoginForm.tsx` (`PhoneLoginForm`) — connexion par téléphone/OTP.
- `ShopSettingsForm.tsx` — Téléphone, WhatsApp, Téléphone urgent (les 3 champs de la boutique).

Pays par défaut : Cameroun (`CM`), cohérent avec le business plan. Un numéro déjà enregistré (E.164) est correctement re-décomposé en pays + numéro national à l'affichage, quel que soit le pays d'origine — pas seulement le Cameroun.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, aucune nouvelle route) et `npm run test:coverage` (154 tests, +4, aucune régression — `ShopSettingsForm.test.tsx` existant repassé pour confirmer que l'échange de l'`<Input>` contre `<PhoneInput>` ne casse rien). Rien de commité.

### 2026-09-21 — Bug de mise en page sur `PhoneInput` (sélecteur de pays qui écrase le champ numéro)

Signalé par l'utilisateur avec une capture de `/dashboard/shop` : le sélecteur de pays affichait le nom complet du pays ("Cameroun (+237)") sans largeur bornée, ce qui — combiné à la grille à deux colonnes de `ShopSettingsForm` pour Téléphone/WhatsApp — écrasait le champ du numéro à quelques pixels visibles à peine.

**Corrigé dans `phone-input.tsx`** :
- Le `<select>` du pays passe d'une largeur libre (`w-auto`) à une largeur bornée (`w-28 sm:w-36`) avec troncature (`overflow-hidden text-ellipsis whitespace-nowrap`) — un `<select>` natif affiche toujours le texte complet de l'option choisie dans sa boîte fermée, donc sans borne un nom de pays long pousse le reste hors de vue.
- Libellé des options inversé : `+{indicatif} {nom}` au lieu de `{nom} (+{indicatif})`, pour que l'indicatif — l'info la plus utile — reste visible même si le nom est tronqué.
- `min-w-0` ajouté sur l'`<Input>` du numéro : sans ça, la largeur minimale par défaut d'un enfant flex (`min-width: auto`) peut l'empêcher de rétrécir correctement même avec `flex-1`, laissant le `<select>` déborder quand même.

**Corrigé dans `ShopSettingsForm.tsx`** : les champs Téléphone et WhatsApp passent d'une grille à 2 colonnes à une colonne pleine largeur chacun — un `PhoneInput` a structurellement besoin de plus de place qu'un champ texte simple.

Vérifié visuellement avec un mini rendu HTML isolé (avant/après, capture Playwright) confirmant que le sélecteur reste compact et que le champ numéro récupère l'espace. `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes) et `npm run test:coverage` (154 tests, aucune régression) passent tous. Rien de commité.

### 2026-09-21 — Formatage en tirets + longueur maximale par pays réelle (pas un gabarit fixe)

Demande : formater et limiter chaque champ téléphone au nombre de caractères max du pays choisi (ex. Canada `+1 xxx-xxx-xxxx`, Cameroun `+237 xxx-xxx-xxx`).

**Décision prise sans redemander** : ne pas coder un gabarit fixe "3+3+4" ou "3+3+3" appliqué à tous les pays — ce serait faux pour la plupart d'entre eux (le regroupement réel du Cameroun est 1+2+2+2+2 chiffres, pas 3+3+3 ; testé directement avec `AsYouType` de la bibliothèque plutôt que supposé). À la place : le regroupement (où placer les séparateurs) reste celui, exact, de chaque pays via `AsYouType` — seul le caractère séparateur est uniformisé en tiret plutôt que l'espace/parenthèses que la bibliothèque utilise par défaut selon le pays, ce qui correspond à ce que l'utilisateur a demandé visuellement sans sacrifier l'exactitude du découpage.

**Longueur maximale** : `libphonenumber-js` expose `validatePhoneNumberLength(chiffres, pays)`, qui renvoie `'TOO_LONG'` dès que la longueur dépasse ce qui est réellement valide pour ce pays précis (vérifié : Cameroun → 9 chiffres, Canada → 10). Une frappe (ou un collage) au-delà de cette longueur est maintenant tronquée automatiquement à la limite exacte du pays sélectionné, recalculée à chaque changement de pays — pas une constante codée en dur par pays à maintenir à la main.

**Bug de conversion E.164 trouvé et corrigé en creusant le sujet** : la conversion `+indicatif+chiffres` par simple concaténation (utilisée jusque-là) est fausse pour les pays avec un préfixe de tri national — la France en écrit un exemple parfait : un numéro tapé "à la française" avec le 0 initial (`0612345678`) aurait donné `+330612345678` (avec un 0 en trop) au lieu de `+33612345678`. Remplacé par `parsePhoneNumberFromString(chiffres, pays)?.number`, qui gère ça correctement (vérifié : "0612345678" et "612345678" donnent tous les deux `+33612345678`), avec repli sur la concaténation simple tant que le numéro est encore incomplet pendant la frappe.

Tests étendus (`phone-input.test.tsx`, 7 tests désormais) : regroupement par tirets, plafonnement au Cameroun (9 chiffres) ET au Canada (10 chiffres, pour prouver que ce n'est pas une limite fixe mais bien par pays).

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, aucune nouvelle route) et `npm run test:coverage` (157 tests, +3, aucune régression). Rien de commité.

### 2026-09-21 — Remplacement de l'implémentation maison par `react-phone-number-input`

Question posée par l'utilisateur après l'entrée précédente : "S'il existe une librairie qui aide à faire cela pourquoi ne pas l'utiliser à la place" — remarque justifiée. `libphonenumber-js` gérait déjà toute la logique de formatage/validation en interne ; seule l'enveloppe UI (sélecteur de pays + input, gestion du curseur pendant la frappe) était maison, et c'est justement là que se trouvait la faiblesse la plus visible : le curseur sautait en fin de champ à chaque frappe en édition médiane, un problème de gestion fine du DOM qu'une bibliothèque UI dédiée résout structurellement mieux qu'une implémentation ad hoc.

**Remplacé** `phone-input.tsx` par une enveloppe autour de `react-phone-number-input` (construit sur `libphonenumber-js`, donc même moteur de formatage/validation qu'avant) :
- `limitMaxLength` remplace le plafonnement manuel par pays codé dans l'entrée précédente (`validatePhoneNumberLength`) — la bibliothèque le fait nativement.
- `inputComponent`/`countrySelectComponent` réutilisent les composants `Input`/`Select` du projet (un adaptateur `CountrySelect` traduit la convention `onChange(value)` de la bibliothèque vers celle d'un `<select>` natif) — l'apparence ne change pas pour l'utilisateur.
- Noms de pays en français via `react-phone-number-input/locale/fr.json` (fichier de traduction fourni par la bibliothèque) plutôt que `Intl.DisplayNames`.
- Le regroupement visuel des chiffres redevient celui, natif, de chaque pays (espaces, tirets ou parenthèses selon le pays) au lieu du tiret uniforme forcé dans l'entrée précédente — compromis accepté pour la robustesse gagnée côté curseur/édition.

**Changement annexe nécessaire** : `src/components/ui/input.tsx` accepte maintenant `ref` comme une prop normale (fonctionnalité React 19, plus besoin de `forwardRef`) — la bibliothèque pilote la position du curseur via une ref directe sur l'`<input>` réel pendant le reformatage en direct.

**Comportement réel vérifié plutôt que supposé** (via des tests exploratoires jetables avant d'écrire les tests définitifs) : en mode `international`, le champ texte affiche le numéro complet avec l'indicatif (`+237 6 90 00 00 00`), pas seulement la partie nationale ; changer de pays repart d'un numéro vierge sous le nouvel indicatif plutôt que de réinterpréter les chiffres déjà tapés ; vider le champ laisse visuellement l'indicatif du pays par défaut affiché mais la valeur E.164 réellement transmise au formulaire (`onChange`) devient bien une chaîne vide. `phone-input.test.tsx` (7 tests) réécrit pour vérifier le contrat `value`/`onChange` exposé au formulaire (via un `<output>` de test) plutôt que la représentation visuelle exacte dans le champ, qui est un détail d'implémentation de la bibliothèque et non un contrat à figer.

Contrat externe inchangé pour les appelants (`LoginForm.tsx`, `ShopSettingsForm.tsx`) — toujours `value`/`onChange` en E.164, aucune modification nécessaire de leur côté.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, aucune nouvelle route) et `npm run test:coverage` (157 tests, aucune régression). Rien de commité.

### 2026-09-23 — Introduction d'une couche serveur (BFF hybride), première tranche : Super Admin

Question posée par l'utilisateur : peut-on diviser le projet en un "serveur" qui gère toute la communication Firebase, la sécurité des URL et des privilèges, et un "client" qui ne fait que l'UI et appelle le serveur via les services ? Réponse : oui, mais en **hybride**, pas une migration à 100 % — décision validée avec l'utilisateur après un état des lieux précis du code existant (aucun `onSnapshot`/temps réel nulle part, donc "perdre le temps réel" n'était plus un argument contre un passage serveur ; mais les lectures publiques du catalogue n'ont aucun bénéfice de sécurité à gagner en migrant, seulement de la latence en plus).

**Pattern retenu** : Backend-for-Frontend (BFF) via des Next.js **Server Actions** (`"use server"`), appelées depuis la couche `Service` existante — les composants ne changent pas. Nouveau dossier `src/server/` (sibling de `repositories/`/`services/`) :
- `src/lib/firebaseAdmin.ts` — première introduction de `firebase-admin` dans le projet, avec une **initialisation paresseuse** (`getAdminApp()` mémoïsé, jamais appelé au chargement du module) : `cert()` jette immédiatement si le compte de service est absent, contrairement au SDK client qui tolère des champs `undefined` — sans ça, un simple `import` aurait cassé `npm run build` même sur des chemins qui n'exécutent jamais de code privilégié. Vérifié : le build passe bien sans le secret réel configuré.
- `src/server/auth/requireCaller.ts` — vérifie l'identité de l'appelant. **Réutilise `src/lib/verifyIdToken.ts` tel quel** (JWKS via `jose`, déjà utilisé par `/api/uploads`) plutôt que la propre vérification de `firebase-admin` — pas besoin de deux mécanismes de vérification d'identité en parallèle ; `firebase-admin` n'est introduit que pour ce qui manquait réellement : l'accès Firestore qui contourne les règles.
- `src/server/auth/requireSuperAdmin.ts` — première fois que "est-ce un Super Admin ?" est vérifié en code TypeScript plutôt qu'uniquement dans `firestore.rules`.
- `src/server/actions/platformAdminActions.ts` — `grantAdminAction`/`revokeAdminAction`/`searchUsersAction`, chacune revérifiant le privilège avant d'écrire via `adminDb`.

**Détail de sérialisation rencontré** : le retour d'une Server Action ne peut transporter que des données planes, pas des instances de classe — `Timestamp` (client comme admin) en est une. `searchUsersAction` retourne donc un DTO (`createdAt`/`subscriptionExpiresAt` en chaînes ISO), que `PlatformAdminService.searchUsers` reconvertit en vrai `Timestamp` (`Timestamp.fromDate`) avant de retourner `User[]`, pour que le contrat externe ne change pas.

**`PlatformAdminService.ts`** : `grantAdmin`/`revokeAdmin`/`searchUsers` récupèrent le token de l'appelant (`auth.currentUser?.getIdToken()`, même pattern que `src/lib/upload.ts`) et appellent l'action serveur correspondante, au lieu d'écrire directement via `IUserRepository`. `isSuperAdmin` **reste inchangé** (lecture client directe) : déjà étroitement scopée par une règle Firestore simple, pas une mutation — la faire passer par le serveur n'ajouterait que de la latence à chaque changement d'état d'auth dans `AuthProvider`. **`SuperAdminPanel.tsx` n'a pas changé d'une ligne** : il continue d'appeler `platformAdminService.grantAdmin(user.id)` etc. exactement comme avant.

**`firestore.rules`** : inchangées, avec un commentaire ajouté près des blocs `platformAdmins`/`users.role` notant que `firebase-admin` contourne ces règles pour ce chemin précis, mais qu'elles restent le seul rempart contre tout autre chemin d'écriture (client direct, code pas encore migré) — pas de relâchement, defense-in-depth explicite.

**Nouveau secret** : `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` (JSON du compte de service, encodé en base64 pour éviter les soucis de newlines de la clé PEM dans `.env.local`/GitHub/Vercel), ajouté à `.env.example`. Volontairement **pas** ajouté à `.github/workflows/ci.yml` : les tests mockent `firebase-admin` entièrement, jamais besoin du vrai secret, et un pipeline qui tourne sur des PR (y compris depuis des forks) ne devrait pas détenir un credential qui contourne toutes les règles Firestore.

Débloque au passage BF-69/70 (`docs/04-besoins-techniques.md` §11.5) : le job d'expiration d'abonnement, qui attendait justement un accès Firestore privilégié côté serveur, peut maintenant réutiliser `getAdminDb()` — pas implémenté dans cette tranche, juste débloqué.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (22 routes, aucune nouvelle route — les Server Actions n'ajoutent pas de route visible) et `npm run test:coverage` (166 tests, +9, aucune régression). Rien de commité.

### 2026-09-23 — Icônes PWA manquantes + bannière d'installation persistante (Android/iOS)

Deux besoins liés : d'abord un vrai gap d'installabilité identifié en creusant BNF-21 (le manifest ne référençait que `favicon.ico`, aucune icône PNG 192/512, aucun `apple-touch-icon` — Chrome ne considère pas ça comme une icône valide, et iOS ignore complètement les icônes du manifest), puis la demande explicite de l'utilisateur : proposer systématiquement l'installation sur Android et iPhone.

**Icônes (prérequis technique)** : générées avec ImageMagick à partir d'un monogramme "M" placeholder (fond `#0f172a`, cohérent avec `theme_color`) — **à remplacer par un vrai logo dès qu'il existe**, signalé explicitement à l'utilisateur. `public/icons/icon-192.png`, `icon-512.png` (purpose `any`), `icon-maskable-512.png` (le M est volontairement plus petit/centré pour rester dans la zone de sécurité une fois recadré en cercle par Android), et `src/app/apple-icon.png` (convention Next.js — génère automatiquement le `<link rel="apple-touch-icon">`, absent jusqu'ici). Ajoutées à `src/app/manifest.ts`. Vérifié en conditions réelles (serveur dev + curl) : le HTML sert bien désormais `<link rel="apple-touch-icon" sizes="180x180">`, absent avant ce changement.

**Bannière d'installation** — question posée à l'utilisateur avant de coder : fermable pour la session en cours (revient à la prochaine visite tant que l'app n'est pas installée) ou totalement permanente ? Réponse : fermable. Contrainte de plateforme à respecter : Android/Chrome expose `beforeinstallprompt` (un vrai dialogue natif déclenchable par notre propre bouton), **iOS Safari n'expose rien** — la seule option est une bannière qui explique la manip manuelle (Partager → "Sur l'écran d'accueil").

- `src/hooks/usePwaInstall.ts` — capture `beforeinstallprompt` (`preventDefault()` pour désactiver la mini-barre automatique de Chrome, on affiche notre propre UI à la place) et expose `promptInstall()` ; détecte iOS via `userAgent` ; ne renvoie rien (`platform: "none"`) si l'app tourne déjà en mode installé (`display-mode: standalone` ou `navigator.standalone`). Écoute aussi `appinstalled` pour se masquer dès l'installation réussie.
- `src/lib/pwaInstallDismissal.ts` — fermeture mémorisée en `sessionStorage` (pas `localStorage`, exprès : ferme pour l'onglet en cours seulement) ; échec silencieux si indisponible, même convention défensive que `lib/productDraft.ts`.
- `src/components/pwa/InstallPrompt.tsx` — montée globalement dans `app/layout.tsx`, donc visible sur tout le site (storefront et dashboard). Affiche "Installer" (Android, déclenche `promptInstall()`) ou les instructions manuelles (iOS), toujours avec un bouton de fermeture.

**Vérifié en conditions quasi réelles**, pas seulement en test unitaire : script Playwright ad hoc (user-agent Android + événement `beforeinstallprompt` synthétique, puis user-agent iPhone) contre le serveur dev réel, captures d'écran à l'appui — la bannière s'affiche correctement dans les deux cas, avec le bon texte et les bons boutons, sans casser le rendu de la landing page.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (23 routes, +1 — `/apple-icon.png`) et `npm run test:coverage` (179 tests, +13, aucune régression, 100% de couverture sur les nouveaux fichiers). Rien de commité.

### 2026-09-24 — Données de démo + page `/demo-catalogue`, et repli automatique depuis `/catalogue`

Demande initiale : un fichier de données mockées pour démontrer le catalogue multi-boutiques. Adapté à l'existant plutôt que suivre la demande au pied de la lettre : `src/data/mockData.ts` réutilise directement les types `Shop`/`Product` du domaine (pas d'`Article` séparé — `Product` couvre déjà exactement les mêmes champs) ; `MockShop` étend `Shop` avec `sector` (seul champ demandé qui n'existe pas sur le vrai modèle), gardé local au fichier de mock plutôt qu'ajouté à `src/models/shop/Shop.ts`. 6 boutiques (secteurs variés, villes camerounaises), 18 articles, images via `picsum.photos` (seed stable par id), `getArticlesByShop(shopId)`.

**Page `/demo-catalogue`** (`src/app/(storefront)/demo-catalogue/page.tsx`) demandée ensuite pour visualiser ces données dans l'app plutôt qu'en JSON brut — réutilise `StorefrontHeader` (via le layout `(storefront)`) et `StorefrontProductCard` (le vrai composant produit, pas une maquette) pour un rendu fidèle à ce qu'aura vraiment l'app.

**Bug rencontré et corrigé** : `next build` échouait sur cette page (`a.createdAt.toDate is not a function`) — passer un `Timestamp` Firestore en prop d'un Server Component vers `StorefrontProductCard` (Client Component) le fait traverser la sérialisation RSC, qui ne préserve pas les méthodes d'une instance de classe. Corrigé en passant la page en `"use client"` (même raison que `/catalogue` aujourd'hui, qui fait déjà tout côté client pour éviter ce problème). Autre correctif nécessaire : `picsum.photos` ajouté à `images.remotePatterns` dans `next.config.ts` (l'optimiseur d'images Next refuse tout hôte non déclaré).

**Repli automatique** : sur demande explicite, `/catalogue` (la seule vraie page catalogue existante, mono-boutique tant que le routing multi-tenant n'est pas construit) redirige maintenant vers `/demo-catalogue` dans trois cas — aucune boutique résolue, boutique existante mais `isPublished` faux/absent, ou boutique publiée mais sans aucun produit. Le dernier cas est vérifié dans `CataloguePageContent` (pas dans `page.tsx`, qui ne fait pas l'appel Firestore des produits) via le total réel (`products.length`), volontairement distinct de `visibleProducts` (qui peut être vide juste à cause d'une recherche/filtre sans rapport — testé explicitement pour ne pas rediriger dans ce cas-là).

Tests ajoutés (`catalogue/page.test.tsx`, `CataloguePageContent.test.tsx`, aucun n'existait avant sur ces deux fichiers) : chargement, absence de boutique, boutique dépubliée, boutique publiée avec produits, boutique publiée sans produit, et le cas de non-régression recherche-vide-mais-pas-boutique-vide.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (24 routes, +1 — `/demo-catalogue`) et `npm run test:coverage` (186 tests, +7, aucune régression). Rien de commité.

### 2026-09-24 — Données de démo pour le dashboard admin + Super Admin, et aperçu en lecture seule (pas de redirection)

Suite logique de l'entrée précédente : étendre `mockData.ts` puis appliquer "la même logique" au dashboard admin et à `/super-admin`. Décision prise avec l'utilisateur avant de coder : **pas** la même mécanique que `/catalogue` (redirection complète vers une page de démo) — un visiteur anonyme n'a rien à perdre à être redirigé, mais un admin sur son propre dashboard vide perdrait l'accès à ses vrais boutons ("ajouter mon premier produit", etc.) au moment précis où il en a besoin. Et `/super-admin` a un problème supplémentaire : ses boutons Donner/Retirer l'admin déclenchent de vraies écritures Firestore privilégiées (Server Actions) — y afficher des utilisateurs fictifs avec ces boutons actifs risquerait un clic sur un id qui n'existe pas réellement.

**Retenu** : la vraie page reste toujours affichée (formulaire d'ajout, recherche...) ; si la vraie liste est vide (dashboard) ou si une recherche ne trouve personne (Super Admin), un aperçu en lecture seule apparaît en plus, avec un bandeau "Exemple" (`DemoPreviewBanner.tsx`, nouveau composant partagé) et aucune action possible dessus.

**`mockData.ts` étendu** (mêmes principes que la première extraction : réutiliser les vrais types du domaine, vérifier les usages réels avant d'écrire une seule donnée) :
- `mockCategories: Category[]` — 2 par boutique, noms strictement identiques à `mockArticles[].category` (`ProductList` filtre par `product.category === category.name` — un écart aurait cassé silencieusement le filtre). `mockArticles[].category` mis à jour en conséquence (catégories plus fines par boutique — ex. "Lait & Yaourts"/"Fromages" au lieu d'un seul "Produits laitiers" — plus utile pour démontrer un vrai filtre). Une catégorie volontairement `isActive: false` pour montrer l'état masqué.
- `mockUsers: User[]` (17) — sert à la fois les aperçus dashboard (équipe) et Super Admin (recherche). `id` des 6 admins == `Shop.ownerId` de leur boutique (cohérence vérifiée par script). Les deux origines du rôle admin représentées : `adminSource: "manual"` et `"subscription"` (avec `subscriptionExpiresAt` dans le futur, pour que le badge "(abonnement)" de `SuperAdminPanel` ait quelque chose à montrer). Vendeurs et clients aussi, ces derniers jamais avec `shopId` (respecte l'invariant documenté sur le modèle `User` réel).
- `getCategoriesByShop`/`getTeamMembersByShop` (miroir de `getArticlesByShop`).

**Dashboard** (`ProductsPageContent`, `CategoriesPageContent`, `TeamPageContent`) : aucune modification de `ProductList`/`CategoryManager`/`TeamList` eux-mêmes (composants réels intacts, avec leurs vraies actions). L'aperçu de démo est un rendu strictement séparé, construit à la main sans bouton ni lien — délibéré : réutiliser les composants réels avec des données fictives aurait câblé leurs boutons Modifier/Supprimer/Activer sur des ids qui n'existent pas vraiment en base. Boutique de démo choisie pour la cohérence du récit : "Mode 237" (la plus fournie : 2 catégories, une promo, 2 vendeurs) réutilisée pour les trois sections.

**`SuperAdminPanel.tsx`** : nouvel aperçu affiché uniquement quand une recherche renvoie 0 résultat (jamais avant la première recherche) — 4 comptes représentatifs (un admin manuel, un admin par abonnement, un vendeur, un client) via un `DemoUserRow` séparé de `UserRow`, sans les boutons Donner/Retirer l'admin.

Tests ajoutés : `ProductsPageContent.test.tsx`, `CategoriesPageContent.test.tsx`, `TeamPageContent.test.tsx` (aucun n'existait avant) + un cas ajouté à `SuperAdminPanel.test.tsx` vérifiant explicitement l'absence des boutons Donner/Retirer l'admin sur l'aperçu.

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (24 routes, aucune nouvelle route) et `npm run test:coverage` (192 tests, +6, aucune régression). Rien de commité.

### 2026-09-24 — Landing page : la vitrine "La sélection du moment" devient dynamique

La section produits de la landing page (`src/app/page.tsx`, "Vendez plus simplement.") affichait 3 articles entièrement inventés à la main ("Ensemble Wax Moderne", etc., prix et dégradés codés en dur). Demande : que ce soit les 3 meilleurs articles des 3 meilleures boutiques, rempli avec les données de démo en attendant.

**Aucune vraie donnée de vente n'existe** (`Order` est défini dans le modèle mais n'est branché nulle part, voir §7 de l'entrée du 2026-09-24 précédente) — donc "meilleur" n'a pas de métrique réelle disponible aujourd'hui. Nouvelle fonction `getFeaturedArticles(limit)` dans `mockData.ts`, avec un classement délibérément transparent et documenté comme approximatif : une promo active d'abord, puis le plus récent, puis le prix le plus élevé en dernier recours. Un seul article "meilleur" est retenu par boutique avant le classement final, pour garantir des boutiques distinctes plutôt que plusieurs articles de la même — correspond à la demande "3 meilleures boutiques", pas juste "3 meilleurs articles" qui auraient pu venir de la même boutique.

Résultat actuel avec les données de démo (vérifié) : Powerbank 10000mAh (TechPoint, promo, 9 990 FCFA), Chemise homme coton (Mode 237, promo, 6 800 FCFA), Huile de karité pure (Beauté Naturelle, 2 500 FCFA, ajoutée il y a 3 jours).

`src/app/page.tsx` reste un Server Component (aucun `"use client"` nécessaire) : seuls des champs texte simples (`category`, `name`, `priceLabel` déjà formaté, `gradient`) traversent vers `ProductShowcase`/`ProductCard` — jamais l'objet `Product` complet avec son `Timestamp`, qui aurait reproduit le bug de sérialisation RSC déjà rencontré avec `/demo-catalogue`. Un dégradé par boutique (`SHOWCASE_GRADIENTS`, 6 entrées) plutôt que par position dans le tableau, pour que la carte reste visuellement liée à la boutique même quand le classement change qui apparaît.

Prêt à être remplacé par un vrai classement (ventes, vues...) sans toucher à `ProductShowcase` — seul `showcaseProducts` dans `page.tsx` devra changer de source.

`page.test.tsx` : l'assertion sur le nom du produit codé en dur mise à jour ("Powerbank 10000mAh" au lieu de "Ensemble Wax Moderne").

Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build` (24 routes, aucune nouvelle route) et `npm run test:coverage` (192 tests, aucune régression). Vérifié aussi visuellement (capture Playwright contre le serveur dev réel) : dégradés distincts par boutique, prix promo affichés correctement. Rien de commité.

### 2026-09-24 — Photos des articles sur les cartes de la vitrine landing page

Suite immédiate de l'entrée précédente : les cartes de "La sélection du moment" n'affichaient qu'un dégradé décoratif, sans la vraie photo de l'article. `ProductCard.tsx` (`src/components/ui/ProductCard.tsx`) n'avait jamais eu de notion d'image — seul appelant réel : `ProductShowcase.tsx`.

**`image?: string` ajouté à `ProductCardProps` et `ShowcaseProduct`**, rétrocompatible : sans cette prop, la carte reste un pur dégradé plein cadre comme avant (aucun autre appelant du composant à ce jour, mais le comportement par défaut est préservé). Avec elle : la photo (`next/image`, `fill` + `object-cover`) remplit la carte, et le dégradé devient un voile coloré semi-transparent (opacité 0.72) par-dessus plutôt que le fond lui-même — garde le texte lisible et l'identité colorée par boutique, tout en laissant deviner la vraie photo en dessous. `src/app/page.tsx` passe `image: article.images[0]` (déjà résolu par `getFeaturedArticles`, via `picsum.photos`, déjà autorisé dans `next.config.ts` depuis `/demo-catalogue`).

Vérifié visuellement (capture Playwright) : les 3 photos s'affichent correctement sous leur teinte respective, texte toujours lisible. `npm run lint`, `npx tsc --noEmit`, `npm run build` (24 routes) et `npm run test:coverage` (192 tests, aucune régression — pas de test dédié à `ProductCard` à mettre à jour, sa seule couverture passe par `page.test.tsx`, dont les assertions ne portaient pas sur l'image). Rien de commité.
