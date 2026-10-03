# Documentation des Besoins Fonctionnels — ManuShop

---

## Module 1 — Authentification & Gestion des Utilisateurs

| ID | Besoin | Description |
|---|---|---|
| BF-01 | Inscription | Le gérant crée un compte avec email/mot de passe (terminé). **BF-142, 2026-09-29** : `RegisterForm` n'avait aucun moyen d'afficher le mot de passe en clair, contrairement à `LoginForm` (déjà pourvu) — signalé par l'utilisateur. Interrupteur afficher/masquer ajouté sur les deux champs (mot de passe + confirmation), indépendants l'un de l'autre, même pattern (icône `Eye`/`EyeOff`) que `LoginForm`. |
| BF-02 | Connexion | Connexion sécurisée via Firebase Auth (terminé) |
| BF-03 | Rôles | 3 rôles : **Admin** (gérant), **Vendeur**, **Client** (partiel — Admin/Vendeur opérationnels ; le rôle Client n'a pas de flux de création dédié, voir Module 7) |
| BF-04 | Profil boutique | Configurer nom, logo, adresse, contacts de la boutique (terminé) |
| BF-05 | Récupération mot de passe | Réinitialisation par email (terminé) |
| BF-120 | Paramètres du compte (profil personnel) | Tout utilisateur connecté (client, vendeur, admin) peut modifier son nom, sa photo et son téléphone, consulter son identifiant de connexion/rôle/ancienneté, et changer son mot de passe (comptes email) — distinct des paramètres de boutique (BF-04). **Fait le 2026-09-25** : `/mon-compte`, accessible depuis le menu "Mon compte" (vitrine) et le menu du tableau de bord. |
| BF-121 | Notification de nouvelle version par email | À chaque nouvelle version de la plateforme, tous les comptes ayant un email renseigné sont notifiés. **Non commencé** — bloqué sur le choix d'un fournisseur d'email (aucun dans le projet actuellement, voir 04-besoins-techniques.md §13) ; la préférence "notifications par email" (`User.notifyByEmail`, opt-out) existe déjà côté compte via BF-120, prête à être consultée une fois le fournisseur choisi. Source de version envisagée : le champ `version` de `package.json`. |
| BF-123 | Session unique par compte | Un compte ne peut être connecté que sur un seul navigateur/appareil à la fois — se connecter ailleurs déconnecte automatiquement la session précédente. **Fait le 2026-09-26** : `User.activeSessionId`, régénéré à chaque première connexion sur un navigateur sans id local stocké ; `AuthProvider` écoute son propre profil en direct et se déconnecte dès que l'id ne correspond plus (voir 04-besoins-techniques.md §19). |
| BF-124 | Identité visible dans l'en-tête vitrine | La photo de profil et le nom de l'utilisateur connecté doivent être visibles dans le menu "Mon compte" de l'en-tête (pas seulement une fois le menu ouvert), avec une icône par défaut si aucune photo n'est fournie ; sur la page boutique dédiée (BF-64), l'en-tête doit afficher le logo et le nom de CETTE boutique plutôt que la marque générique ManuShop. **Fait le 2026-09-26** : `AccountMenu` (`StorefrontHeader`) affiche désormais l'avatar (`User.photoURL`/initiale de repli) et le nom directement sur le bouton déclencheur ; nouveau `ShopBrandingProvider` (contexte React) permet à `/boutique/[shopId]` de faire remonter le logo/nom de la boutique jusqu'à `StorefrontHeader`, rendu par le layout parent (voir 04-besoins-techniques.md §21). |
| BF-125 | Découverte de toutes les boutiques depuis le catalogue | Le catalogue agrégé (`/catalogue`, BF-108) doit permettre de découvrir les boutiques elles-mêmes, pas seulement leurs produits mélangés — un aperçu de quelques boutiques avec une flèche "Voir toutes les boutiques" vers une page dédiée qui les liste toutes ; choisir une boutique depuis cette page renvoie vers sa page dédiée (BF-64). **Fait le 2026-09-26** : bloc "Boutiques" dans `MarketCataloguePageContent` (aperçu de 6 boutiques déduites des produits affichés) + nouvelle page `/boutiques` (`AllShopsPageContent`, toutes les boutiques publiées) ; les deux réutilisent `ShopSummaryCard`, qui renvoie vers `/boutique/[shopId]`. |
| BF-126 | Simulation de BF-108/BF-125 dans le catalogue de démo | Le catalogue de démo (`/demo-catalogue`, données fictives) doit simuler le même comportement que le vrai catalogue multi-boutique : grille de produits mélangés (plus de sections par boutique), bloc "Boutiques" avec flèche vers une page listant toutes les boutiques de démo, chaque boutique choisie renvoyant vers sa propre page de démo. **Fait le 2026-09-26** : logique de grille/filtre/bloc boutique extraite dans `CatalogueExplorer` (partagée entre `MarketCataloguePageContent` et `/demo-catalogue`) ; nouvelles pages `/demo-catalogue/boutiques` et `/demo-catalogue/boutique/[shopId]` (équivalents démo de `/boutiques` et `/boutique/[shopId]`, jamais de Firestore). |
| BF-127 | Animation au survol/focus des images produit et boutique | Les images de produit (`StorefrontProductCard`) et de boutique (`ShopSummaryCard`) doivent réagir visuellement au survol et au focus clavier de leur carte. **Fait le 2026-09-26** : zoom léger (`scale-110`, transition 300ms) sur l'image via `group-hover`/`group-focus-visible` (Tailwind) — le focus clavier sur la carte-lien produit le même effet que le survol souris, pas seulement `:hover`. Même traitement pour la carte produit de la landing page (`ui/ProductCard.tsx`, via `:hover`/`:focus-within` en SCSS, la carte n'étant pas elle-même un lien). |
| BF-128 | Informations vendeur sur la fiche produit | La fiche produit doit afficher un bloc "vendeur" : logo, nom (lien vers `/boutique/[shopId]`), description, durée d'existence de la boutique, et lien vers sa page du réseau social principal (Instagram, Facebook... selon la boutique). **Fait le 2026-09-27** : `Shop.description` (nouveau champ, éditable dans `ShopSettingsForm`, section "Profil de la boutique") ; le lien de réseau social réutilise `Shop.primarySocialNetwork` (déjà existant mais jamais connecté à une vraie URL jusqu'ici) — un seul champ de formulaire dynamique ("Lien de votre page {réseau}") plutôt que 4 champs toujours visibles, voir `lib/shopSocialNetworks.ts`. Durée d'existence calculée depuis `Shop.createdAt` (`lib/shopAge.ts`). `ProductDetailPageContent` charge la boutique du produit en plus du produit lui-même. |
| BF-129 | Favoris persistants | Le cœur sur un article doit enregistrer un vrai favori (pas seulement un état visuel local qui se perd au rechargement), avec une page "Mes favoris" pour les retrouver. **Fait le 2026-09-27** : `User.favoriteProductIds` (tableau d'ids produit, `arrayUnion`/`arrayRemove` — pas de sous-collection). `AuthProvider` expose `toggleFavorite()` (mise à jour optimiste + persistance Firestore + annulation et toast en cas d'échec), consommé par `StorefrontProductCard`/`ProductDetailPageContent`. Nouvelle page `/mes-favoris` (`FavoritesPageContent`, sous `ProtectedRoute`), lien ajouté au menu "Mon compte" de `StorefrontHeader`. |
| BF-130 | Empêcher la survente au panier/à la commande | Un client a pu commander plus d'articles que le stock réel disponible, sans aucun avertissement. **Fait le 2026-09-27** : `cartStore` borne désormais la quantité au stock connu au moment de l'ajout (`CartItem.stock`), le bouton "+" du panier se désactive avec un message "Stock maximum atteint" une fois la limite atteinte. Défense en profondeur côté serveur : `createOrderAction` relit le stock réel de chaque produit dans une transaction Firestore avant d'écrire la commande, et rejette (message actionnable, montré au client) si la quantité demandée dépasse le stock disponible au moment de la commande — le contrôle client reste un confort, jamais la seule vérification. |

