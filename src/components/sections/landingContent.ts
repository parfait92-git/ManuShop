import {
  BarChart3,
  Boxes,
  MapPin,
  MessageCircle,
  Smartphone,
  Store,
  Tag,
  Zap,
} from "lucide-react";

import type { FeatureGridItem } from "@/components/sections/FeatureGrid";

/**
 * Textes de la page d'accueil (2026-10-02). Règle, vérifiée par
 * `landingContent.test.ts` : **ne présenter comme disponible que ce qui
 * existe vraiment**. Les fonctions prévues mais pas encore construites
 * (envoi des factures par WhatsApp BF-27, factures groupées par période
 * BF-104, publication sur les réseaux sociaux BF-41→45,
 * paiement Mobile Money réel BF-78…) ne figurent que dans `COMING_SOON`,
 * annoncées comme telles. ManuShop vit d'abonnements : un commerçant qui
 * s'abonne pour une fonction absente se désabonne — et Google pénalise une
 * page qui promet plus que ce qu'elle offre.
 */

export const HERO_EYEBROW = "boutique en ligne, installable sur mobile";

export const HERO_DESCRIPTION =
  "Créez votre boutique en ligne au Cameroun : catalogue avec photos, commandes en ligne et sur WhatsApp, suivi du stock et de vos gains, depuis votre téléphone.";

export const HERO_WATERMARK =
  "Créez votre boutique en ligne au Cameroun : votre propre adresse, votre catalogue, vos commandes WhatsApp, votre stock et vos gains, réunis dans une application installable.";

export const FEATURES: FeatureGridItem[] = [
  {
    icon: Store,
    title: "Votre boutique, votre site",
    description:
      "Votre propre adresse et votre logo : vos clients et Google voient votre boutique à votre nom, prête à partager.",
  },
  {
    icon: MessageCircle,
    title: "Commandes en ligne et WhatsApp",
    description:
      "Vos clients commandent en ligne ou par WhatsApp en un clic. À la livraison, chacun reçoit sa facture PDF, à vos couleurs.",
  },
  {
    icon: Boxes,
    title: "Catalogue et stock",
    description:
      "Produits avec photos et catégories, stock mis à jour à chaque commande et signalé dès qu'il devient faible.",
  },
  {
    icon: Tag,
    title: "Promotions",
    description:
      "Prix réduit et badge de réduction sur vos articles, qui s'arrêtent tout seuls à la date de fin choisie.",
  },
  {
    icon: BarChart3,
    title: "Vos gains en clair",
    description:
      "Chiffre d'affaires, coût d'achat et marge par article, par catégorie, par semaine ou par mois, et le fichier de vos clients.",
  },
  {
    icon: Smartphone,
    title: "Sur votre téléphone",
    description:
      "Application installable, légère même avec une petite connexion, prix en FCFA, euro ou dollar, et aide intégrée sur chaque écran.",
  },
];

export const ABOUT_DESCRIPTION =
  "ManuShop aide les commerçants à vendre en ligne sans complexité : une boutique à leur nom, un catalogue, les commandes en ligne et sur WhatsApp, le stock et les gains, réunis dans une application pensée pour le mobile.";

export const ABOUT_VALUES = [
  {
    icon: MapPin,
    text: "Conçu au Cameroun, pour des besoins locaux : commandes WhatsApp, prix en FCFA, photos allégées pour les petites connexions.",
  },
  {
    icon: Smartphone,
    text: "Installable sur votre téléphone comme une application, sans passer par un magasin d'applications.",
  },
  {
    icon: Store,
    text: "Chaque boutique reste indépendante : ses propres produits, son propre style, sa propre clientèle.",
  },
];

/** Prévu, pas encore disponible — annoncé comme tel, jamais ailleurs. */
export const COMING_SOON = [
  "Factures envoyées par WhatsApp",
  "Publication sur vos réseaux sociaux",
  "Paiement Mobile Money",
  "Codes promo",
];

export const COMING_SOON_ICON = Zap;
