import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/server/seo/publicData";

/** Relu au plus toutes les heures : suit le domaine réglé par le Super
 * Admin sans redéploiement. */
export const revalidate = 3600;

/**
 * Vitrine ouverte aux moteurs de recherche ; espaces privés (gérant, Super
 * Admin, compte client, paiement, API) écartés — ils exigent une connexion
 * et n'ont rien à faire dans des résultats de recherche.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/super-admin",
        "/mon-compte",
        "/mes-commandes",
        "/mes-favoris",
        "/checkout",
        "/onboarding",
        "/erreur",
        "/api/",
        // Pages de vérification des factures : publiques pour qui a le
        // code, mais sans intérêt (ni droit) dans des résultats de recherche.
        "/verifier",
        "/boutique/*/verifier",
      ],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
