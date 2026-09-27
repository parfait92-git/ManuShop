/**
 * Privilèges premium activables par boutique (BF-119) — chaque clé
 * correspond à une fonctionnalité premium déjà documentée dans le cahier
 * des charges (Module 18/19, docs/02-besoins-fonctionnels.md) mais pas
 * encore construite. Le Super Admin peut déjà accorder/retirer chaque
 * privilège par boutique dès maintenant (indépendamment de l'abonnement) ;
 * la fonctionnalité elle-même consommera ce champ une fois construite —
 * même convention que `User.notifyByEmail`, posé avant son consommateur.
 */
export const PREMIUM_FEATURES = {
  salesIntervalFilter: "Filtre de ventes par intervalle (BF-102)",
  advancedContact: "Moyens de contact configurables (BF-105)",
  socialFooterLinks: "Réseaux sociaux en pied de page (BF-106)",
  visitStats: "Statistiques de consultation (BF-107)",
  contactForm: "Formulaire « Nous contacter » (BF-112)",
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

export const PREMIUM_FEATURE_KEYS = Object.keys(
  PREMIUM_FEATURES
) as PremiumFeatureKey[];
