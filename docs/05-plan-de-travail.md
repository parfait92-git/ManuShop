# Plan de Travail — ManuShop

Basé sur [01-business-plan.md](./01-business-plan.md), [02-besoins-fonctionnels.md](./02-besoins-fonctionnels.md), [03-besoins-non-fonctionnels.md](./03-besoins-non-fonctionnels.md) et [04-besoins-techniques.md](./04-besoins-techniques.md).

Workflow git : toute fonctionnalité part de `develop`, fusion vers `main` uniquement via Pull Request (voir `.github/workflows/enforce-merge-source.yml`).

---

## Phase 0 — Prérequis & Mise en place (avant tout code métier)

### 0.1 Comptes & Projets externes
- [x] Créer le projet **Firebase** (`manushop-eb15a`) : Firestore activé, règles déployées, app Web enregistrée
- [x] Activer **Authentication** (Email/Password) dans la console Firebase
- [x] ~~Firebase Storage~~ → remplacé par **Cloudinary** (Firebase Storage nécessite le forfait payant Blaze) : compte créé, clés en cours d'ajout dans `.env.local`
- [x] Créer le projet **Vercel** et le connecter au repo GitHub `ManuShop` (`manu-shop`)
  - [x] Brancher le déploiement production sur `main`
  - [x] Configurer les Preview Deployments sur les PR issues de `develop`
- [ ] Réserver le nom de domaine (`.cm` ou `.com`) si disponible dès cette phase
- [ ] (Peut être différé en Phase 2/3) Comptes développeurs Meta (Facebook/Instagram Graph API), WhatsApp Business Cloud API, TikTok Business API