---

## Module 2 — Gestion du Catalogue Produits

| ID | Besoin | Description |
|---|---|---|
| BF-06 | Ajouter produit | Nom, description, prix, catégorie, photo, stock (terminé). **2026-10-02** : au moins une photo est désormais obligatoire à la création (formulaire + `firestore.rules`), et on ne peut plus retirer la dernière photo d'un produit. Les anciens produits sans photo restent modifiables mais sont signalés au commerçant (`ProductList`, tableau de bord + page Produits) tant qu'ils n'en ont pas. |
| BF-07 | Modifier produit | Mise à jour de toutes les informations (terminé) |
| BF-08 | Supprimer produit | Suppression avec confirmation (terminé) |
| BF-09 | Catégories | Créer/gérer des catégories (ex: Laitiers, Arômes, Emballages), avec description et bascule affichée/masquée (terminé) |
| BF-10 | Recherche produit | Recherche par nom ou catégorie (terminé) |
| BF-11 | Galerie photos | Ajouter plusieurs photos par produit (terminé) |
| BF-12 | Produit en vedette | Marquer un produit comme "en promotion" ou "populaire" (partiel — la promotion est complète (prix promo, date de fin) ; il n'existe aucun marqueur manuel "populaire", seul un badge "Nouveau" est dérivé automatiquement de la date de création) |

---

## Module 3 — Gestion du Stock

| ID | Besoin | Description |
|---|---|---|
| BF-13 | Suivi stock | Quantité disponible mise à jour automatiquement à chaque vente |
| BF-14 | Alerte stock bas | Notification quand le stock passe sous un seuil défini |
| BF-15 | Historique stock | Journal des entrées et sorties de stock |
| BF-16 | Réapprovisionnement | Enregistrer une entrée de stock manuellement |
| BF-17 | Stock par variante | Gérer les variantes (ex: taille d'emballage, parfum d'arôme) |

---

## Module 4 — Gestion des Commandes

**Fait le 2026-09-25** — construit directement avec le vocabulaire de statuts révisé (BF-95, voir Module 17) plutôt que l'ancien `pending/confirmed/delivering/delivered/cancelled` ci-dessous, resté en description historique de BF-20 uniquement.

| ID | Besoin | Description |
|---|---|---|
| BF-18 | Panier client | Le client ajoute des produits au panier. **Fait** (Module 7, `cartStore`, antérieur à cette tranche). |
| BF-19 | Passer commande | Le client soumet une commande avec ses coordonnées. **Fait** : `/checkout/payment` ("Confirmer ma commande") collecte nom/téléphone/adresse et écrit une vraie commande (`createOrderAction`), stock décrémenté atomiquement. |
| BF-20 | Suivi commande | Statuts : ~~En attente → Confirmée → En livraison → Livrée~~ — remplacé par le vocabulaire BF-95 dès la construction. **Fait** : `/mes-commandes` (client), `/dashboard/orders` (commerçant). |
| BF-21 | Commande manuelle | Le gérant crée une commande pour un client physique. **Fait** : bouton "Commande manuelle" sur `/dashboard/orders` (`ManualOrderDialog`), sans compte lié (`clientId` absent). |
| BF-22 | Historique commandes | Liste de toutes les commandes avec filtres. **Fait** : `/dashboard/orders`, filtre par statut (dont lien direct depuis la cloche de notification, `?status=under_review`). |
| BF-23 | Annulation commande | Annuler une commande avec motif. **Fait** : client (tant que `under_review`, `/mes-commandes`) ou commerçant (`/dashboard/orders`), motif obligatoire, stock réincrémenté. |

---

## Module 5 — Facturation

| ID | Besoin | Description |
|---|---|---|
| BF-24 | Génération facture | Facture automatique à chaque commande confirmée — **Fait le 2026-10-03**, à la **livraison** plutôt qu'à la confirmation (demande de l'utilisateur) : `updateOrderStatusAction` émet la facture (`ensureInvoice`, collection `invoices`, id = commande) dès qu'une commande passe « Livrée ». Tout y est figé à l'émission (vendeur, client, articles, TVA, devise et taux, couleur). Une commande livrée avant cette date, ou dont l'émission a échoué, reçoit sa facture au premier téléchargement. |
| BF-25 | Aperçu facture | Visualiser la facture avant impression — **Non fait** : la facture se télécharge directement en PDF (BF-26), que le navigateur ou le téléphone ouvre ensuite. |
| BF-26 | Téléchargement PDF | Exporter la facture en PDF — **Fait le 2026-10-03** : bouton « Facture » dans « Mes commandes » (client) et dans Commandes (gérant et vendeur), sur les commandes livrées, retournées ou défectueuses. Le PDF est produit par le serveur (`/api/factures/[orderId]`, `@react-pdf/renderer`), qui vérifie que l'appelant est le client de la commande ou l'équipe de sa boutique. Une facture longue passe sur plusieurs pages : en-tête et en-tête du tableau répétés à l'identique, totaux sur la dernière page avec au moins une ligne, pied de page et signature « Facture émise avec ManuShop » sur chaque page. |
| BF-27 | Envoi WhatsApp | Envoyer la facture directement via WhatsApp Business — **Non fait** (annoncé dans « Bientôt sur ManuShop »). |
| BF-28 | Numérotation | Numérotation automatique et séquentielle des factures — **Fait le 2026-10-03** : numéro continu par boutique (« F-00012 »), pris à un compteur (`invoiceCounters/{shopId}`) dans la même transaction que l'écriture de la facture : ni doublon ni trou, même avec deux livraisons simultanées. |
| BF-29 | Facture personnalisée | Logo, nom boutique, coordonnées sur chaque facture — **Fait le 2026-10-03**, sur le modèle fourni par l'utilisateur : logo de la boutique (son initiale s'il est absent ou illisible), nom de la boutique comme vendeur, adresse, téléphone, e-mail public. Nouvelle section « Facturation » des Paramètres : couleur de la boutique (palette ou choix libre), taux de TVA (0 par défaut, « TVA non applicable » ; les prix restent TTC, le HT et la TVA en sont déduits), NIU et RCCM facultatifs. |

---

## Module 6 — Promotions & Réductions

| ID | Besoin | Description |
|---|---|---|
| BF-30 | Créer promotion | Réduction en % ou montant fixe sur un produit ou catégorie |
| BF-31 | Promotion limitée | Définir une date de début et fin de promotion (partiel — **fin automatique faite le 2026-10-02** : la promotion s'arrête d'elle-même à la fin de sa journée de fin, heure du Cameroun, sur toute la vitrine et dans la facturation (`src/lib/promo.ts`) ; pas encore de date de **début** : une promotion cochée commence immédiatement) |
| BF-32 | Code promo | Générer et gérer des codes promotionnels |
| BF-33 | Promotion flash | Affichage spécial sur la boutique (compteur de temps) |
| BF-34 | Historique promos | Voir les promotions passées et leur impact |

---

## Module 7 — Boutique en Ligne (Vitrine Client)

