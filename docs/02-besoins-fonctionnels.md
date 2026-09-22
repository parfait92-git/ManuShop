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

| ID | Besoin | Description |
|---|---|---|
| BF-18 | Panier client | Le client ajoute des produits au panier |
| BF-19 | Passer commande | Le client soumet une commande avec ses coordonnées |
| BF-20 | Suivi commande | Statuts : **En attente → Confirmée → En livraison → Livrée** |
| BF-21 | Commande manuelle | Le gérant crée une commande pour un client physique |
| BF-22 | Historique commandes | Liste de toutes les commandes avec filtres |
| BF-23 | Annulation commande | Annuler une commande avec motif |

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
| BF-53 | Dashboard général | Chiffre d'affaires, commandes, stock en un coup d'œil (partiel — carte "Produits actifs" et alerte de stock ("Conseil du jour") réelles ; chiffre d'affaires/nouveaux clients/commandes affichent "Bientôt" faute du Module 4 — Commandes, pas encore construit. Aucune donnée fictive n'a été affichée à la place) |
| BF-54 | Rapport ventes | Ventes par jour, semaine, mois (non commencé — dépend du Module 4, Commandes) |
| BF-55 | Produits populaires | Top produits les plus vendus (non commencé — dépend du Module 4, Commandes) |
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
| BF-64 | URL dédiée par boutique | Chaque boutique publiée est accessible via une URL propre construite à partir d'un identifiant opaque (pas l'ID Firestore brut) combinant l'ID du propriétaire et l'ID de la boutique, suivi du nom de la page puis, si besoin, d'un identifiant de contenu précis (ex. un produit). Non commencé. |
| BF-65 | Page d'accueil de la boutique publiée | Vitrine publique de la boutique : logo, nom, tous les articles, et les autres éléments que la plateforme permet de publier. Non commencé. |
| BF-66 | Actions client sur une boutique publiée | Un client peut consulter le catalogue, ajouter au panier, commander (WhatsApp, comme BF-39), et visiter la page Facebook/Instagram/TikTok/WhatsApp Business de la boutique — uniquement les réseaux réellement renseignés par le gérant et sur lesquels l'article concerné a été publié. Non commencé. |
| BF-67 | Rôle Super Admin | Unique, réservé à l'éditeur de la plateforme. **Ce n'est pas un rôle sur le compte utilisateur** : c'est l'appartenance à une collection Firestore dédiée (`platformAdmins`, indexée par email), renseignée uniquement à la main depuis la console Firebase. Aucun chemin applicatif, aucune règle Firestore, ne doit permettre de l'obtenir ou de l'accorder — même à un Super Admin déjà en place. **Fait le 2026-09-21** : collection et règles en place ; page de gestion pas encore construite. |
| BF-68 | Gestion des comptes payants | Le Super Admin retrouve un compte par pseudo/email/téléphone et lui attribue ou lui retire le rôle Admin manuellement (sans durée, jusqu'à révocation) — chemin indépendant de l'abonnement (BF-69). Non commencé (règles Firestore prêtes, page de recherche/attribution pas construite). |
| BF-69 | Abonnement payant avec expiration automatique | Un client clique "créer ma boutique", choisit une durée (quotidienne/hebdomadaire/mensuelle/trimestrielle/annuelle) et paie. Une fois le paiement confirmé, le compte devient automatiquement Admin pour la durée choisie. À l'expiration, un traitement serveur repasse le compte en Client automatiquement ; une tentative d'accès au dashboard après expiration redirige vers la page cliente de sa propre boutique (BF-70). Non commencé — moyen de paiement pas décidé, et l'expiration automatique nécessite une tâche planifiée avec un accès Firestore privilégié que le projet n'a pas aujourd'hui (voir 04-besoins-techniques.md §11.5, point ouvert). |
| BF-70 | Rétrogradation en fin d'abonnement | Un ex-admin dont l'abonnement a expiré est redirigé vers la page cliente de sa propre boutique (toujours publiée) lorsqu'il tente d'accéder à son ancien tableau de bord : il peut consulter ses articles, plus rien d'autre. Non commencé. |

**Révisions du 2026-09-21 par rapport à la première rédaction de ce module, à ne pas reproduire** : l'inscription (email/mot de passe, Google, Facebook, téléphone, anonyme) **ne crée plus jamais** un compte `role: 'admin'` directement — corrigé dans `AuthService` et `firestore.rules` le même jour (voir journal). Le rôle Super Admin n'est plus non plus une valeur possible du champ `role` sur `users` (supprimé de `UserRole`) : remplacé par la collection `platformAdmins` décrite en BF-67.
