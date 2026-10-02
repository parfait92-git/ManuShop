/** Hébergeurs dont `next/image` peut optimiser les images (redimensionnement
 * à la taille affichée, WebP/AVIF, cache). Source unique, lue à la fois par
 * `next.config.ts` (`images.remotePatterns`) et par `isOptimizableImage`. */
export const OPTIMIZABLE_IMAGE_HOSTS = [
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "platform-lookaside.fbsbx.com",
  // Images de démo (src/data/mockData.ts) — jamais utilisé pour de vraies
  // données produit/boutique.
  "picsum.photos",
] as const;

/** Un logo de boutique peut être un lien externe collé à la main (mode
 * "Lien" de `ShopLogoStep`) : impossible de lister tous les hébergeurs
 * possibles, ceux-là doivent passer en `unoptimized`. Mais un logo envoyé
 * via la galerie (Cloudinary) peut, lui, être servi à la taille affichée
 * plutôt qu'en 512px d'origine. Les chemins locaux ("/images/...") sont
 * toujours optimisables. */
export function isOptimizableImage(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      (OPTIMIZABLE_IMAGE_HOSTS as readonly string[]).includes(url.hostname)
    );
  } catch {
    return false;
  }
}
