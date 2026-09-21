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
