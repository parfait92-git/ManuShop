# Documentation des Besoins Fonctionnels — ManuShop

---

## Module 1 — Authentification & Gestion des Utilisateurs

| ID | Besoin | Description |
|---|---|---|
| BF-01 | Inscription | Le gérant crée un compte avec email/mot de passe |
| BF-02 | Connexion | Connexion sécurisée via Firebase Auth |
| BF-03 | Rôles | 3 rôles : **Admin** (gérant), **Vendeur**, **Client** |
| BF-04 | Profil boutique | Configurer nom, logo, adresse, contacts de la boutique |
| BF-05 | Récupération mot de passe | Réinitialisation par email |

---

## Module 2 — Gestion du Catalogue Produits

| ID | Besoin | Description |
|---|---|---|
| BF-06 | Ajouter produit | Nom, description, prix, catégorie, photo, stock |
| BF-07 | Modifier produit | Mise à jour de toutes les informations |
| BF-08 | Supprimer produit | Suppression avec confirmation |
| BF-09 | Catégories | Créer/gérer des catégories (ex: Laitiers, Arômes, Emballages) |
| BF-10 | Recherche produit | Recherche par nom ou catégorie |
| BF-11 | Galerie photos | Ajouter plusieurs photos par produit |
| BF-12 | Produit en vedette | Marquer un produit comme "en promotion" ou "populaire" |

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

| ID | Besoin | Description |
|---|---|---|
| BF-35 | Page d'accueil | Bannière, produits vedettes, promotions en cours |
| BF-36 | Catalogue public | Tous les produits visibles sans connexion |
| BF-37 | Fiche produit | Détail produit avec photos, prix, disponibilité |
| BF-38 | Recherche & filtres | Filtrer par catégorie, prix, disponibilité |
| BF-39 | Contact rapide | Bouton "Commander via WhatsApp" sur chaque produit |
| BF-40 | Mode hors ligne | Consultation du catalogue même sans connexion (PWA) |

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

| ID | Besoin | Description |
|---|---|---|
| BF-53 | Dashboard général | Chiffre d'affaires, commandes, stock en un coup d'œil |
| BF-54 | Rapport ventes | Ventes par jour, semaine, mois |
| BF-55 | Produits populaires | Top produits les plus vendus |
| BF-56 | Rapport stock | Produits en rupture ou stock bas |
| BF-57 | Export données | Exporter les rapports en CSV ou PDF |

---

## Module 11 — Notifications

| ID | Besoin | Description |
|---|---|---|
| BF-58 | Notification nouvelle commande | Alerte immédiate au gérant |
| BF-59 | Notification stock bas | Alerte quand stock sous le seuil |
| BF-60 | Notification promotion | Rappel de fin de promotion imminente |
| BF-61 | Push notification | Notifications PWA sur mobile |
