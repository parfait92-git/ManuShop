import type { Placement } from "react-joyride";

import type { User } from "@/models/user/User";

export interface TourStepDefinition {
  /** Valeur de l'attribut `data-tour` de l'élément ciblé, ou "center" pour
   * une bulle centrée sans cible (accueil d'une visite). */
  target: string;
  content: string;
  title?: string;
  placement?: Placement;
  /** Étape réservée à ces rôles (ex. un lien visible des seuls gérants). */
  roles?: User["role"][];
}

/** Étape ajoutée à la fin de la toute première visite d'un compte (ou d'un
 * navigateur) : sans elle, rien n'indique qu'une visite se revoit. */
export const REPLAY_HINT_STEP: TourStepDefinition = {
  target: "tour-replay",
  content:
    "Besoin de revoir cette présentation ? Ce bouton relance la visite de la page affichée, à tout moment.",
};

/**
 * BF-134/135 : visite guidée de chaque page de l'application, une entrée
 * par page (ou par famille de pages qui partagent la même interface).
 * Lancée par `PageTour` ; une étape dont la cible n'est pas affichée (liste
 * vide, rôle, vue mobile) est simplement retirée de la visite.
 *
 * Changer l'id d'une visite la fait revoir à tous ceux qui l'avaient déjà
 * vue (`User.seenTours` stocke les ids) — "dashboard-onboarding" garde
 * ainsi son id d'origine.
 */
