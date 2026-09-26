# Documentation des Besoins Fonctionnels — ManuShop

---

## Module 1 — Authentification & Gestion des Utilisateurs

| ID | Besoin | Description |
|---|---|---|
| BF-01 | Inscription | Le gérant crée un compte avec email/mot de passe (terminé) |
| BF-02 | Connexion | Connexion sécurisée via Firebase Auth (terminé) |
| BF-03 | Rôles | 3 rôles : **Admin** (gérant), **Vendeur**, **Client** (partiel — Admin/Vendeur opérationnels ; le rôle Client n'a pas de flux de création dédié, voir Module 7) |
| BF-04 | Profil boutique | Configurer nom, logo, adresse, contacts de la boutique (terminé) |
| BF-05 | Récupération mot de passe | Réinitialisation par email (terminé) |
| BF-120 | Paramètres du compte (profil personnel) | Tout utilisateur connecté (client, vendeur, admin) peut modifier son nom, sa photo et son téléphone, consulter son identifiant de connexion/rôle/ancienneté, et changer son mot de passe (comptes email) — distinct des paramètres de boutique (BF-04). **Fait le 2026-09-25** : `/mon-compte`, accessible depuis le menu "Mon compte" (vitrine) et le menu du tableau de bord. |
| BF-121 | Notification de nouvelle version par email | À chaque nouvelle version de la plateforme, tous les comptes ayant un email renseigné sont notifiés. **Non commencé** — bloqué sur le choix d'un fournisseur d'email (aucun dans le projet actuellement, voir 04-besoins-techniques.md §13) ; la préférence "notifications par email" (`User.notifyByEmail`, opt-out) existe déjà côté compte via BF-120, prête à être consultée une fois le fournisseur choisi. Source de version envisagée : le champ `version` de `package.json`. |

---

## Module 2 — Gestion du Catalogue Produits

| ID | Besoin | Description |
|---|---|---|
| BF-06 | Ajouter produit | Nom, description, prix, catégorie, photo, stock (terminé) |
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
| BF-24 | Génération facture | Facture automatique à chaque commande confirmée |
| BF-25 | Aperçu facture | Visualiser la facture avant impression |
| BF-26 | Téléchargement PDF | Exporter la facture en PDF |
| BF-27 | Envoi WhatsApp | Envoyer la facture directement via WhatsApp Business |
| BF-28 | Numérotation | Numérotation automatique et séquentielle des factures |
| BF-29 | Facture personnalisée | Logo, nom boutique, coordonnées sur chaque facture |

---

## Module 6 — Promotions & Réductions

| ID | Besoin | Description |
|---|---|---|
| BF-30 | Créer promotion | Réduction en % ou montant fixe sur un produit ou catégorie |
| BF-31 | Promotion limitée | Définir une date de début et fin de promotion |
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
| BF-54 | Rapport ventes | Ventes par jour, semaine, mois (non commencé — filtre par intervalle personnalisé pas construit ; seul le mois courant est affiché sur le dashboard, voir BF-53/BF-102) |
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
| BF-72 | Avis produit | Le client consulte les avis/feedback laissés sur ce produit, affichés sur sa fiche détail. **Fait le 2026-09-25** (lecture seule) : nouveau modèle `Review` + `ReviewService.listByProduct()`, affiché sur la fiche produit avec un état honnête "Aucun avis pour le moment" tant qu'aucun avis n'existe réellement. La **soumission** d'un avis reste BF-76, non commencée. |
| BF-73 | Produit en rupture désactivé | Un produit à stock 0 reste visible dans la page boutique mais son ajout au panier est désactivé, plutôt que d'être masqué. **Fait le 2026-09-25**, sur la fiche produit (via `ProductService.getStockStatus()`, déjà existant). |

### Module 14 — Commande, Suivi & Retour Client

| ID | Besoin | Description |
|---|---|---|
| BF-74 | Commande réservée aux comptes complets | Un visiteur non connecté est redirigé vers la connexion avant de valider une commande. **Fait le 2026-09-25** : `/checkout/payment` protégé par `ProtectedRoute`. La nuance "compte anonyme doit d'abord compléter son profil" n'a plus lieu d'être — l'authentification anonyme a été retirée le 2026-09-25 (voir journal), tout compte connecté a donc nécessairement un profil complet. |
| BF-75 | Suivi de commande | Le client consulte l'état de sa commande (vocabulaire des statuts : voir Module 17, BF-95). **Fait le 2026-09-25** : `/mes-commandes` (`MyOrdersPageContent`), débloqué par le Module 4. |
| BF-76 | Feedback après livraison | Une fois la commande livrée, le client peut laisser un avis ; si le motif choisi est "commande défectueuse", un commentaire est transmis au vendeur via le moyen de contact qu'il a configuré (BF-106). **Non commencé, bloqué sur le Module 4** — nécessite une vraie commande livrée pour avoir un sens. |
| BF-77 | Retour & remboursement | Le client peut demander le retour d'un article livré et un remboursement. **Non commencé** — distinct de BF-96 (Module 17, fait) : BF-96 est une action **commerçant** (marquer une commande livrée comme Retournée/Défectueuse) ; BF-77 est la **demande côté client** qui déclencherait ça, pas encore construite. |
| BF-78 | Sélection du mode de paiement (interface uniquement) | Choix entre Visa, Orange Money, MTN Mobile Money à l'écran de paiement. **Aucune intégration réelle pour l'instant** — l'utilisateur compte choisir une API de paiement gratuite ou peu coûteuse en fin de développement ; seule l'interface de sélection est construite maintenant (voir 04-besoins-techniques.md §12.6). **Fait le 2026-09-25** : `/checkout/payment`, accessible depuis `CartPanel` ("Choisir un mode de paiement", à côté du bouton WhatsApp existant qu'il ne remplace pas) ; le bouton "Payer" affiche honnêtement que ce n'est pas encore disponible plutôt que de simuler un succès. |

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

### Module 17 — Statuts de Commande, Retours & Corbeille

| ID | Besoin | Description |
|---|---|---|
| BF-95 | Statuts de commande étendus | `En cours d'analyse → Prêt pour la livraison → Livraison en cours → Livré`, puis `Retourné` ou `Défectueux` comme issue possible depuis "Livré". **Fait le 2026-09-25** : implémenté dès la construction du Module 4 (`OrderStatus`), sans jamais passer par l'ancien vocabulaire. `Annulée` ajoutée en 7ᵉ valeur pour couvrir BF-23 (clarifié avec l'utilisateur — hors périmètre initial de BF-95). |
| BF-96 | Traitement d'un retour | Le commerçant renseigne un commentaire expliquant le motif du retour avant de rembourser le client ; une fois le remboursement effectué, le statut passe à `Retourné` et le stock du produit concerné est automatiquement réincrémenté. **Fait le 2026-09-25** : motif obligatoire (`OrderReasonDialog`), stock réincrémenté atomiquement (`FieldValue.increment`) — remboursement lui-même hors scope (pas d'intégration de paiement réelle, voir BF-78). |
| BF-97 | Motif "défectueux" | Si le retour est motivé par un défaut du produit, le commerçant choisit explicitement le statut `Défectueux` plutôt que `Retourné` (deux issues distinctes, pas une simple note sur "Retourné"). **Fait le 2026-09-25**, en même temps que BF-96. |
| BF-98 | Journal des opérations commerçant | Chaque action du commerçant (produit, catégorie, commande, retour...) est consignée dans un journal structuré, exploitable pour imprimer un rapport. |
| BF-99 | Corbeille générique | Tout élément supprimé (produit, catégorie, et tout ce qui suivra le même schéma) est déplacé dans une corbeille plutôt que supprimé immédiatement. Depuis la corbeille : restauration, ou suppression définitive après confirmation. |
| BF-100 | Confirmation à compte à rebours | La suppression définitive depuis la corbeille déclenche un compte à rebours annulable ; cliquer sur Annuler avant qu'il n'atteigne zéro arrête le processus, rien n'est supprimé. |
| BF-101 | Feedback marchand sur commande livrée | Le commerçant reçoit et consulte les avis clients laissés sur les commandes livrées de sa boutique (miroir de BF-72/76 côté client). **Non commencé** — dépend de BF-76 (soumission d'avis client), elle-même toujours non construite (voir Module 13). |

### Module 18 — Tableau de Bord, Rapports & Facturation Avancée

*Étend le Module 10 (BF-53→57) plutôt que de le dupliquer.*

| ID | Besoin | Description |
|---|---|---|
| BF-102 | Filtre de ventes par intervalle (premium) | Le tableau de bord filtre les ventes par jour/semaine/année, borné entre la date-heure de création de la boutique (minimum) et la date-heure du jour (maximum). |
| BF-103 | Consultation de facture | Voir la facture d'une commande individuelle (rejoint BF-24/25). |
| BF-104 | Factures groupées par période | Factures du jour, de la semaine, du mois et de l'année, consultables et imprimables (étend BF-26). |

### Module 19 — Paramètres Marchand Avancés (Premium)

| ID | Besoin | Description |
|---|---|---|
| BF-105 | Moyens de contact configurables | Le commerçant choisit comment il est contacté pour sa boutique (adresse email, message WhatsApp, message Facebook, message Instagram). |
| BF-106 | Réseaux sociaux affichés en pied de page | Une case à cocher par réseau (Instagram, Facebook, TikTok) — cocher révèle un champ pour saisir le lien correspondant. Le système vérifie que le lien est sécurisé (HTTPS, domaine attendu) avant d'autoriser l'enregistrement, pour limiter les liens frauduleux. |
| BF-107 | Statistiques de consultation de la boutique | Nombre de consultations, article le plus consulté, article le moins consulté, heure et localisation des visites. |

### Module 20 — Marché & Taxonomie de Catégories

| ID | Besoin | Description |
|---|---|---|
| BF-108 | Page Marché | Page publique listant les 4 meilleures boutiques en tête de page, puis tous les produits publiés de toutes les boutiques en dessous. Généralise `/demo-catalogue` (déjà construit en données de démo, voir journal du 2026-09-24) à de vraies données multi-boutiques. |
| BF-109 | Tags de catégorie système | Liste de tags colorés (ex. "Alimentation", "Mode", "Électronique"), créée et gérée **exclusivement par le Super Admin**. En créant une catégorie, un commerçant choisit un tag existant dans cette liste plutôt que d'en inventer un — garantit une taxonomie cohérente sur toute la plateforme malgré des noms de catégorie différents d'une boutique à l'autre. |
| BF-110 | Tri de la page Marché par tag système | Le tri/filtre de la page Marché se fait sur ces tags système (BF-109), pas sur les noms de catégorie propres à chaque boutique. |
| BF-111 | Filtre catalogue boutique par catégories actives | Dans la page produits d'une boutique (côté client), le filtre ne propose que les catégories actives réellement associées à au moins un produit de cette boutique. |

### Module 21 — Messagerie Commerçant ↔ Super Admin

| ID | Besoin | Description |
|---|---|---|
| BF-112 | Formulaire "Nous contacter" (commerçant, premium) | Objet, corps, signature (initiales générées automatiquement à partir du nom et prénom du commerçant), et choix d'un modèle de mise en forme pour le message. |
| BF-113 | Réception des messages (Super Admin) | Le Super Admin consulte les messages envoyés par les commerçants. |
| BF-114 | Réponse du Super Admin | Réponse rédigée avec le même modèle de mise en forme que le message reçu ; la signature porte automatiquement "ManuShop" avec le logo de la plateforme, sans saisie manuelle. |
| BF-115 | Réception de la réponse (commerçant) | Le commerçant consulte la réponse du Super Admin à son message. |
| BF-116 | Notifications push d'activité | Commerçant : nouvelle commande, nouveau message, nouveau feedback. Super Admin : nouveau message reçu. Étend le Module 11 (BF-58→61, toujours non commencé — nécessite Firebase Cloud Messaging). |

### Module 22 — Supervision Super Admin

| ID | Besoin | Description |
|---|---|---|
| BF-117 | Liste des commerçants | Le Super Admin consulte la liste des usagers ayant obtenu le statut commerçant (au moins une boutique). |
| BF-118 | Détail d'un commerçant | Pour un commerçant donné : nombre de boutiques détenues, et liste des privilèges premium actifs pour chacune. |
| BF-119 | Activer/désactiver un privilège premium par boutique | Le Super Admin peut activer ou désactiver un privilège premium précis pour une boutique donnée d'un commerçant, indépendamment de l'état de son abonnement. |

---

**Le reste des fonctionnalités reste à définir** (déclaration explicite de l'utilisateur le 2026-09-25) — les modules ci-dessus ne prétendent pas clore la spécification produit ; ils couvrent ce qui a été précisé à ce jour.
