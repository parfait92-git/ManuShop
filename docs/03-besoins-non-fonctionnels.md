# Documentation des Besoins Non Fonctionnels — ManuShop

---

## 1. Performance

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-01 | Temps de chargement | Page d'accueil < 3 secondes sur connexion 3G |
| BNF-02 | Temps de réponse API | Toute requête Firebase < 1 seconde |
| BNF-03 | Score Lighthouse | Performance PWA > 90/100 |
| BNF-04 | Optimisation images | Images compressées automatiquement (WebP) |
| BNF-05 | Lazy loading | Chargement différé des images et composants |
| BNF-06 | Cache intelligent | Mise en cache des données fréquentes (catalogue) |

> **Contexte camerounais :** La connexion internet peut être lente ou instable — la PWA doit être légère et fonctionner en mode dégradé.

---

## 2. Disponibilité & Fiabilité

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-07 | Disponibilité | 99.9% uptime (Vercel + Firebase garantissent cela) |
| BNF-08 | Mode hors ligne | Catalogue consultable sans connexion via Service Worker |
| BNF-09 | Synchronisation | Données synchronisées dès le retour de la connexion |
| BNF-10 | Tolérance aux pannes | Aucune perte de données en cas de coupure réseau |
| BNF-11 | Sauvegarde données | Firebase assure la persistance et la redondance automatique |

---

## 3. Sécurité

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-12 | Authentification sécurisée | Firebase Auth avec JWT tokens |
| BNF-13 | Autorisation par rôle | Règles Firestore strictes par rôle (Admin/Vendeur/Client) |
| BNF-14 | Protection des données | Aucune donnée sensible en clair dans Firestore |
| BNF-15 | HTTPS obligatoire | Toutes les communications chiffrées en TLS |
| BNF-16 | Validation des entrées | Validation côté client ET côté serveur (Next.js API Routes) |
| BNF-16bis | Validation des liens externes | Ajouté le 2026-09-25 (BF-106) — tout lien réseau social saisi par un commerçant (Instagram/Facebook/TikTok) est vérifié (HTTPS, domaine attendu) avant enregistrement, pour limiter les liens frauduleux affichés publiquement sur une boutique |
| BNF-17 | Protection API | Clés API des réseaux sociaux stockées en variables d'environnement |
| BNF-18 | Règles Firestore | Accès en lecture/écriture strictement contrôlé par rôle |

---

## 4. Accessibilité & Compatibilité

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-19 | Mobile first | Interface optimisée pour smartphones Android (marché camerounais) |
| BNF-20 | Compatibilité navigateurs | Chrome, Firefox, Safari, Samsung Internet |
| BNF-21 | PWA installable | Installable sur écran d'accueil Android et iOS |
| BNF-22 | Interface simple | Utilisable par un non-technicien (gérants de la boutique) |
| BNF-23 | Langue | Interface en français |
| BNF-24 | Accessibilité WCAG | Respect des standards WCAG 2.1 niveau AA |
| BNF-25 | Responsive design | Adapté à tous les formats d'écran (mobile, tablette, desktop) |

---

## 5. Maintenabilité

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-26 | Code modulaire | Architecture en modules indépendants |
| BNF-27 | Documentation code | JSDoc sur toutes les fonctions critiques |
| BNF-28 | Tests | Couverture de tests > 70% (Jest + Testing Library) |
| BNF-29 | Linting | ESLint + Prettier configurés et stricts |
| BNF-30 | Versioning | Git avec branches feature/develop/main |
| BNF-31 | CI/CD | Déploiement automatique sur Vercel à chaque push main |

---

## 6. Scalabilité

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-32 | Croissance données | Firestore supporte jusqu'à 1 million de produits sans refactoring |
| BNF-33 | Croissance utilisateurs | Architecture supporte 10 000 utilisateurs simultanés |
| BNF-34 | Ajout de modules | Nouveaux modules ajoutables sans refactoring majeur |
| BNF-35 | Multi-boutique | Architecture prévue pour gérer plusieurs boutiques — devenu un besoin concret le 2026-09-25 : un même commerçant peut posséder plusieurs boutiques, chacune avec son propre abonnement (voir Module 12/§12 de 04-besoins-techniques.md), plus seulement une préparation pour "plus tard" |

---

## 7. Ergonomie & Expérience Utilisateur

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-36 | Onboarding rapide | Le gérant configure la boutique en moins de 10 minutes |
| BNF-37 | Feedback utilisateur | Toast notifications pour chaque action (succès/erreur) |
| BNF-38 | Temps d'apprentissage | Gérants autonomes en moins d'une journée de formation |
| BNF-39 | Design cohérent | Système de design unifié (couleurs, typographie, composants) |
| BNF-40 | Navigation intuitive | Maximum 3 clics pour atteindre n'importe quelle fonctionnalité |

---

## 8. Conformité & Légalité

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-41 | Conditions d'utilisation | Page CGU accessible |
| BNF-42 | Politique de confidentialité | Conforme aux règles Meta/TikTok pour l'accès aux APIs |
| BNF-43 | Conformité Meta API | Respect des politiques Facebook/Instagram Graph API |
| BNF-44 | Conformité WhatsApp | Utilisation de WhatsApp Business API officielle |

---

## 9. Internationalisation (futur)

| ID | Besoin | Critère de succès |
|---|---|---|
| BNF-45 | Structure i18n | Architecture prévue pour multi-langue (français, anglais) |
| BNF-46 | Devise | Support du Franc CFA (XAF) avec formatage correct |
| BNF-47 | Fuseau horaire | Dates affichées en heure locale Cameroun (UTC+1) |