### 0.2 Outillage local (VS Code)
- [x] Extensions : ESLint, Prettier, Tailwind CSS IntelliSense, GitLens, Error Lens, Playwright (déjà présentes ou installées)
- [x] Configurer `firebase-tools` CLI (via `npx`, pas d'installation globale possible sans sudo) : login, init Firestore
- [x] Configurer `vercel` CLI (via `npx`) : login, link au projet `manu-shop` existant

### 0.3 Initialisation technique du projet
- [x] Installer les dépendances (Firebase SDK, Cloudinary/next-cloudinary, Zustand, React Hook Form + Zod, react-pdf, sonner, lucide-react, date-fns, clsx, tailwind-merge)
- [x] `npx shadcn@latest init` + configuration Tailwind
- [x] Configurer le PWA en natif App Router (`src/app/manifest.ts` + `public/sw.js` + `src/instrumentation-client.ts`) plutôt que `next-pwa` (compatibilité Turbopack non garantie)
- [x] Créer la structure de dossiers : `src/repositories`, `src/services`, `src/factories`, `src/strategies`, `src/models` (une interface par fichier, un dossier par entité) + clients `src/lib/firebase.ts` et `src/lib/cloudinary.ts`
- [x] Créer les fichiers `.env.local` (non commité) et `.env.example` (commité, sans valeurs) reprenant les variables du §8
- [x] Ajouter les mêmes variables en secrets sur Vercel et GitHub Actions (Cloudinary en attente des clés)
- [x] Écrire les règles de sécurité Firestore (§6) et les déployer (`firebase deploy --only firestore:rules`)
- [x] Mettre en place le pipeline CI GitHub Actions : lint + tests + build (`.github/workflows/ci.yml`, vert sur `develop`)
- [x] Configurer Jest + Testing Library (`next/jest`, seuil de couverture 70% dans `jest.config.mjs`, BNF-28) — 127 tests, couverture globale ~84% au 2026-09-21

**Definition of Done Phase 0** : `npm run build` passe en local et sur Vercel (déploiement preview visible), Firebase répond depuis l'app (lecture/écriture test), CI verte sur une PR `develop → main` de test.

---

## Phase 1 — MVP (≈4 semaines)

Objectif business plan : catalogue produits + gestion stock + facturation.

**Prochaine étape (mise à jour 2026-09-21) : Module 12 — Plateforme Multi-Boutique & Super Administration (BF-62→68), voir Phase 1bis ci-dessous.** Le Module 3 — Stock (BF-13→17), pointé comme prochaine étape plus tôt le même jour, reste pas commencé et repasse derrière : le passage au multi-tenant change la façon dont les boutiques et les utilisateurs sont modélisés, mieux vaut le poser avant de continuer à empiler des modules sur l'hypothèse mono-tenant actuelle. `stock`/`stockThreshold` existent déjà sur `Product` (posés au Module 2) pour mémoire quand ce module reviendra en tête de liste.

- [x] **Module 1 — Auth & Utilisateurs** (BF-01→05) : inscription/connexion gérant, rôles Admin/Vendeur/Client, profil boutique, reset mot de passe — *quasi complet : seul le rôle Client n'a pas de flux de création dédié (BF-03 partiel, voir 02-besoins-fonctionnels.md)*
- [x] **Module 2 — Catalogue produits** (BF-06→12) : CRUD produit, catégories (+ description, affichée/masquée), recherche, galerie photos (recadrage carré obligatoire), produit en vedette — *quasi complet : pas de marqueur manuel "populaire" (BF-12 partiel)*
- [ ] **Module 3 — Stock** (BF-13→17) : suivi auto, alerte seuil bas, historique, réappro, variantes — **toujours pas construit comme module à part entière** ; une mécanique minimale (décrément/incrément automatique de `Product.stock` à la commande/annulation/retour, sans historique ni réappro ni variantes) vit désormais dans le Module 4 (`orderActions.ts`), en attendant ce module
- [x] **Module 4 — Commandes** (BF-18→23) : panier client, commande, statuts, commande manuelle, historique, annulation — **fait le 2026-09-25**, construit directement avec le vocabulaire de statuts révisé (BF-95→97, Phase 1ter §5 ci-dessous), notification WhatsApp Business au commerçant à la création (Meta Cloud API, identifiants pas encore configurés)
- [ ] **Module 5 — Facturation** (BF-24→29) : génération auto, aperçu, export PDF, numérotation, personnalisation
- [~] **Module 7 — Vitrine publique** (BF-35→40) : accueil, catalogue public, fiche produit, filtres, bouton WhatsApp, mode hors-ligne — *anticipé hors de l'ordre initial ; catalogue public et recherche/filtre catégorie faits, fiche produit et filtre prix/disponibilité manquants, bouton WhatsApp adapté en panier + un seul bouton au paiement (voir 02-besoins-fonctionnels.md)*
- [~] **Module 10 — Dashboard** (BF-53→57) : vue d'ensemble, rapports ventes/stock, export CSV/PDF — *ventes du mois/commandes/nouveaux clients/produits actifs réels depuis le 2026-09-25 (débloqué par le Module 4) ; rapport par intervalle personnalisé, produits populaires et export CSV/PDF restent non construits*
- [x] Respect BNF perf (§1), sécurité Firestore par rôle (§3), responsive mobile-first (§4)

**DoD Phase 1** : un gérant peut créer sa boutique, ajouter des produits, recevoir et facturer une commande, un client peut consulter la vitrine et commander en ligne.

---

## Phase 1bis — Plateforme Multi-Boutique (ajoutée 2026-09-21, révisée le même jour, priorité immédiate)

Changement de modèle décidé en session : ManuShop passe de mono-tenant à multi-boutique. Voir [01-business-plan.md](./01-business-plan.md) §10, [02-besoins-fonctionnels.md](./02-besoins-fonctionnels.md) Module 12 (BF-62→70) et [04-besoins-techniques.md](./04-besoins-techniques.md) §11 pour le détail complet.

**Révision du 2026-09-21 (l'utilisateur a précisé le flux après la première rédaction)** : le Super Admin n'est plus un rôle sur `users` mais l'appartenance à une collection Firestore dédiée `platformAdmins` ; l'inscription ne crée plus jamais `role: 'admin'` (tout démarre `client`) ; devenir admin passe par une attribution manuelle du Super Admin (recherche par pseudo/email/téléphone, révocable) OU un abonnement payant avec expiration automatique (BF-69/70, durée au choix).

**À trancher avant de coder** (points ouverts, proposition par défaut documentée dans 04-besoins-techniques.md §11.3 et §11.5, à confirmer avec l'utilisateur) :
- [ ] Schéma d'encodage du token d'URL opaque (`ownerId`+`shopId`) — encodage réversible simple proposé, à valider
- [ ] Moyen de paiement pour l'abonnement (BF-69) — aucun choisi, aucune intégration existante dans le projet
- [ ] Mécanisme de l'expiration automatique de l'abonnement (BF-69) — nécessite un accès Firestore privilégié côté serveur (Vercel Cron + `firebase-admin`, ou Cloud Functions planifiées) que le projet n'a pas aujourd'hui ; aucune option choisie

**Travail à faire, dans l'ordre suggéré (le plus isolé/moins risqué d'abord)** :
- [x] Étendre `User` (`adminSource`, `subscriptionPlan`, `subscriptionExpiresAt` — plus de `role: 'super-admin'`) et `Shop` (`isPublished`, `publicToken`, liens réseaux sociaux) — 2026-09-21
- [x] Collection `platformAdmins` (Super Admin) + règles Firestore : verrou strict empêchant toute attribution du privilège Super Admin depuis l'app (BF-67) — 2026-09-21. **Deux bugs de sécurité pré-existants corrigés au passage** (voir journal) : `users` s'auto-modifiait sans restriction (n'importe qui pouvait changer son propre `role`), et `shops` s'écrivait par n'importe quel admin, pas seulement le propriétaire.
- [x] Couper la création de `role: 'admin'` à l'inscription (`AuthService.registerShopOwner`/`completeMerchantSignup` créent `role: 'client'` ; nouvelle méthode `AuthService.createShop()` pour plus tard) ; formulaires et redirections ajustés en conséquence — 2026-09-21. **Conséquence assumée** : jusqu'à ce que la page Super Admin existe, personne ne peut devenir admin sans éditer Firestore à la main depuis la console.
- La lecture publique conditionnée à `isPublished` (BF-62) n'est **pas encore faite** — `shops`/`products`/`categories` restent en lecture publique inconditionnelle pour ne pas casser la vitrine mono-tenant actuelle tant que le routing multi-tenant n'existe pas.
- [x] Page Super Admin (BF-68) : recherche d'un compte par pseudo/email/téléphone, attribution et révocation du rôle Admin — protégée par l'appartenance à `platformAdmins`, pas par `role` — 2026-09-21 (`/super-admin`)
- [ ] Abonnement payant avec expiration automatique (BF-69) et rétrogradation en fin d'abonnement (BF-70) — bloqué sur les deux points ouverts ci-dessus (moyen de paiement, mécanisme d'expiration)
- [ ] Bascule "Publier ma boutique" dans Paramètres (BF-62)
- [ ] Annuaire des boutiques publiées avec boutiques factices en attendant (BF-63), remplaçant/complétant `/onboarding`
- [x] **Version ciblée faite le 2026-09-25** (04-besoins-techniques.md §18) : `/boutique/{shopId}` (id Firestore tel quel, pas de token opaque `ownerId`+`shopId`) + `ShareShopLinkButton` (BF-91). Route additionnelle, `/catalogue` inchangé. **Reste non fait** : la migration complète (`useShop()`, toutes les pages storefront vers un `shopToken`, `ProtectedRoute`/`GuestRoute` — voir 04-besoins-techniques.md §11.6) — pas nécessaire tant qu'une seule page (le catalogue) a besoin d'être scopée par boutique.
- [ ] Liens réseaux sociaux par article sur la vitrine publiée (BF-65, BF-66) — dépend du champ `publishedChannels` sur `Product`, lui-même dépendant du Module 8 (Publication Multicanal) pas commencé ; comportement honnête en attendant : aucun lien affiché tant que la donnée n'existe pas

**DoD Phase 1bis** : un commerçant devenu admin (attribution manuelle ou abonnement actif) peut publier sa boutique ; un visiteur peut la découvrir depuis l'annuaire, la visiter à son URL dédiée, et y commander comme sur `/catalogue` aujourd'hui ; un abonnement expiré redirige proprement l'ex-admin vers la vue cliente de sa propre boutique.

---

## Phase 1ter — Multi-boutique par commerçant, cycle de vie commande & corbeille (ajoutée 2026-09-25)

Spécification fonctionnelle complète fournie par l'utilisateur (voir Modules 13→22 dans [02-besoins-fonctionnels.md](./02-besoins-fonctionnels.md), BF-71→119, et §12 de [04-besoins-techniques.md](./04-besoins-techniques.md) pour le détail technique). Ordre ci-dessous choisi pour poser d'abord ce dont les autres modules dépendent (migration de modèle, corbeille) avant de construire par-dessus.

**Décisions déjà actées avec l'utilisateur (2026-09-25)** :
- [x] Le rôle `seller` (vendeur invité, déjà construit) est conservé — cette phase s'ajoute au-dessus, ne le remplace pas.
- [x] Les tags de catégorie (BF-109) sont une liste fermée gérée exclusivement par le Super Admin, pas ouverte aux commerçants.

**0. Migration de modèle (bloquant, à faire en premier)**
- [x] **Fait le 2026-09-25.** Déplacer `subscriptionPlan`/`subscriptionExpiresAt` de `User` vers `Shop` (04-besoins-techniques.md §12.1) — touche `PlatformAdminService`, `src/data/mockData.ts`, et leurs tests déjà livrés au 2026-09-23/24. Révision en cours de route : `User.adminSource` **reste** (toujours utile pour BF-68, attribution manuelle au niveau du compte) — seuls les deux champs réellement inutilisés (`subscriptionPlan`/`subscriptionExpiresAt`, jamais écrits par aucun code, BF-69 jamais construit) migrent. `Shop` gagne aussi `sector?`.
- [ ] ~~Ajuster `firestore.rules`~~ — non nécessaire : découverte en cours d'implémentation que `shops.create` exige déjà `role == 'admin'` et que `users.update` interdit à un compte de changer son propre `role`. La création de boutique passe donc par une Server Action privilégiée (`createShopAction`, `firebase-admin`, contourne les règles), même schéma que BF-68 — les règles restent la défense en profondeur pour tout autre chemin d'écriture, inchangées.
- [ ] Réviser BF-70/BF-93 : la redirection "abonnement expiré" devient un check par boutique, pas par compte — **pas encore construit** (dépend du job d'expiration, §11.5, lui-même non commencé)

**1. Création de boutique & multi-boutique (BF-79→85)**
- [x] **Fait le 2026-09-25.** Assistant de création en popup, par étapes (infos → logo optionnel avec recadrage → récapitulatif → abonnement) — `CreateShopWizard`, remplace le formulaire "créer ma boutique" encore non construit noté en fin de §11.6. Vérifié en direct contre le serveur dev + vrai Firebase (Playwright) ; a révélé et corrigé un bug réel en cours de vérification — voir `06-journal-progression.md`.
- [x] **Fait (session non journalisée, reprise et complétée le 2026-09-25).** Page "Gestion de boutique" (BF-87, `/dashboard/shops`, `ShopManagementPageContent`) : liste toutes les boutiques du commerçant (`ShopService.listMyShops`), badge de statut (publiée/brouillon/abonnement expiré), bascule vers une boutique via `AuthService.switchShop` (change `profile.shopId`), relance `CreateShopWizard` pour une 2ᵉ boutique.
- [x] **Fait.** Publier/dépublier (BF-88) : bascule dans `ShopSettingsForm` (Paramètres) + `PublicationBanner` (bandeau persistant tant que `isPublished` est faux, incite à publier).

**2. Corbeille générique (BF-99/100)** — avant le Module 3 (Stock) et les fonctionnalités de suppression qui suivent, pour ne pas les recoder ensuite
- [x] **Fait (session non journalisée, reprise et complétée le 2026-09-25).** Champ `deletedAt` sur `Product`/`Category` + `TrashService` générique (`productTrashService`/`categoryTrashService`).
- [x] **Fait.** Page Corbeille (`/dashboard/trash`, `TrashPageContent`) : restaurer, ou supprimer définitivement avec compte à rebours annulable (5s, `CountdownDialog`).

**3. Publication produit & catégories (BF-89→90, BF-109→111)**
- [x] **Fait (session non journalisée, reprise et complétée le 2026-09-25).** `Product.isPublished` (distinct de la suppression, `ProductService.setPublished`/`isVisibleToCustomers`) ; `/catalogue` filtre dessus. **Marché (`/demo-catalogue` → vraies données) pas encore branché** — dépend du §7 ci-dessous, non commencé.
- [ ] Collection `CategoryTag` (Super Admin uniquement) + `Category.tagId` — **pas encore construit**

**4. Module 3 — Stock (BF-13→17)** *(toujours non commencé comme module à part entière — voir Phase 1 ci-dessus : une mécanique minimale de décrément/incrément vit maintenant dans le Module 4)*

**5. Module 4 — Commandes, avec le vocabulaire de statuts révisé (BF-18→23, BF-95→97)**
- [x] **Fait le 2026-09-25.** `OrderStatus` révisé dès la construction initiale du module (04-besoins-techniques.md §12.3) — jamais construit avec l'ancien vocabulaire `pending/confirmed/...`. `Order.clientId` optionnel (absent = commande manuelle, BF-21). Mutations (création, changement de statut) via Server Actions (`orderActions.ts`, `firebase-admin`, batch atomique avec l'ajustement de stock) plutôt que des écritures client directes — `firestore.rules` verrouille `orders` en écriture pour cette raison.
- [x] **Fait le 2026-09-25.** Traitement des retours : commentaire de motif obligatoire (`OrderReasonDialog`), choix `Retourné`/`Défectueux`, réincrémentation automatique du stock (`FieldValue.increment`).
- [x] **Fait le 2026-09-25 (clarifié avec l'utilisateur, hors périmètre initial de BF-95).** Annulation (BF-23) : `cancelled` ajouté comme 7ᵉ statut, accessible au client ou au commerçant tant que la commande est `under_review`, motif obligatoire, stock réincrémenté.
- [x] **Fait le 2026-09-25 (session parallèle).** Notification WhatsApp Business au commerçant à la création d'une commande (`src/lib/whatsappBusiness.ts`, Meta Cloud API) — identifiants Meta/WhatsApp pas encore configurés, voir 04-besoins-techniques.md §15.

**6. Fiche produit, avis & suivi client (BF-71→78)**
- [x] Page détail produit (BF-71, complète BF-37) + avis en lecture seule (BF-72) + rupture désactivée (BF-73) — 2026-09-25 (`/catalogue/[productId]`, nouveau modèle `Review`)
- [x] **Fait le 2026-09-25**, débloqué par le Module 4 : suivi de commande côté client (BF-75, `/mes-commandes`) et annulation (BF-23). **Toujours reporté** : feedback post-livraison (BF-76, soumission d'avis) et demande de retour côté client (BF-77, distinct de BF-96 qui est l'action commerçant) — non construits.
- [x] Interface de sélection du mode de paiement (BF-78) — 2026-09-25 (`/checkout/payment`), sans intégration réelle comme prévu §12.6 ; devenu le point d'entrée réel de BF-19 ("Confirmer ma commande" écrit une vraie commande).

**7. Page Marché (BF-108)** — dépend de #3 (produits publiés + tags)
- [ ] Généralise `/demo-catalogue` (données de démo, déjà construit le 2026-09-24) à de vraies données : 4 meilleures boutiques en tête, tous les produits publiés en dessous, triés par tag système

**8. Tableau de bord, factures & journal (BF-98, BF-102→104)** — dépendance sur le Module 4 levée le 2026-09-25
- [x] Journal d'activité (BF-98) étendu aux événements de commande (`order.created`/`order.status_changed`/`order.cancelled`/`order.returned`) — fait le 2026-09-25, en même temps que le Module 4.
- [ ] Filtre de ventes par intervalle (premium), factures groupées par période, journal d'activité imprimable — toujours pas construit

**9. Paramètres marchand avancés (BF-105→107, premium)**
- [ ] Moyens de contact configurables, réseaux sociaux avec validation de lien, statistiques de consultation

**10. Messagerie commerçant ↔ Super Admin (BF-112→116) & supervision Super Admin (BF-117→119)**
- [ ] Formulaire "Nous contacter" avec modèles + signature auto ; réponse Super Admin avec signature ManuShop
- [ ] Page Super Admin étendue : liste des commerçants, détail par commerçant (boutiques + privilèges premium actifs), activation/désactivation d'un privilège par boutique

**Reporté à la toute fin du développement** : intégration réelle d'un prestataire de paiement (BF-78) — décision explicite de l'utilisateur, aucune API choisie à ce stade.

**Reste à définir** : l'utilisateur a explicitement indiqué que d'autres fonctionnalités restent à préciser au-delà de ce qui précède.

**DoD Phase 1ter** : un commerçant peut créer plusieurs boutiques indépendantes (chacune avec son propre abonnement), gérer un cycle de commande complet jusqu'au retour/remboursement, rien n'est jamais perdu instantanément (corbeille), et un visiteur découvre l'ensemble des boutiques/produits publiés depuis la page Marché.

---

## Phase 2 — Social (≈2 semaines)

- [ ] **Module 8 — Publication multicanal** (BF-41→47) : partage WhatsApp/Facebook/Instagram/TikTok, génération visuel auto, planification, historique
- [ ] **Module 11 — Notifications** (BF-58→61) : nouvelle commande, stock bas, fin de promo, push PWA (FCM)
- [ ] Intégrations : WhatsApp Business Cloud API, Meta Graph API v21, TikTok Business API (créer comptes développeurs si pas fait en Phase 0)
- [ ] Implémenter le Strategy Pattern de publication (§4.5)

**DoD Phase 2** : une fiche produit peut être publiée en un clic sur au moins WhatsApp + Facebook.

---

## Phase 3 — Publicité payante (≈2 semaines)

- [ ] **Module 6 — Promotions** (BF-30→34) : création promo %/montant, dates, code promo, promo flash avec compteur
- [ ] **Module 9 — Publicité** (BF-48→52) : campagnes Facebook/Instagram Ads, ciblage, budget, suivi performance

**DoD Phase 3** : une campagne Facebook Ads peut être créée et suivie depuis l'app.

---

## Phase 4 — Croissance (continu)

- [ ] Analytics avancés, fidélisation (points clients), amélioration continue des promotions
- [ ] Internationalisation (structure i18n, BNF-45→47) si expansion prévue
- [ ] Préparation architecture multi-boutique (BNF-35)

---

## Suivi
Chaque module ci-dessus doit correspondre à une branche `feature/<module>` créée depuis `develop`, fusionnée dans `develop` par PR, puis livrée en production via PR `develop → main`.