export const TOURS = {
  // ——— Espace gérant ———
  "dashboard-onboarding": [
    {
      target: "center",
      content:
        "Bienvenue sur votre tableau de bord ! Faisons un tour rapide des essentiels.",
    },
    {
      target: "stat-cards",
      content:
        "Vos chiffres du mois en un coup d'œil : ventes, produits actifs, nouveaux clients et commandes.",
    },
    {
      target: "nav-products",
      content:
        "Ajoutez et gérez vos produits ici — photos, prix, stock et publication.",
    },
    {
      target: "nav-orders",
      content: "Suivez et mettez à jour le statut de vos commandes.",
    },
    {
      target: "nav-shop-settings",
      content:
        "Personnalisez votre boutique (logo, contacts, notifications) depuis les Paramètres.",
      roles: ["admin"],
    },
    {
      target: "view-shop",
      content:
        "Ce bouton ouvre votre boutique telle que vos clients la voient. Bonne vente !",
    },
  ],
  "dashboard-products": [
    {
      target: "products-add",
      content:
        "Ajoutez un nouvel article : nom, prix, stock et au moins une photo.",
    },
    {
      target: "products-filters",
      content: "Retrouvez vite un article par son nom ou sa catégorie.",
    },
    {
      target: "products-table",
      content:
        "Chaque ligne affiche le prix, le stock et son état : en stock, stock faible ou rupture.",
      placement: "top",
    },
    {
      target: "products-publish",
      content:
        "Publié ou masqué : décidez si l'article est visible par vos clients. Un nouveau produit commence masqué.",
    },
    {
      target: "products-actions",
      content:
        "Modifiez un article, ou envoyez-le à la corbeille — il reste restaurable.",
    },
  ],
  "dashboard-product-form": [
    {
      target: "product-name",
      content:
        "Un nom clair et précis : c'est la première chose que vos clients liront.",
    },
    {
      target: "product-stock",
      content:
        "Le stock disponible et le seuil d'alerte : vous êtes prévenu quand le stock passe en dessous.",
    },
    {
      target: "product-photos",
      content:
        "Au moins une photo est obligatoire. Chaque photo est recadrée en carré puis compressée pour rester légère.",
    },
    {
      target: "product-promo",
      content:
        "Mettez l'article en promotion : prix réduit et date de fin facultative.",
    },
    {
      target: "product-draft",
      content:
        "Pas fini ? Enregistrez un brouillon dans ce navigateur et reprenez plus tard.",
    },
    {
      target: "product-submit",
      content:
        "Enregistrez. Un nouveau produit reste masqué jusqu'à ce que vous le publiiez depuis la liste.",
    },
  ],
  "dashboard-categories": [
    {
      target: "category-create",
      content:
        "Créez une catégorie pour ranger vos produits (ex. Laitiers, Arômes, Emballages).",
    },
    {
      target: "category-tips",
      content: "Quelques conseils pour bien organiser votre catalogue.",
    },
    {
      target: "category-list",
      content:
        "Vos catégories : affichez-les ou masquez-les aux clients, modifiez-les ou supprimez-les.",
      placement: "top",
    },
  ],
  "dashboard-orders": [
    {
      target: "orders-manual",
      content:
        "Une vente au comptoir ou par téléphone ? Enregistrez-la ici comme commande manuelle.",
    },
    {
      target: "orders-filter",
      content: "Filtrez vos commandes par statut pour traiter les plus urgentes.",
    },
    {
      target: "orders-table",
      content:
        "Faites avancer chaque commande étape par étape, jusqu'à la livraison.",
      placement: "top",
    },
  ],
  "dashboard-trash": [
    {
      target: "trash-list",
      content:
        "Les éléments supprimés arrivent ici : restaurez-les, ou supprimez-les définitivement.",
    },
  ],
  "dashboard-activity": [
    {
      target: "activity-list",
      content:
        "L'historique des actions faites sur votre boutique, avec qui les a faites et quand.",
    },
  ],
  "dashboard-support": [
    {
      target: "support-form",
      content:
        "Une question ou un problème ? Écrivez directement à l'équipe ManuShop.",
    },
    {
      target: "support-history",
      content: "Vos messages envoyés et les réponses reçues.",
      placement: "top",
    },
  ],
  "dashboard-shop-settings": [
    {
      target: "shop-visibility",
      content:
        "Publiez votre boutique pour la rendre visible aux clients, ou masquez-la le temps de la préparer.",
    },
    {
      target: "shop-profile",
      content:
        "Le nom, le logo, l'adresse, la description et les contacts de votre boutique.",
    },
    {
      target: "shop-multichannel",
      content:
        "Votre réseau social principal : il définit le format d'image conseillé pour vos articles.",
    },
    {
      target: "shop-contact-methods",
      content:
        "Choisissez comment vos clients peuvent vous contacter — affiché sur la fiche de vos produits.",
    },
    {
      target: "shop-notifications",
      content: "Décidez comment être prévenu d'une nouvelle commande.",
    },
    {
      target: "shop-save",
      content: "N'oubliez pas d'enregistrer vos modifications.",
    },
  ],
  "dashboard-shops": [
    {
      target: "shops-list",
      content: "Toutes vos boutiques, avec leur statut et leur abonnement.",
    },
    {
      target: "shops-manage",
      content:
        "Passez d'une boutique à l'autre : le tableau de bord affiche alors celle-ci.",
    },
    {
      target: "shops-create",
      content: "Ouvrez une nouvelle boutique en quelques étapes.",
    },
  ],
  "dashboard-team": [
    {
      target: "team-invite",
      content:
        "Invitez un vendeur : il reçoit un email pour choisir son mot de passe.",
    },
    {
      target: "team-members",
      content: "Les membres de votre équipe et leur rôle.",
      placement: "top",
    },
  ],

  // ——— Super Admin ———
  "super-admin-home": [
    {
      target: "sa-search",
      content:
        "Retrouvez un compte par pseudo, email ou téléphone pour lui donner ou lui retirer le rôle admin.",
    },
  ],
  "super-admin-merchants": [
    {
      target: "merchants-list",
      content: "Tous les commerçants inscrits sur la plateforme.",
      placement: "top",
    },
    {
      target: "merchants-features",
      content:
        "Activez ou désactivez les fonctionnalités premium boutique par boutique.",
    },
  ],
  "super-admin-messages": [
    {
      target: "messages-list",
      content: "Les messages envoyés par les commerçants.",
      placement: "top",
    },
    {
      target: "messages-reply",
      content: "Répondez directement : le commerçant voit la réponse dans son espace.",
    },
  ],
  "super-admin-settings": [
    {
      target: "settings-card",
      content:
        "Affichez ou non le catalogue de démonstration sur le Marché, pour toute la plateforme.",
    },
  ],
  "super-admin-tags": [
    {
      target: "tags-create",
      content:
        "Créez un tag système (ex. Alimentation) : il sert à filtrer le Marché.",
    },
    {
      target: "tags-list",
      content: "Les tags existants, modifiables ou supprimables.",
      placement: "top",
    },
  ],

  // ——— Vitrine ———
  "storefront-catalogue": [
    {
      target: "catalogue-shops",
      content: "Les boutiques du Marché : ouvrez-en une pour voir tous ses produits.",
    },
    {
      target: "catalogue-filters",
      content: "Filtrez par catégorie ou cherchez un article par son nom.",
    },
    {
      target: "catalogue-sort",
      content: "Triez les articles, par exemple du moins cher au plus cher.",
    },
    {
      target: "product-add-to-cart",
      content: "Ajoutez un article à votre panier en un clic.",
    },
    {
      target: "product-favorite",
      content: "Gardez un article de côté dans vos favoris.",
    },
    {
      target: "storefront-cart",
      content: "Votre panier : vérifiez-le puis passez commande.",
    },
    {
      target: "storefront-account",
      content:
        "Votre compte : connectez-vous pour suivre vos commandes et retrouver vos favoris.",
    },
  ],
  "storefront-shop": [
    {
      target: "shop-contact",
      content: "Les coordonnées de la boutique.",
    },
    {
      target: "catalogue-filters",
      content: "Filtrez par catégorie ou cherchez un article par son nom.",
    },
    {
      target: "catalogue-sort",
      content: "Triez les articles, par exemple du moins cher au plus cher.",
    },
    {
      target: "product-add-to-cart",
      content: "Ajoutez un article à votre panier en un clic.",
    },
    {
      target: "storefront-cart",
      content: "Votre panier : vérifiez-le puis passez commande.",
    },
  ],
  "storefront-shops": [
    {
      target: "shops-directory",
      content:
        "Toutes les boutiques ManuShop : choisissez-en une pour découvrir ses produits.",
      placement: "top",
    },
  ],
  "storefront-product": [
    {
      target: "product-gallery",
      content: "Les photos de l'article.",
    },
    {
      target: "product-buy",
      content: "Ajoutez l'article à votre panier.",
    },
    {
      target: "product-detail-favorite",
      content: "Ou gardez-le dans vos favoris pour plus tard.",
    },
    {
      target: "product-seller",
      content: "La boutique qui vend cet article : cliquez pour voir ses autres produits.",
    },
    {
      target: "product-reviews",
      content: "Les avis laissés par les clients qui l'ont reçu.",
      placement: "top",
    },
  ],
  "storefront-checkout": [
    {
      target: "checkout-delivery",
      content: "Indiquez votre nom, votre téléphone et l'adresse de livraison.",
    },
    {
      target: "checkout-methods",
      content: "Choisissez votre moyen de paiement.",
    },
    {
      target: "checkout-summary",
      content: "Vérifiez le récapitulatif et le total.",
    },
    {
      target: "checkout-confirm",
      content: "Confirmez : la boutique reçoit votre commande.",
    },
  ],
  "storefront-my-orders": [
    {
      target: "my-orders-list",
      content:
        "Suivez vos commandes. Une fois livrée, vous pouvez laisser un avis au vendeur.",
      placement: "top",
    },
  ],
  "storefront-favorites": [
    {
      target: "favorites-grid",
      content: "Les articles que vous avez mis de côté, prêts à être commandés.",
      placement: "top",
    },
  ],
  "storefront-account": [
    {
      target: "account-identity",
      content:
        "Votre nom, votre téléphone, votre photo de profil et vos préférences d'email.",
    },
    {
      target: "account-security",
      content:
        "Votre identifiant de connexion, votre rôle, et le changement de mot de passe.",
    },
  ],

  // ——— Accueil et authentification ———
  home: [
    {
      target: "home-nav",
      content: "Explorez le Marché, les fonctionnalités et la présentation de ManuShop.",
    },
    {
      target: "home-search",
      content: "Cherchez directement un produit.",
    },
    {
      target: "home-login",
      content: "Connectez-vous, ou créez votre espace pour ouvrir votre boutique.",
    },
  ],
  "auth-login": [
    {
      target: "login-form",
      content: "Connectez-vous avec votre email et votre mot de passe.",
    },
    {
      target: "login-forgot",
      content: "Mot de passe oublié ? Recevez un lien de réinitialisation par email.",
    },
    {
      target: "login-social",
      content: "Ou connectez-vous en un clic avec Google ou Facebook.",
    },
    {
      target: "login-register",
      content: "Pas encore de compte ? Créez votre espace ici.",
    },
  ],
  "auth-register": [
    {
      target: "register-form",
      content:
        "Votre nom, votre email et un mot de passe — l'icône en forme d'œil permet de vérifier ce que vous tapez.",
    },
    {
      target: "register-submit",
      content: "Créez votre compte.",
    },
    {
      target: "register-login",
      content: "Déjà inscrit ? Connectez-vous plutôt.",
    },
  ],
  "auth-forgot-password": [
    {
      target: "forgot-form",
      content:
        "Saisissez l'email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.",
    },
  ],
  "auth-onboarding": [
    {
      target: "onboarding-form",
      content: "Dernière étape : indiquez votre nom pour finaliser votre compte.",
    },
  ],
} satisfies Record<string, TourStepDefinition[]>;

export type TourId = keyof typeof TOURS;