*Anticipé en session (avant son tour dans l'ordre de travail initial), pour avancer sur `/catalogue` pendant que le Module 2 était frais. Voir le journal du 2026-09-21.*

| ID | Besoin | Description |
|---|---|---|
| BF-35 | Page d'accueil | Bannière, produits vedettes, promotions en cours (partiel — bannière/hero présents sur `/catalogue`, mais pas de section "produits vedettes" distincte : la vitrine liste tout le catalogue plutôt qu'une sélection. La landing page marketing `/` affiche encore des produits d'exemple fictifs (dégradés codés en dur), jamais reliés à Firestore) |
| BF-36 | Catalogue public | Tous les produits visibles sans connexion (terminé) |
| BF-37 | Fiche produit | Détail produit avec photos, prix, disponibilité (non commencé — aucune route de détail produit, la vitrine ne montre que la grille) |
| BF-38 | Recherche & filtres | Filtrer par catégorie, prix, disponibilité (partiel — recherche par nom et filtre par catégorie fonctionnels ; le prix n'a qu'un tri (croissant/décroissant), pas un filtre par plage ; pas de filtre par disponibilité/stock) |
| BF-39 | Contact rapide | Bouton "Commander via WhatsApp" sur chaque produit (adapté — décision prise en session, voir journal : panier local persistant + un seul bouton "Commander via WhatsApp" au moment du paiement, plutôt qu'un bouton par produit, pour permettre un vrai panier multi-articles) |
| BF-40 | Mode hors ligne | Consultation du catalogue même sans connexion (PWA) (partiel — app installable, images mises en cache par le service worker ; la persistance hors-ligne de Firestore n'est pas activée, donc les données produits elles-mêmes ne sont pas garanties disponibles sans connexion) |
| BF-122 | Catalogue de démo conditionnel | `/demo-catalogue` (données fictives, construit le 2026-09-24) ne doit plus s'afficher — ni comme repli automatique depuis `/catalogue`, ni en accès direct — une fois qu'au moins une vraie boutique publiée de la plateforme a un produit visible réel. Un Super Admin peut aussi la désactiver explicitement, indépendamment de l'état réel. **Fait le 2026-09-26** : nouvelle collection `configuration` (`configuration/general.demoCatalogueEnabled`, gérée à la main comme `platformAdmins`) + détection automatique plateforme-wide (voir 04-besoins-techniques.md §19). **Interrupteur Super Admin ajouté le 2026-09-27** : `/super-admin/reglages` permet désormais d'activer/désactiver l'affichage de la démo depuis l'interface (`configurationActions.ts`), sans passer par la console Firebase (voir 04-besoins-techniques.md §37). |

---

## Module 8 — Publication Multicanal

| ID | Besoin | Description |
|---|---|---|
| BF-41 | Publication WhatsApp | Partager un produit/promo sur WhatsApp Business |
| BF-42 | Publication Facebook | Publier sur la page Facebook de la boutique |
| BF-43 | Publication Instagram | Publier sur le compte Instagram |
| BF-44 | Publication TikTok | Partager sur TikTok |
| BF-45 | Génération visuel | Créer automatiquement une image de publication avec le produit |
| BF-46 | Planification | Programmer une publication à une date/heure précise |
| BF-47 | Historique publications | Voir toutes les publications passées et leurs performances |

---

## Module 9 — Publicité Payante

| ID | Besoin | Description |
|---|---|---|
| BF-48 | Créer campagne Facebook | Lancer une pub Facebook Ads depuis l'app |
| BF-49 | Créer campagne Instagram | Lancer une pub Instagram depuis l'app |
| BF-50 | Ciblage audience | Définir pays, âge, intérêts de l'audience ciblée |
| BF-51 | Budget campagne | Définir le budget journalier ou total |
| BF-52 | Suivi performance | Voir les résultats : portée, clics, conversions |

---

## Module 10 — Tableau de Bord & Rapports

*Anticipé en session (avant son tour dans l'ordre de travail initial) pour la refonte de `/dashboard` sur une maquette fournie. Voir le journal du 2026-09-21.*

| ID | Besoin | Description |
|---|---|---|
| BF-53 | Dashboard général | Chiffre d'affaires, commandes, stock en un coup d'œil. **Fait le 2026-09-25** : cartes "Ventes du mois" (total des commandes `delivered` du mois), "Commandes du mois", "Nouveaux clients" (`clientId` distincts du mois) et "Produits actifs" toutes réelles, plus "Ventes récentes" (5 dernières commandes) — débloqué par le Module 4. |
| BF-54 | Rapport ventes | Ventes par jour, semaine, mois. **Fait le 2026-10-02, avec les gains** : page `/dashboard/stats` (gérant uniquement) — chiffre d'affaires, coût d'achat, gain et marge des commandes livrées, par article, catégorie, semaine et mois, sur cette semaine / ce mois / cette année / une période personnalisée, plus la valeur du stock au prix d'achat. Repose sur le prix d'achat saisi sur chaque produit (voir 04-besoins-techniques.md). |
| BF-55 | Produits populaires | Top produits les plus vendus (non commencé — les commandes existent désormais, mais aucun classement par produit n'est encore calculé) |
| BF-56 | Rapport stock | Produits en rupture ou stock bas (partiel — compte affiché sur le tableau de bord + colonne "Statut" dans la table produits ; pas de page de rapport dédiée) |
| BF-57 | Export données | Exporter les rapports en CSV ou PDF (non commencé) |

---

## Module 11 — Notifications

| ID | Besoin | Description |
|---|---|---|
| BF-58 | Notification nouvelle commande | Alerte immédiate au gérant |
| BF-59 | Notification stock bas | Alerte quand stock sous le seuil |
| BF-60 | Notification promotion | Rappel de fin de promotion imminente |
| BF-61 | Push notification | Notifications PWA sur mobile |

---

## Module 12 — Plateforme Multi-Boutique & Super Administration

*Ajouté le 2026-09-21, révisé le même jour après précisions — changement de modèle : ManuShop devient une plateforme sur laquelle plusieurs commerçants publient chacun leur propre boutique, au lieu d'une seule boutique digitalisée. Voir §10 de [01-business-plan.md](./01-business-plan.md) et §11 de [04-besoins-techniques.md](./04-besoins-techniques.md) pour le détail technique et les points encore ouverts.*

| ID | Besoin | Description |
|---|---|---|
| BF-62 | Publication de la boutique | Depuis Paramètres, le gérant active/désactive la visibilité publique de sa boutique (brouillon vs. publiée). Non commencé. |
| BF-63 | Annuaire des boutiques | Remplace/complète l'actuel `/onboarding` : liste les boutiques publiées. Tant qu'il y en a peu ou pas, affiche des boutiques factices non cliquables ("virtuelles") pour ne pas paraître vide — un clic dessus redirige vers un article Google externe plutôt que vers une page interne inexistante. Non commencé. |
| BF-64 | URL dédiée par boutique | Chaque boutique publiée est accessible via une URL propre. **Fait le 2026-09-25, version simplifiée** (clarifié avec l'utilisateur) : `/boutique/{shopId}` — l'id Firestore de la boutique tel quel plutôt que le token opaque `ownerId`+`shopId` envisagé initialement (déjà une chaîne non séquentielle, donc déjà "opaque" en pratique ; encodage supplémentaire jugé sans bénéfice réel). Route additionnelle, `/catalogue` (mono-tenant) inchangé. Schéma `/{tokenOpaque}/{nomDePage}/{nomDuComposant}` (nom de page/composant précis) resté hors scope — une seule page (le catalogue) pour l'instant, pas de migration complète du routage storefront. |
| BF-65 | Page d'accueil de la boutique publiée | Vitrine publique de la boutique : logo, nom, tous les articles, et les autres éléments que la plateforme permet de publier. Non commencé. |
| BF-66 | Actions client sur une boutique publiée | Un client peut consulter le catalogue, ajouter au panier, commander (WhatsApp, comme BF-39), et visiter la page Facebook/Instagram/TikTok/WhatsApp Business de la boutique — uniquement les réseaux réellement renseignés par le gérant et sur lesquels l'article concerné a été publié. Non commencé. |
| BF-67 | Rôle Super Admin | Unique, réservé à l'éditeur de la plateforme. **Ce n'est pas un rôle sur le compte utilisateur** : c'est l'appartenance à une collection Firestore dédiée (`platformAdmins`, indexée par email), renseignée uniquement à la main depuis la console Firebase. Aucun chemin applicatif, aucune règle Firestore, ne doit permettre de l'obtenir ou de l'accorder — même à un Super Admin déjà en place. **Fait le 2026-09-21** : collection et règles en place ; page de gestion pas encore construite. |
| BF-68 | Gestion des comptes payants | Le Super Admin retrouve un compte par pseudo/email/téléphone et lui attribue ou lui retire le rôle Admin manuellement (sans durée, jusqu'à révocation) — chemin indépendant de l'abonnement (BF-69). Non commencé (règles Firestore prêtes, page de recherche/attribution pas construite). |
| BF-69 | Abonnement payant avec expiration automatique | Un client clique "créer ma boutique", choisit une durée (quotidienne/hebdomadaire/mensuelle/trimestrielle/annuelle) et paie. Une fois le paiement confirmé, le compte devient automatiquement Admin pour la durée choisie. À l'expiration, un traitement serveur repasse le compte en Client automatiquement ; une tentative d'accès au dashboard après expiration redirige vers la page cliente de sa propre boutique (BF-70). Non commencé — moyen de paiement pas décidé, et l'expiration automatique nécessite une tâche planifiée avec un accès Firestore privilégié que le projet n'a pas aujourd'hui (voir 04-besoins-techniques.md §11.5, point ouvert). |
| BF-70 | Rétrogradation en fin d'abonnement | Un ex-admin dont l'abonnement a expiré est redirigé vers la page cliente de sa propre boutique (toujours publiée) lorsqu'il tente d'accéder à son ancien tableau de bord : il peut consulter ses articles, plus rien d'autre. Non commencé. |

**Révisions du 2026-09-21 par rapport à la première rédaction de ce module, à ne pas reproduire** : l'inscription (email/mot de passe, Google, Facebook, téléphone, anonyme) **ne crée plus jamais** un compte `role: 'admin'` directement — corrigé dans `AuthService` et `firestore.rules` le même jour (voir journal). Le rôle Super Admin n'est plus non plus une valeur possible du champ `role` sur `users` (supprimé de `UserRole`) : remplacé par la collection `platformAdmins` décrite en BF-67.

**Révision du 2026-09-25** : les méthodes de connexion par téléphone et anonyme, ajoutées le 2026-09-21 (paragraphe ci-dessus), ont été **retirées** sur demande explicite de l'utilisateur — `/login` ne propose plus que email/mot de passe, Google et Facebook. Voir le journal pour le détail.

---

## Modules 13→22 — Spécification détaillée du parcours Client/Commerçant/Super Admin (2026-09-25)

*Ajouté le 2026-09-25, à partir d'une spécification fonctionnelle complète fournie par l'utilisateur, couvrant les trois niveaux de privilège en détail. Révise/complète le Module 12 plutôt que de le remplacer : BF-62→70 restent valables. Voir §12 de [04-besoins-techniques.md](./04-besoins-techniques.md) pour le détail technique (modèles de données, migration) et la Phase 1ter de [05-plan-de-travail.md](./05-plan-de-travail.md) pour l'ordre de construction retenu.*

**Changement structurant à noter avant de lire ce qui suit** : un commerçant peut désormais posséder **plusieurs boutiques**, chacune avec son **propre cycle d'abonnement indépendant** — un abonnement finance une boutique précise, pas le compte entier. Ça change où vivent `adminSource`/`subscriptionPlan`/`subscriptionExpiresAt` : ils déménagent de `User` vers `Shop` (voir 04-besoins-techniques.md §12.1). `role: 'admin'` sur `User` devient un indicateur grossier ("possède au moins une boutique"), plus la source de vérité sur l'état de l'abonnement.

**Décisions prises avec l'utilisateur avant d'écrire cette section** :
- Le rôle `seller` (vendeur invité par un admin pour l'aider à gérer SES boutiques, déjà construit via `TeamList`/`InviteSellerForm`) est confirmé **conservé** — cette spécification s'ajoute par-dessus, elle ne le remplace pas.
- Les tags colorés de catégorie (Module 20) forment une **liste fixe gérée exclusivement par le Super Admin** — un commerçant choisit un tag existant, il n'en crée pas de nouveau.

### Module 13 — Fiche Produit & Avis Client

| ID | Besoin | Description |
|---|---|---|
| BF-71 | Fiche produit détaillée | Page de détail d'un article (photos, description, prix, disponibilité) — complète BF-37 (Module 7). **Fait le 2026-09-25** : `/catalogue/[productId]`, données réelles via `ProductService.getProduct()`. |
| BF-72 | Avis produit | Le client consulte les avis/feedback laissés sur ce produit, affichés sur sa fiche détail. **Fait le 2026-09-25** (lecture seule) : nouveau modèle `Review` + `ReviewService.listByProduct()`, affiché sur la fiche produit avec un état honnête "Aucun avis pour le moment" tant qu'aucun avis n'existe réellement. La **soumission** d'un avis est maintenant construite, voir BF-76 (2026-09-29). |
| BF-73 | Produit en rupture désactivé | Un produit à stock 0 reste visible dans la page boutique mais son ajout au panier est désactivé, plutôt que d'être masqué. **Fait le 2026-09-25**, sur la fiche produit (via `ProductService.getStockStatus()`, déjà existant). |

### Module 14 — Commande, Suivi & Retour Client

| ID | Besoin | Description |
|---|---|---|
| BF-74 | Commande réservée aux comptes complets | Un visiteur non connecté est redirigé vers la connexion avant de valider une commande. **Fait le 2026-09-25** : `/checkout/payment` protégé par `ProtectedRoute`. La nuance "compte anonyme doit d'abord compléter son profil" n'a plus lieu d'être — l'authentification anonyme a été retirée le 2026-09-25 (voir journal), tout compte connecté a donc nécessairement un profil complet. **Complété le 2026-09-29 par BF-143** (avertissement explicite + retour automatique à la commande après connexion) — voir cette entrée pour le détail. La redirection silencieuse de `ProtectedRoute` (`/catalogue`, sans explication) reste inchangée pour un accès direct à `/checkout/payment` en dehors du panier (ex. URL tapée à la main) : non demandé cette tranche, incohérence connue à corriger si besoin. |
| BF-75 | Suivi de commande | Le client consulte l'état de sa commande (vocabulaire des statuts : voir Module 17, BF-95). **Fait le 2026-09-25** : `/mes-commandes` (`MyOrdersPageContent`), débloqué par le Module 4. |
| BF-76 | Feedback après livraison | Une fois la commande livrée, le client peut laisser un avis ; si le motif choisi est "commande défectueuse", un commentaire est transmis au vendeur via le moyen de contact qu'il a configuré (BF-106). **Fait le 2026-09-29**, demande explicite de l'utilisateur : `/mes-commandes` propose "Laisser un avis" sur chaque commande livrée (`ReviewDialog` — note en étoiles facultative, commentaire requis, case "Signaler un article défectueux", choix de l'article si la commande en contient plusieurs) ; `submitReviewAction` (Server Action) revérifie que la commande appartient bien à l'appelant et qu'elle est réellement livrée avant d'écrire (`firestore.rules` verrouille `reviews` en écriture directe, même schéma que `orders`). **Partiel sur un point** : "transmis au vendeur via le moyen de contact configuré (BF-106)" n'est PAS construit littéralement — aucune brique d'envoi email/SMS n'existe dans le projet (`Shop.contactEmail`/`urgentPhone` restent des champs jamais consommés, voir 04-besoins-techniques.md §13/§60) ; un avis "défectueux" est simplement marqué `reason: "defective"` et reste visible comme n'importe quel avis sur la fiche produit (BF-72) — pas de canal de transmission actif séparé. **Revu le 2026-10-02** (demande de l'utilisateur) : `ReviewDialog` est remplacé par une page d'avis par commande, `/mes-commandes/[orderId]/avis`, ouverte depuis « Donner mon avis » ou depuis la notification envoyée quand la commande passe « Livrée » (cloche de la vitrine, collection `notifications`). Étape par étape : la livraison (note et commentaire **privés**, `orderFeedback/{orderId}`, `submitDeliveryFeedbackAction`), puis chaque article (avis public, comme avant). Chaque étape est enregistrée dès l'envoi, peut être passée, et s'affiche ensuite en lecture seule avec la réponse de la boutique. Côté commerçant, voir BF-101. |
| BF-77 | Retour & remboursement | Le client peut demander le retour d'un article livré et un remboursement. **Non commencé** — distinct de BF-96 (Module 17, fait) : BF-96 est une action **commerçant** (marquer une commande livrée comme Retournée/Défectueuse) ; BF-77 est la **demande côté client** qui déclencherait ça, pas encore construite. |
| BF-78 | Sélection du mode de paiement (interface uniquement) | Choix entre Visa, Orange Money, MTN Mobile Money à l'écran de paiement. **Aucune intégration réelle pour l'instant** — l'utilisateur compte choisir une API de paiement gratuite ou peu coûteuse en fin de développement ; seule l'interface de sélection est construite maintenant (voir 04-besoins-techniques.md §12.6). **Fait le 2026-09-25** : `/checkout/payment`, accessible depuis `CartPanel` ("Choisir un mode de paiement", à côté du bouton WhatsApp existant qu'il ne remplace pas) ; le bouton "Payer" affiche honnêtement que ce n'est pas encore disponible plutôt que de simuler un succès. |
| BF-143 | Avertissement de connexion avant de passer commande | Un visiteur non connecté qui essaie de passer commande voit un avertissement expliquant qu'il doit se connecter (en le rassurant sur son panier), plutôt que d'être redirigé silencieusement. En cliquant "Se connecter", il est amené à `/login` en mémorisant la page de commande, pour y revenir automatiquement une fois connecté. S'il crée un compte à la place, un message de succès s'affiche et il est renvoyé vers `/login` en lui demandant explicitement de se connecter pour continuer. **Fait le 2026-09-29** : `LoginRequiredDialog` (nouveau) intercepte le clic sur "Choisir un mode de paiement" dans `CartPanel` quand `firebaseUser` est absent — le bouton WhatsApp, lui, reste volontairement accessible sans compte (BF-78, son seul intérêt). La cible est mémorisée via `?redirect=` (validé contre les redirections ouvertes, `isSafeRedirectTarget`), consommé par `LoginForm` (connexion email/mot de passe et sociale) à la place du `/dashboard` habituel, et par `GuestRoute` si le visiteur est déjà connecté. Créer un compte depuis ce contexte (`RegisterForm`) affiche `toast.success`, force une déconnexion (`createUserWithEmailAndPassword` connecte sinon automatiquement le nouveau compte) et renvoie vers `/login?redirect=...&registered=1`, qui affiche un bandeau contextuel. Comportement de création de compte HORS de ce contexte (sans `?redirect=`) inchangé — direction `/catalogue` comme avant. Voir 04-besoins-techniques.md §58. |

### Module 15 — Création de Boutique en Plusieurs Étapes

| ID | Besoin | Description |
|---|---|---|
| BF-79 | Bouton "Créer ma boutique" | Accessible depuis un menu/bouton à tout usager connecté, ouvre un formulaire en popup. **Fait le 2026-09-25** : entrée "Créer ma boutique" dans le menu compte (`StorefrontHeader`), visible pour tout `client` connecté. |
| BF-80 | Assistant de création par étapes | Formulaire multi-étapes dans une modale : informations de la boutique, logo, récapitulatif, puis abonnement. **Fait le 2026-09-25** : `CreateShopWizard`, 4 étapes dans une `Dialog`. Nécessitait une migration de modèle non anticipée à l'origine (voir `04-besoins-techniques.md` §12.1) : un `client` ne pouvait littéralement pas devenir `admin` via aucune écriture directe (règles Firestore), donc la création passe par une Server Action privilégiée (`createShopAction`), même schéma que l'attribution manuelle du Super Admin (BF-68). |
| BF-81 | Logo de la boutique | Champ optionnel — choix dans la galerie locale ou saisie d'un lien (case à cocher pour basculer entre les deux modes), avec possibilité de recadrer l'image. Un logo par défaut reste affiché tant qu'aucun n'est fourni. **Fait le 2026-09-25** : `ShopLogoStep`, bascule Galerie/Lien, recadrage carré (réutilise `ImageCropDialog`/`cropImageToSquare`, comme les images produit). |
| BF-82 | Récapitulatif avant validation | Avant-dernière étape de l'assistant : relecture de toutes les informations saisies avant de continuer. **Fait le 2026-09-25** : champs non renseignés affichés honnêtement "Non renseigné", jamais de valeur fabriquée. |
| BF-83 | Choix de l'abonnement en fin de création | Dernière étape : sélection de la durée d'abonnement (quotidien/hebdomadaire/mensuel/trimestriel/annuel) avec la description de chaque offre. Un abonnement est attaché à **cette boutique précise**, pas au compte. **Fait le 2026-09-25** : `SUBSCRIPTION_PLANS` (`src/lib/subscriptionPlans.ts`), offre Annuel présélectionnée avec badge "Meilleure offre". **Prix repris tels quels de la maquette générée par l'outil de design — ce sont des placeholders, pas une décision business validée**, à confirmer avant tout lancement réel. |
| BF-84 | Annulation de la création | Fermer/annuler l'assistant avant la fin efface toutes les informations saisies — rien n'est conservé. **Fait le 2026-09-25** : `reset()` du formulaire à la fermeture ; sûr car aucune écriture Firestore n'a lieu avant la confirmation finale. |
| BF-85 | Multi-boutique par commerçant | Un même compte peut posséder plusieurs boutiques ; chaque nouvelle boutique repasse par tout l'assistant (BF-80→84), abonnement compris. Une fois l'abonnement choisi et confirmé, le commerçant est redirigé vers la page admin de sa nouvelle boutique. **Fait le 2026-09-25** : redirection vers `/dashboard`, qui résout déjà la boutique du profil courant (`shopId`, mis à jour par `createShopAction`) — pas besoin de routing dédié par id de boutique. |

### Module 16 — Espace Commerçant Étendu

| ID | Besoin | Description |
|---|---|---|
| BF-86 | Accès aux pages client depuis l'espace admin | Un commerçant retrouve toutes les fonctionnalités client (catalogue, etc.) via des menus/boutons dédiés, en plus de son propre espace de gestion. |
| BF-87 | Page "Gestion de boutique" | Liste toutes les boutiques du commerçant connecté, chacune gérée indépendamment des autres. |
| BF-88 | Publier/dépublier une boutique | Un bouton et une notification incitent le commerçant à publier sa boutique (BF-62) ; le réglage se trouve dans les Paramètres généraux de la boutique, où il peut aussi la dépublier lui-même à tout moment. |
| BF-89 | Catégorie active avant création d'un produit | Un produit ne peut être créé que s'il est associé à une catégorie déjà **active** — cohérent avec BF-09/le comportement déjà construit de `CategoryManager` (une catégorie créée n'est visible que dans la page Catégories tant qu'elle n'est pas activée). |
| BF-90 | Publication d'un produit distincte de sa suppression | Un produit créé n'est visible côté client qu'une fois **publié** ; le retirer de la vente ne fait que dépublier le produit, sans le supprimer (le stock/l'historique restent intacts). Nécessite un champ de publication sur `Product`, absent du modèle actuel (voir 04-besoins-techniques.md §12.2). |
| BF-91 | Partager le lien de la boutique | Bouton dédié copiant/partageant l'URL publique de la boutique (BF-64). **Fait le 2026-09-25** : `ShareShopLinkButton` (copier le lien, WhatsApp, email, partage natif si disponible) dans les paramètres de boutique et la gestion multi-boutique — affiché uniquement quand la boutique est réellement publiée. |
| BF-92 | Gestion du stock | Suivi du stock comme dans une boutique physique — rejoint le Module 3 (BF-13→17), toujours non commencé. |
| BF-93 | Fin d'abonnement, accès restreint | Une boutique dont l'abonnement a expiré reste consultable (commandes, stock) mais ne peut plus rien publier de nouveau ; les menus nécessitant un abonnement actif disparaissent de son espace admin. Révise BF-70 : la restriction s'applique désormais **par boutique**, pas en rétrogradant tout le compte. |
| BF-94 | Toute publication est premium | La visibilité publique (boutique comme produits) nécessite un abonnement actif sur la boutique concernée. |
| BF-144 | Fichier clients du commerçant | Page `/dashboard/clients` (gérant et vendeurs) : liste des clients reconstituée à partir des commandes de la boutique (les comptes clients ne lui sont pas lisibles) — même client regroupé par téléphone, sinon par compte, sinon par nom ; nombre de commandes, total dépensé (commandes livrées), dernière commande ; repères Nouveau / Fidèle / Inactif servant de filtres ; recherche par nom ou numéro, tri, export CSV ; fiche client avec appel, WhatsApp et historique des commandes. **Fait le 2026-10-02.** |
| BF-145 | Devise de la boutique appliquée aux clients | La devise configurée par la boutique (FCFA, euro, dollar US) s'applique à tous ses articles côté clients : vitrine, fiche produit, Marché, panier, message WhatsApp, paiement, « Mes commandes ». **Fait le 2026-10-02** : prix saisis et enregistrés en FCFA (devise de référence — commandes et gains aussi), affichés convertis ; euro à la parité fixe officielle (655,957), dollar au taux saisi par le Super Admin (Réglages), FCFA tant qu'il n'est pas fixé. Le commerçant voit un aperçu de ses prix côté client. Corrige au passage le panier, qui envoyait toute commande à la première boutique de la plateforme : un panier ne contient plus que les articles d'une seule boutique, revérifié par le serveur. |
| BF-146 | Préparation multilingue | Fichiers de langue français/anglais (`src/i18n/dictionaries/`, convention du guide Next.js) et mécanisme de traduction typé (`useI18n`), utilisés dès maintenant pour les montants, les devises et les nouveaux textes. **Structure faite le 2026-10-02** ; reste, à l'étape langue : routage `app/[lang]`, sélecteur de langue, traduction de tous les écrans. |
| BF-147 | Référencement des boutiques et articles | Chaque boutique et chaque article publiés sont décrits aux moteurs de recherche. **Fait le 2026-10-02** : pages boutique et article rendues côté serveur avec titre, description (celle de la boutique ou de l'article, sinon une phrase construite), URL canonique et aperçu de partage (logo, photos) ; données structurées schema.org `Store` et `Product` (prix affiché aux clients, devise, disponibilité) ; texte alternatif descriptif sur les photos d'articles ; `sitemap.xml` (boutiques publiées et articles visibles, régénéré toutes les heures) et `robots.txt` (espaces privés exclus) ; boutiques non publiées et articles masqués en `noindex`. **Chaque boutique est présentée comme le site propre de son commerçant** (modèle d'abonnement) : sur ses pages, titre, nom du site, icône (son logo) et descriptions sont les siens, sans aucune mention de ManuShop. |

### Module 17 — Statuts de Commande, Retours & Corbeille

| ID | Besoin | Description |
|---|---|---|
| BF-95 | Statuts de commande étendus | `En cours d'analyse → Prêt pour la livraison → Livraison en cours → Livré`, puis `Retourné` ou `Défectueux` comme issue possible depuis "Livré". **Fait le 2026-09-25** : implémenté dès la construction du Module 4 (`OrderStatus`), sans jamais passer par l'ancien vocabulaire. `Annulée` ajoutée en 7ᵉ valeur pour couvrir BF-23 (clarifié avec l'utilisateur — hors périmètre initial de BF-95). |
| BF-96 | Traitement d'un retour | Le commerçant renseigne un commentaire expliquant le motif du retour avant de rembourser le client ; une fois le remboursement effectué, le statut passe à `Retourné` et le stock du produit concerné est automatiquement réincrémenté. **Fait le 2026-09-25** : motif obligatoire (`OrderReasonDialog`), stock réincrémenté atomiquement (`FieldValue.increment`) — remboursement lui-même hors scope (pas d'intégration de paiement réelle, voir BF-78). |
| BF-97 | Motif "défectueux" | Si le retour est motivé par un défaut du produit, le commerçant choisit explicitement le statut `Défectueux` plutôt que `Retourné` (deux issues distinctes, pas une simple note sur "Retourné"). **Fait le 2026-09-25**, en même temps que BF-96. |
| BF-98 | Journal des opérations commerçant | Chaque action du commerçant (produit, catégorie, commande, retour...) est consignée dans un journal structuré, exploitable pour imprimer un rapport. |
| BF-99 | Corbeille générique | Tout élément supprimé (produit, catégorie, et tout ce qui suivra le même schéma) est déplacé dans une corbeille plutôt que supprimé immédiatement. Depuis la corbeille : restauration, ou suppression définitive après confirmation. |
| BF-100 | Confirmation à compte à rebours | La suppression définitive depuis la corbeille déclenche un compte à rebours annulable ; cliquer sur Annuler avant qu'il n'atteigne zéro arrête le processus, rien n'est supprimé. |
| BF-101 | Feedback marchand sur commande livrée | Le commerçant reçoit et consulte les avis clients laissés sur les commandes livrées de sa boutique (miroir de BF-72/76 côté client). **Fait le 2026-10-02** : `/dashboard/avis` « Avis clients » (gérant et vendeur), avis regroupés par commande (livraison privée, articles publics avec le nom de l'article et la mention « Défectueux »), filtre « Sans réponse » par défaut, pastille du nombre d'avis sans réponse dans le menu. Le commerçant répond à chaque avis (`replyToFeedbackAction`, réservée à l'équipe de la boutique ; réponse modifiable) : le client est notifié dans l'application, et la réponse à un avis d'article s'affiche publiquement sous l'avis sur la fiche produit (« Réponse du vendeur ») ; celle sur la livraison reste privée. |

### Module 18 — Tableau de Bord, Rapports & Facturation Avancée

*Étend le Module 10 (BF-53→57) plutôt que de le dupliquer.*

| ID | Besoin | Description |
|---|---|---|
| BF-102 | Filtre de ventes par intervalle (premium) | Le tableau de bord filtre les ventes par jour/semaine/année, borné entre la date-heure de création de la boutique (minimum) et la date-heure du jour (maximum). **2026-10-02** : la période personnalisée est accessible à toutes les boutiques sur la page Gains et statistiques (choix de l'utilisateur), sans dépendre de ce privilège premium. |
| BF-103 | Consultation de facture | Voir la facture d'une commande individuelle (rejoint BF-24/25). — **Fait le 2026-10-03** par le téléchargement PDF (BF-26). |
| BF-104 | Factures groupées par période | Factures du jour, de la semaine, du mois et de l'année, consultables et imprimables (étend BF-26). |

### Module 19 — Paramètres Marchand Avancés (Premium)

| ID | Besoin | Description |
|---|---|---|
| BF-105 | Moyens de contact configurables | Le commerçant choisit comment il est contacté pour sa boutique (adresse email, message WhatsApp, message Facebook, message Instagram). **Fait le 2026-09-27** : section "Moyens de contact client" dans `/dashboard/shop`, réservée aux boutiques ayant le privilège premium `advancedContact` — un interrupteur par canal (désactivé tant que la coordonnée sous-jacente n'est pas renseignée), affiché sur la fiche produit (remplace le lien "Voir sur {réseau}" de BF-128 quand actif). Voir 04-besoins-techniques.md §39. |
| BF-106 | Réseaux sociaux affichés en pied de page | Une case à cocher par réseau (Instagram, Facebook, TikTok) — cocher révèle un champ pour saisir le lien correspondant. Le système vérifie que le lien est sécurisé (HTTPS, domaine attendu) avant d'autoriser l'enregistrement, pour limiter les liens frauduleux. **Fait le 2026-09-28, mécanisme révisé sur demande explicite de l'utilisateur** : pas de case à cocher séparée — un réseau (WhatsApp, Facebook, Instagram, TikTok) s'affiche en pied de page de la boutique (`/boutique/[shopId]`) dès que son lien est renseigné dans `/dashboard/shop`, réservé aux boutiques ayant le privilège premium `socialFooterLinks` (`ShopStorefrontPage` → `StorefrontFooter`, via `useShopBranding`). La validation reste la vérification de format d'URL déjà en place (`z.url()`), pas de contrôle HTTPS/domaine spécifique par réseau. Voir 04-besoins-techniques.md §55. |
| BF-107 | Statistiques de consultation de la boutique | Nombre de consultations, article le plus consulté, article le moins consulté, heure et localisation des visites. |

### Module 20 — Marché & Taxonomie de Catégories

| ID | Besoin | Description |
|---|---|---|
| BF-108 | Page Marché | Page publique listant les 4 meilleures boutiques en tête de page, puis tous les produits publiés de toutes les boutiques en dessous. Généralise `/demo-catalogue` (déjà construit en données de démo, voir journal du 2026-09-24) à de vraies données multi-boutiques. **Fait le 2026-09-26, version réduite** : `/catalogue` et la landing page affichent désormais de vraies données agrégées de toutes les boutiques publiées (basculent sur `/demo-catalogue` tant qu'aucune n'a de produit visible réel) — toujours sans les 4 meilleures boutiques en tête, mais le filtre par tag système est désormais fait (BF-110, 2026-09-29), voir 04-besoins-techniques.md §22 et §59. |
| BF-109 | Tags de catégorie système | Liste de tags colorés (ex. "Alimentation", "Mode", "Électronique"), créée et gérée **exclusivement par le Super Admin**. En créant une catégorie, un commerçant choisit un tag existant dans cette liste plutôt que d'en inventer un — garantit une taxonomie cohérente sur toute la plateforme malgré des noms de catégorie différents d'une boutique à l'autre. **Fait le 2026-09-27, gestion Super Admin uniquement** : `/super-admin/tags` permet de créer (nom + couleur), modifier (double-clic ou icône, ajouté le 2026-09-27, voir §47) et supprimer un tag (`CategoryTag`, `categoryTagActions.ts`). **Sélecteur côté commerçant ajouté le 2026-09-27** (§49) : `CategoryManager.tsx` (`/dashboard/categories`) permet désormais d'associer (et de retirer) un tag système à une catégorie, à la création comme à l'édition. Seul le tri du Marché par ce tag (BF-110, juste en dessous) reste non branché — le Marché continue de filtrer par nom de catégorie brut. |
| BF-110 | Tri de la page Marché par tag système | Le tri/filtre de la page Marché se fait sur ces tags système (BF-109), pas sur les noms de catégorie propres à chaque boutique. **Fait le 2026-09-29**, demande explicite de l'utilisateur : `useMarketCatalogue` résout désormais, pour chaque produit, le tag système de sa catégorie DANS sa propre boutique (`Category.tagId` → `CategoryTag`) et l'attache au produit ; `CatalogueExplorer` (`/catalogue`) construit ses pills de filtre à partir de ces tags plutôt que des noms de catégorie bruts — un produit dont la catégorie n'a pas de tag choisi n'apparaît dans aucun filtre (mais reste visible sous "Tous les produits"). `CataloguePageContent` (une boutique précise, `/boutique/[shopId]`) continue de filtrer par nom de catégorie brut, volontairement inchangé — ça garde un sens à l'intérieur d'UNE boutique. Voir 04-besoins-techniques.md §59. |
| BF-111 | Filtre catalogue boutique par catégories actives | Dans la page produits d'une boutique (côté client), le filtre ne propose que les catégories actives réellement associées à au moins un produit de cette boutique. |

### Module 21 — Messagerie Commerçant ↔ Super Admin

| ID | Besoin | Description |
|---|---|---|
| BF-112 | Formulaire "Nous contacter" (commerçant, premium) | Objet, corps, signature (initiales générées automatiquement à partir du nom et prénom du commerçant), et choix d'un modèle de mise en forme pour le message. **Fait le 2026-09-27, version réduite** : `/dashboard/support` — objet + corps libre, réservé aux boutiques ayant le privilège premium `contactForm` (revérifié côté serveur, pas juste masqué). Ni signature à initiales générées, ni choix de modèle de mise en forme — un ticket simple (voir 04-besoins-techniques.md §38). |
| BF-113 | Réception des messages (Super Admin) | Le Super Admin consulte les messages envoyés par les commerçants. **Fait le 2026-09-27** : `/super-admin/messages` liste tous les messages, toutes boutiques confondues. |
| BF-114 | Réponse du Super Admin | Réponse rédigée avec le même modèle de mise en forme que le message reçu ; la signature porte automatiquement "ManuShop" avec le logo de la plateforme, sans saisie manuelle. **Fait le 2026-09-27, version réduite** : une réponse par message (pas de fil de discussion), texte libre. Ni modèle de mise en forme, ni signature automatique "ManuShop" — non construits cette tranche. |
| BF-115 | Réception de la réponse (commerçant) | Le commerçant consulte la réponse du Super Admin à son message. **Fait le 2026-09-27** : la réponse apparaît directement sous le message correspondant dans `/dashboard/support`, pas de notification (BF-116, toujours non commencé). |
| BF-116 | Notifications push d'activité | Commerçant : nouvelle commande, nouveau message, nouveau feedback. Super Admin : nouveau message reçu. Étend le Module 11 (BF-58→61, toujours non commencé — nécessite Firebase Cloud Messaging). |

### Module 22 — Supervision Super Admin

| ID | Besoin | Description |
|---|---|---|
| BF-117 | Liste des commerçants | Le Super Admin consulte la liste des usagers ayant obtenu le statut commerçant (au moins une boutique). **Fait le 2026-09-27** : `/super-admin/commercants` liste chaque commerçant (déduit des boutiques groupées par propriétaire, `listMerchantsAction`), avec son nombre de boutiques. |
| BF-118 | Détail d'un commerçant | Pour un commerçant donné : nombre de boutiques détenues, et liste des privilèges premium actifs pour chacune. **Fait le 2026-09-27** : chaque ligne se déplie (pas de page séparée) pour révéler, par boutique, son statut de publication et ses privilèges premium actifs. |
| BF-119 | Activer/désactiver un privilège premium par boutique | Le Super Admin peut activer ou désactiver un privilège premium précis pour une boutique donnée d'un commerçant, indépendamment de l'état de son abonnement. **Fait le 2026-09-27** : interrupteur par privilège dans `/super-admin/commercants` (`Shop.premiumFeatures`, `setShopPremiumFeatureAction`), mise à jour optimiste avec retour arrière en cas d'échec. Les 5 privilèges couverts (`lib/premiumFeatures.ts`) correspondent à des besoins déjà documentés (BF-102, BF-105, BF-106, BF-107, BF-112) ; `contactForm`/BF-112 et `advancedContact`/BF-105 sont construits côté commerçant à ce jour (2026-09-27) — activer les 3 autres privilèges (BF-102, BF-106, BF-107) ne débloque encore rien de visible. |

### Module 23 — Ergonomie de Navigation

| ID | Besoin | Description |
|---|---|---|
| BF-131 | Lien de retour explicite depuis les pages de création/édition | En entrant dans une page de création ou d'édition, un lien "Retour" explicite doit permettre de revenir facilement à la liste d'où l'on vient, sans dépendre uniquement du bouton retour du navigateur. **Fait le 2026-09-28, périmètre initial : création/édition de produit** : `/dashboard/products/new` et `/dashboard/products/[id]/edit` (`ProductFormPageContent`) affichent désormais un lien "← Retour aux produits" vers `/dashboard/products`, y compris sur l'état "Produit introuvable." Le reste du dashboard marchand et du Super Admin n'a pas de page de détail/édition séparée nécessitant ce traitement à ce jour (listes avec expansion en ligne plutôt que navigation, voir 04-besoins-techniques.md §53) ; le storefront public avait déjà ce lien sur la fiche produit (`ProductDetailPageContent`, "Retour à la boutique"). À étendre au cas par cas si de nouvelles pages de détail/édition apparaissent. |
| BF-132 | Lien "À propos" de la landing page vers un vrai contenu | Le lien "À propos" du menu de la page d'accueil doit amener vers du contenu présentant réellement ManuShop, pas un autre bloc sans rapport. **Fait le 2026-09-28** : signalé par l'utilisateur comme "ne fonctionne pas" avec "Fonctionnalités" et la recherche — vérifié par un test automatisé (clic réel via Playwright) que le défilement d'ancre fonctionne correctement pour les trois (décalage du en-tête fixe déjà compensé en CSS) ; le vrai défaut trouvé est que `#apropos` pointait vers `LaunchPromo` (le bloc "Offre de lancement"), jamais un contenu "à propos" de ManuShop. Nouveau composant `AboutSection` (mission + 3 points forts : ancrage local, mode hors-ligne, indépendance de chaque boutique) branché sur `#apropos` ; `LaunchPromo` reste affiché plus bas sur la page mais n'est plus la cible du lien de nav. La recherche du header (`SiteHeader`) et le filtre de `/catalogue` (`q=`) sont fonctionnels mais reflètent un catalogue actuellement vide (aucun produit publié, voir 04-besoins-techniques.md §53) — pas un bug de recherche. |

### Module 24 — Sons de Notification du Tableau de Bord

| ID | Besoin | Description |
|---|---|---|
| BF-133 | Sons de notification dans le dashboard | Un bip sonore doit jouer dans le dashboard marchand lors d'une nouvelle commande, d'un changement de statut de commande, ou d'un nouveau message — chacun indépendamment désactivable. Demande explicite de l'utilisateur le 2026-09-28, reformulée depuis "tous les paramètres du compte admin s'appliquent sur sa boutique". **Fait le 2026-09-28** : trois interrupteurs dans `/dashboard/shop` (`Shop.soundOnNewOrder`/`soundOnOrderStatusChange`/`soundOnNewMessage`, `?? true` par défaut) ; bip généré directement (Web Audio API, `src/lib/notificationSound.ts`) plutôt qu'un fichier audio — aucun fichier son n'existait dans le projet. Joue partout dans le dashboard tant que l'onglet reste ouvert (`DashboardNotificationSounds`, monté dans `app/dashboard/layout.tsx`), pas seulement sur la page concernée — pas d'infrastructure push (BF-116, toujours non commencé), donc rien ne joue onglet fermé. "Nouveau message" se déclenche sur la réponse du Super Admin (le commerçant est lui-même l'auteur de ses propres messages sortants). Voir 04-besoins-techniques.md §55. |

### Module 25 — Aide Contextuelle & Découverte de Fonctionnalités

*Demande explicite de l'utilisateur le 2026-09-28 : liste de fonctionnalités à implémenter par la suite, ajoutée aux fins de suivi — aucune n'est commencée.*

| ID | Besoin | Description |
|---|---|---|
| BF-134 | Onboarding flow (prise en main par page) | Un parcours de première prise en main propre à chaque page/écran important de l'application (pas seulement à la création de boutique, voir `/onboarding` existant, BF-63 — distinct : ceci concerne l'usage courant de chaque page, pas la seule création initiale). **Fait le 2026-09-29, pilote sur `/dashboard`** : `DashboardOnboardingTour` lance automatiquement (une seule fois par compte, `User.seenTours`) un tour guidé (BF-135) présentant les KPI, le menu Produits/Commandes, les Paramètres (admin uniquement) et le bouton "Voir la boutique". **Étendu à toute l'application le 2026-10-02** : une visite par page (tableau de bord, Super Admin, vitrine, accueil, connexion/inscription — sauf `/erreur` et les pages "bientôt disponible" Statistiques/Clients), via `PageTour` + `tours.ts`. Mémoire "déjà vue" sur le compte, ou dans le navigateur pour un visiteur non connecté ; bouton "Revoir la visite" (`?`) dans chaque en-tête. |
| BF-135 | Product tour / Guided tour | Série de popups/tooltips séquentiels ("Suivant"/"Précédent") pointant successivement vers chaque élément d'une fonctionnalité complexe pour l'expliquer pas à pas. **Fait le 2026-09-29** : `GuidedTour` (`react-joyride`, ajouté en dépendance) — moteur réutilisable, ne gère jamais lui-même la persistance "déjà vu" (laissée à l'appelant, voir BF-134). SSR-safe nativement (pas d'import dynamique `ssr: false` nécessaire, contrairement à ce qui était anticipé). |
| BF-136 | Coach marks | Petites bulles/tooltips ponctuelles pointant vers un élément précis de l'interface (courant en UX mobile), affichées à la demande sur un champ ou une fonctionnalité quand l'utilisateur a besoin d'aide — contrairement au product tour (BF-135), pas une séquence guidée complète. **Fait le 2026-09-29, un usage pilote** : `CoachMark` (nouveau `Popover` Base UI ajouté, `src/components/ui/popover.tsx`) — bouton "?" qui révèle une bulle au clic (fonctionne sur mobile, contrairement à `FieldHint`/`title` natif, survol uniquement). Appliqué au KPI "Ventes du mois" de `/dashboard` pour expliquer son calcul. |
| BF-137 | Feature discovery | Mise en avant ciblée d'une fonctionnalité existante, typiquement après une mise à jour de la plateforme, pour la faire découvrir aux utilisateurs qui ne l'ont pas encore remarquée. **Non commencé.** |

### Module 26 — Analyse d'Usage de la Plateforme (Firebase Analytics)

*Demande explicite de l'utilisateur le 2026-09-28 : ajoutée aux fins de suivi — aucune n'est commencée. Distinct de BF-107 (statistiques d'UNE boutique, consultées par son propre commerçant) : ce module vise une vue à l'échelle de la plateforme, côté Super Admin. Piste technique commune aux quatre : `firebase/analytics` (SDK client-only, `isSupported()` à vérifier avant `getAnalytics()` — absent de `src/lib/firebase.ts` à ce jour), avec le lien Google Analytics du projet Firebase à activer côté console.*

| ID | Besoin | Description |
|---|---|---|
| BF-138 | Fonctionnalités les plus utilisées | Suivi des fonctionnalités les plus sollicitées sur la plateforme (ex. création de produit, messagerie, filtres du catalogue...) via des événements Firebase Analytics personnalisés (`logEvent`), consultable par le Super Admin. **Non commencé.** |
| BF-139 | Boutons les plus cliqués | Suivi granulaire des interactions bouton par bouton (quels CTA/actions sont le plus utilisés dans l'app), via des événements Firebase Analytics. **Non commencé.** |
| BF-140 | Boutiques les plus visitées (plateforme) | Classement de toutes les boutiques par nombre de visites à l'échelle de la plateforme, consultable par le Super Admin — pourrait aussi alimenter le classement "4 meilleures boutiques" du Marché encore non construit (BF-108). **Non commencé.** |
| BF-141 | Régions des visiteurs | Répartition géographique des visiteurs (région/pays), via les rapports démographiques natifs de Firebase Analytics (GA4) plutôt qu'une collecte IP maison. **Non commencé.** |

---

**Le reste des fonctionnalités reste à définir** (déclaration explicite de l'utilisateur le 2026-09-25) — les modules ci-dessus ne prétendent pas clore la spécification produit ; ils couvrent ce qui a été précisé à ce jour.
