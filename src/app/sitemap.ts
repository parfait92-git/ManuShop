import type { MetadataRoute } from "next";

import { productPath, shopPath } from "@/lib/seo";
import { getPublicSiteUrl, listPublicCatalogue } from "@/server/seo/publicData";

/** Régénéré au plus toutes les heures : une boutique publiée ou un article
 * ajouté y apparaît sans redéploiement. */
export const revalidate = 3600;

/**
 * Plan du site pour les moteurs de recherche : pages publiques, boutiques
 * publiées et leurs articles visibles (jamais les espaces privés).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, { shops, products }] = await Promise.all([getPublicSiteUrl(), listPublicCatalogue()]);
  const date = (value: { toDate(): Date } | undefined) => value?.toDate();

  return [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/catalogue`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/boutiques`, changeFrequency: "daily", priority: 0.8 },
    ...shops.map((shop) => ({
      url: `${site}${shopPath(shop.id)}`,
      lastModified: date(shop.createdAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${site}${productPath(product.id)}`,
      lastModified: date(product.updatedAt ?? product.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      ...(product.images.length > 0 ? { images: product.images } : {}),
    })),
  ];
}
