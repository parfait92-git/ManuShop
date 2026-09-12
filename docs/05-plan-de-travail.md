# Plan de Travail — ManuShop

Basé sur [01-business-plan.md](./01-business-plan.md), [02-besoins-fonctionnels.md](./02-besoins-fonctionnels.md), [03-besoins-non-fonctionnels.md](./03-besoins-non-fonctionnels.md) et [04-besoins-techniques.md](./04-besoins-techniques.md).

Workflow git : toute fonctionnalité part de `develop`, fusion vers `main` uniquement via Pull Request (voir `.github/workflows/enforce-merge-source.yml`).

---

## Phase 0 — Prérequis & Mise en place (avant tout code métier)

### 0.1 Comptes & Projets externes
- [ ] Créer le projet **Firebase** (console.firebase.google.com) : activer Firestore, Authentication (Email/Password), Storage, Cloud Messaging
- [ ] Créer le projet **Vercel** et le connecter au repo GitHub `ManuShop`
  - [ ] Brancher le déploiement production sur `main`
  - [ ] Configurer les Preview Deployments sur les PR issues de `develop`
- [ ] Réserver le nom de domaine (`.cm` ou `.com`) si disponible dès cette phase
- [ ] (Peut être différé en Phase 2/3) Comptes développeurs Meta (Facebook/Instagram Graph API), WhatsApp Business Cloud API, TikTok Business API

### 0.2 Outillage local (VS Code)
- [ ] Extensions : ESLint, Prettier, Tailwind CSS IntelliSense, Firebase (toba233/firebase ou officiel), GitLens, Error Lens, Playwright (pour tests E2E futurs)
- [ ] Configurer `firebase-tools` CLI (`npm install -g firebase-tools`, `firebase login`, `firebase init`)
- [ ] Configurer `vercel` CLI (`npm install -g vercel`, `vercel login`, `vercel link`)

### 0.3 Initialisation technique du projet
- [ ] Installer les dépendances listées en §10 de [04-besoins-techniques.md](./04-besoins-techniques.md) (Firebase SDK, shadcn/ui, Zustand, React Hook Form + Zod, react-pdf, sonner, next-pwa, etc.)
- [ ] `npx shadcn@latest init` + configuration Tailwind
- [ ] Configurer `next-pwa` dans `next.config.ts`
- [ ] Créer la structure de dossiers : `src/repositories`, `src/services`, `src/factories`, `src/strategies`, `src/types`
- [ ] Créer les fichiers `.env.local` (non commité) et `.env.example` (commité, sans valeurs) reprenant les variables du §8
- [ ] Ajouter les mêmes variables en secrets sur Vercel et GitHub Actions
- [ ] Écrire les règles de sécurité Firestore (§6) et les déployer (`firebase deploy --only firestore:rules`)
- [ ] Mettre en place le pipeline CI GitHub Actions : lint + typecheck + tests + build (§9)
- [ ] Configurer Jest + Testing Library (objectif couverture > 70%, BNF-28)

**Definition of Done Phase 0** : `npm run build` passe en local et sur Vercel (déploiement preview visible), Firebase répond depuis l'app (lecture/écriture test), CI verte sur une PR `develop → main` de test.

---

## Phase 1 — MVP (≈4 semaines)

Objectif business plan : catalogue produits + gestion stock + facturation.

- [ ] **Module 1 — Auth & Utilisateurs** (BF-01→05) : inscription/connexion gérant, rôles Admin/Vendeur/Client, profil boutique, reset mot de passe
- [ ] **Module 2 — Catalogue produits** (BF-06→12) : CRUD produit, catégories, recherche, galerie photos, produit en vedette
- [ ] **Module 3 — Stock** (BF-13→17) : suivi auto, alerte seuil bas, historique, réappro, variantes
- [ ] **Module 4 — Commandes** (BF-18→23) : panier client, commande, statuts, commande manuelle, historique, annulation
- [ ] **Module 5 — Facturation** (BF-24→29) : génération auto, aperçu, export PDF, numérotation, personnalisation
- [ ] **Module 7 — Vitrine publique** (BF-35→40) : accueil, catalogue public, fiche produit, filtres, bouton WhatsApp, mode hors-ligne
- [ ] **Module 10 — Dashboard** (BF-53→57) : vue d'ensemble, rapports ventes/stock, export CSV/PDF
- [ ] Respect BNF perf (§1), sécurité Firestore par rôle (§3), responsive mobile-first (§4)

**DoD Phase 1** : un gérant peut créer sa boutique, ajouter des produits, recevoir et facturer une commande, un client peut consulter la vitrine et commander en ligne.

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
