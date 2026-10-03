/**
 * Référencement de la plateforme ManuShop elle-même (accueil, Marché,
 * annuaire, inscription) — distinct de celui des boutiques (`seo.ts`), qui
 * sont présentées comme le site propre de leur commerçant, sans ManuShop.
 *
 * Mots clés choisis pour les recherches de commerçants qui veulent vendre
 * en ligne au Cameroun (2026-10-02). Règle : **ne citer que ce que la
 * plateforme fait réellement** — ni facturation (BF-24→29), ni publication
 * sur les réseaux sociaux (BF-41→45), ni paiement Mobile Money réel
 * (BF-78, écran seulement) tant qu'ils ne sont pas construits. Une page qui
 * promet plus que ce qu'elle offre déçoit ceux qui s'abonnent, et Google
 * la pénalise.
 */

/** Moins de 60 caractères : au-delà, Google tronque le titre. */
export const PLATFORM_TITLE = "ManuShop — Créez votre boutique en ligne au Cameroun";

/** Moins de 160 caractères (voir `seo.test.ts`). */
export const PLATFORM_DESCRIPTION =
  "Créez votre boutique en ligne au Cameroun : catalogue avec photos, commandes en ligne et sur WhatsApp, suivi du stock, clients et gains, depuis votre téléphone.";

/** Termes que tapent les commerçants qui cherchent ce type de service.
 * Peu utilisés par Google (qui s'appuie sur le titre, la description et le
 * contenu), mais lus par d'autres moteurs. */
export const PLATFORM_KEYWORDS = [
  "boutique en ligne Cameroun",
  "créer une boutique en ligne",
  "site e-commerce Cameroun",
  "vendre en ligne au Cameroun",
  "vendre sur WhatsApp",
  "commande WhatsApp",
  "catalogue en ligne",
  "gestion de stock",
  "gestion des commandes",
  "fichier clients",
  "commerce en ligne Douala",
  "commerce en ligne Yaoundé",
  "marketplace Cameroun",
  "plateforme e-commerce Afrique",
  "boutique en ligne FCFA",
];

export const MARKET_TITLE = "Le Marché — acheter en ligne au Cameroun";

export const MARKET_DESCRIPTION =
  "Achetez en ligne auprès des boutiques du Cameroun : mode, beauté, alimentation, électronique… Comparez les produits et commandez en ligne ou par WhatsApp.";

export const MARKET_KEYWORDS = [
  "acheter en ligne Cameroun",
  "marketplace Cameroun",
  "boutiques en ligne Douala",
  "boutiques en ligne Yaoundé",
  "commander sur WhatsApp",
  "promotions Cameroun",
];

export const DIRECTORY_TITLE = "Toutes les boutiques en ligne";

export const DIRECTORY_DESCRIPTION =
  "Annuaire des boutiques en ligne du Cameroun sur ManuShop : découvrez les commerçants près de chez vous, leurs produits, et commandez directement auprès d'eux.";

export const REGISTER_TITLE = "Ouvrir ma boutique en ligne";

export const REGISTER_DESCRIPTION =
  "Ouvrez votre boutique en ligne au Cameroun avec ManuShop : vos produits en ligne, vos commandes WhatsApp, votre stock et vos gains réunis au même endroit.";

/** Données structurées de l'accueil : l'organisation et le site, avec la
 * recherche du Marché (`/catalogue?q=`) déclarée à Google. */
export function platformJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organisation`,
        name: "ManuShop",
        url: `${siteUrl}/`,
        logo: `${siteUrl}/icons/icon-512.png`,
        description: PLATFORM_DESCRIPTION,
        areaServed: { "@type": "Country", name: "Cameroun" },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#site`,
        name: "ManuShop",
        url: `${siteUrl}/`,
        inLanguage: "fr",
        description: PLATFORM_DESCRIPTION,
        publisher: { "@id": `${siteUrl}/#organisation` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/catalogue?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
