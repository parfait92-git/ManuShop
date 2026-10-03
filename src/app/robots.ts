import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/siteUrl";

/**
 * Vitrine ouverte aux moteurs de recherche ; espaces privés (gérant, Super
 * Admin, compte client, paiement, API) écartés — ils exigent une connexion
 * et n'ont rien à faire dans des résultats de recherche.
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
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
      ],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
