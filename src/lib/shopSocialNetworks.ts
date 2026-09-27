import type { PrimarySocialNetwork, Shop } from "@/models/shop/Shop";

export const SOCIAL_NETWORK_LABELS: Record<PrimarySocialNetwork, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

type SocialUrlField =
  | "whatsappBusinessUrl"
  | "facebookUrl"
  | "instagramUrl"
  | "tiktokUrl";

/** Quel champ de `Shop` porte le lien du réseau social choisi comme
 * principal — un seul champ de formulaire ("Lien de votre page ...")
 * s'y rebranche dynamiquement plutôt que d'afficher les 4 en permanence. */
export const SOCIAL_NETWORK_URL_FIELD: Record<PrimarySocialNetwork, SocialUrlField> = {
  whatsapp: "whatsappBusinessUrl",
  facebook: "facebookUrl",
  instagram: "instagramUrl",
  tiktok: "tiktokUrl",
};

/**
 * Lien vers la page du réseau social principal d'une boutique, s'il est
 * renseigné (BF-128, fiche produit) — `null` si la boutique n'a pas choisi
 * de réseau principal, ou que le lien correspondant est vide.
 */
export function getPrimarySocialNetworkUrl(shop: Shop): string | null {
  if (!shop.primarySocialNetwork) return null;
  const url = shop[SOCIAL_NETWORK_URL_FIELD[shop.primarySocialNetwork]];
  return url && url.trim() ? url : null;
}
