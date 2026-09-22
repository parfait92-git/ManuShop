# Business Plan — ManuShop

## Application PWA de Boutique Numérique Multicanal (Cameroun)

---

## 1\. Résumé Exécutif

**Nom du projet :** ManuShop **Secteur :** Commerce de détail — Produits laitiers, emballages, arômes **Localisation :** Cameroun **Modèle :** PWA (Progressive Web App) multicanal **Objectif :** Digitaliser une boutique physique pour atteindre un public plus large via le web et les réseaux sociaux

---

## 2\. Problème à Résoudre

| Problème actuel | Impact |
| :---- | :---- |
| Vente uniquement physique | Portée limitée au quartier |
| Bouche à oreille uniquement | Croissance lente et incertaine |
| Pas de gestion de stock | Ruptures non anticipées |
| Pas de facturation numérique | Perte de traçabilité |
| Absence sur les réseaux sociaux | Manque de visibilité |

---

## 3\. Solution Proposée

Une **PWA multifonction** accessible depuis n'importe quel smartphone (sans installation) qui centralise :

- La gestion du stock et des produits  
- La facturation et les promotions  
- La publication automatisée sur WhatsApp Business, Facebook, Instagram, TikTok  
- Une boutique en ligne publique pour les clients

---

## 4\. Public Cible

**Primaire :** Revendeurs, restaurateurs, pâtissiers, particuliers au Cameroun **Secondaire :** Clients en diaspora commandant pour la famille locale

---

## 5\. Modèle Économique

| Source de revenu | Description |
| :---- | :---- |
| Vente directe en ligne | Commandes via la boutique PWA |
| Publicités ciblées | Facebook Ads, Instagram Ads, TikTok Ads |
| Promotions flash | Augmentation du panier moyen |
| Fidélisation | Programme de points clients |

---

## 6\. Avantages Concurrentiels

- **PWA** — fonctionne sur tout smartphone sans téléchargement  
- **Multicanal** — une seule saisie publie partout  
- **Adapté au contexte camerounais** — interface simple, fonctionne avec connexion lente  
- **WhatsApp Business intégré** — canal principal de communication au Cameroun

---

## 7\. Plan de Déploiement Rapide

| Phase | Durée | Objectif |
| :---- | :---- | :---- |
| Phase 1 — MVP | 4 semaines | Catalogue produits \+ gestion stock \+ facturation |
| Phase 2 — Social | 2 semaines | Publication WhatsApp, Facebook, Instagram |
| Phase 3 — Publicité | 2 semaines | Facebook Ads, TikTok Ads intégrés |
| Phase 4 — Croissance | En continu | Analytics, fidélisation, promotions |

---

## 8\. Ressources Nécessaires

**Techniques :**

- Next.js \+ TypeScript \+ Firebase (Firestore \+ Storage \+ Auth)  
- API WhatsApp Business, Meta Graph API, TikTok API

**Humaines :**

- 1 développeur  
- 1 gestionnaire de contenu (gérants formés)

**Budget estimé démarrage :**

| Poste | Coût estimé |
| :---- | :---- |
| Hébergement (Vercel) | Gratuit → \~20$/mois |
| Firebase | Gratuit → \~25$/mois |
| Domaine (.cm ou .com) | \~15$/an |
| Facebook/Instagram Ads | Budget flexible (min 5$/jour) |

---

## 9\. Indicateurs de Succès (KPIs)

- Nombre de produits en ligne  
- Nombre de commandes par semaine  
- Portée des publications sur les réseaux  
- Taux de conversion boutique en ligne  
- Croissance du chiffre d'affaires mensuel

---

## 10. Évolution du modèle — Plateforme multi-boutique (2026-09-21)

**Ce document décrivait à l'origine une seule boutique physique digitalisée.** Décision prise le 2026-09-21 : ManuShop devient une **plateforme multi-boutique** — ManuShop lui-même est l'éditeur de la plateforme, et chaque commerçant qui la rejoint obtient sa propre boutique publiable, indépendante des autres. Le reste de ce document (§1 à §9) reste valable pour comprendre le problème résolu et la proposition de valeur pour *un* commerçant ; cette section décrit le changement de périmètre technique et économique.

**Ce qui change concrètement :**
- **Tout le monde démarre client.** L'inscription (email/mot de passe, Google, Facebook, téléphone, anonyme) ne crée plus jamais un compte gérant directement — c'était le cas avant le 2026-09-21, ce n'est plus vrai depuis. Un utilisateur authentifié peut être client d'une ou plusieurs boutiques publiées par d'autres commerçants, et devenir lui-même gérant de sa propre boutique s'il obtient le rôle Admin (voir progression des rôles ci-dessous).
- Une boutique peut être **publiée** (visible publiquement, avec sa propre vitrine) ou rester privée (en configuration).
- La page d'accueil de la plateforme (actuellement la page d'onboarding) devient un **annuaire des boutiques publiées**. Tant que peu ou pas de boutiques existent, l'annuaire affiche des boutiques factices non cliquables ("virtuelles") pour ne pas paraître vide — un clic dessus redirige vers un article externe plutôt que vers une page interne inexistante.
- **Progression des rôles à trois niveaux** :
  1. **Client** — le rôle par défaut à l'inscription. Consulte les boutiques publiées, ajoute au panier, commande.
  2. **Admin** (gérant de boutique) — obtenu par l'un des deux chemins suivants, jamais par auto-inscription :
     - **Attribution manuelle** par le Super Admin, qui retrouve un compte par pseudo/email/téléphone dans son interface dédiée et lui donne le rôle Admin — révocable à tout moment par le même chemin.
     - **Abonnement payant**, avec une durée au choix (quotidienne, hebdomadaire, mensuelle, trimestrielle, annuelle). Une fois le paiement confirmé, le compte devient automatiquement Admin pour la durée choisie. À l'expiration, un traitement côté serveur repasse automatiquement le compte en Client ; s'il tente ensuite d'accéder à son tableau de bord, il est redirigé vers la page cliente de sa propre boutique (toujours publiée, mais en lecture seule pour lui désormais) plutôt que bloqué.
  3. **Super Admin** — unique, c'est l'éditeur de la plateforme. Attribué **exclusivement** en ajoutant manuellement son propre email dans une collection Firestore dédiée, directement depuis la console Firebase. Aucun chemin de code, aucune règle Firestore, ne permet de l'obtenir ou de l'accorder autrement — même le Super Admin lui-même ne peut pas se l'accorder depuis l'application.
- Moyen de paiement et tarifs des abonnements non encore décidés.

**Détail technique et liste des besoins fonctionnels** : voir le Module 12 dans [02-besoins-fonctionnels.md](./02-besoins-fonctionnels.md) et la section correspondante dans [04-besoins-techniques.md](./04-besoins-techniques.md).

