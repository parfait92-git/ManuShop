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
