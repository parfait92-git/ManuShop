import type { Metadata } from "next";

import { convertFromXaf, displayCurrency, shopCurrency, type CurrencyRates } from "@/lib/currency";
import { effectivePrice } from "@/lib/promo";
import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";

/**
 * Référencement des boutiques et de leurs articles (demande de
 * l'utilisateur, 2026-10-02) : métadonnées de page (`generateMetadata`),
 * données structurées schema.org (JSON-LD) et textes alternatifs des
 * photos. Fonctions pures — les données sont lues côté serveur par
 * `src/server/seo/publicData.ts`.
 *
 * **Chaque boutique est présentée comme le site de son commerçant** : ses
 * clients paient un abonnement pour avoir leur propre boutique en ligne.
 * Sur les pages d'une boutique et de ses articles, rien ne mentionne
 * ManuShop — titre, nom du site, icône (logo de la boutique) et
 * descriptions sont ceux de la boutique.
 */

/** Longueur au-delà de laquelle Google tronque une description. */
const DESCRIPTION_MAX = 160;

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Coupe à la fin d'un mot, avec points de suspension. */
export function truncate(text: string, max: number = DESCRIPTION_MAX): string {
  const value = clean(text);
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Description d'une boutique : la sienne, sinon une phrase construite à
 * partir de ce que l'on sait d'elle (secteur, ville) — jamais vide. */
export function describeShop(shop: Pick<Shop, "name" | "description" | "sector" | "address">): string {
  const own = clean(shop.description);
  if (own) return truncate(own);
  const what = clean(shop.sector);
  const where = clean(shop.address);
  const intro = [shop.name, what && `— ${what}`, where && `à ${where}`].filter(Boolean).join(" ");
  return truncate(`${intro}. Découvrez nos produits et commandez en ligne.`);
}

/** Description d'un article : la sienne, sinon nom, catégorie et boutique. */
export function describeProduct(
  product: Pick<Product, "name" | "description" | "category">,
  shop: Pick<Shop, "name">
): string {
  const own = clean(product.description);
  if (own) return truncate(own);
  return truncate(
    `${product.name}${product.category ? ` (${product.category})` : ""} — ${shop.name}. Commandez en ligne.`
  );
}

/** Texte alternatif d'une photo d'article : ce qu'elle montre, pour les
 * lecteurs d'écran et la recherche d'images. */
export function productImageAlt(
  product: Pick<Product, "name" | "category">,
  options: { shopName?: string; index?: number; total?: number } = {}
): string {
  const parts = [product.name];
  if (product.category) parts.push(product.category);
  if (options.shopName) parts.push(options.shopName);
  const base = parts.join(" — ");
  return options.total && options.total > 1 && options.index !== undefined
    ? `${base} (photo ${options.index + 1} sur ${options.total})`
    : base;
}

export function shopPath(shopId: string): string {
  return `/boutique/${shopId}`;
}

export function productPath(productId: string): string {
  return `/catalogue/${productId}`;
}

/** Métadonnées d'une page que l'on ne veut pas voir dans les résultats
 * (boutique non publiée, article masqué ou introuvable). */
export function hiddenPageMetadata(title: string): Metadata {
  // Pas d'URL canonique héritée d'une page parente (le Marché, par exemple).
  return { title, robots: { index: false, follow: false }, alternates: { canonical: null } };
}

/** Identité commune à toutes les pages d'une boutique : son nom comme nom
 * du site, son logo comme icône — à la place de ceux de ManuShop. */
function shopIdentity(shop: Shop): Pick<Metadata, "applicationName" | "icons" | "keywords"> {
  return {
    applicationName: shop.name,
    // Remplace les mots clés de la plateforme (mise en page racine).
    keywords: [shop.name, clean(shop.sector), clean(shop.address)].filter(Boolean),
    ...(shop.logo ? { icons: { icon: shop.logo, apple: shop.logo } } : {}),
  };
}

/** Titre de la page d'accueil d'une boutique : son nom, et son activité
 * si elle est connue — "Chez Awa — Mode". */
export function shopTitle(shop: Pick<Shop, "name" | "sector">): string {
  const sector = clean(shop.sector);
  return sector ? `${shop.name} — ${sector}` : shop.name;
}

export function shopMetadata(shop: Shop): Metadata {
  const description = describeShop(shop);
  const images = shop.logo ? [{ url: shop.logo, alt: `Logo de ${shop.name}` }] : undefined;
  return {
    // `absolute` : pas de « | ManuShop » ajouté par la mise en page racine.
    title: { absolute: shopTitle(shop) },
    description,
    ...shopIdentity(shop),
    alternates: { canonical: shopPath(shop.id) },
    openGraph: {
      type: "website",
      siteName: shop.name,
      title: shopTitle(shop),
      description,
      url: shopPath(shop.id),
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: shopTitle(shop),
      description,
    },
  };
}

export function productMetadata(product: Product, shop: Shop): Metadata {
  const description = describeProduct(product, shop);
  const images = product.images.map((url, index) => ({
    url,
    alt: productImageAlt(product, { shopName: shop.name, index, total: product.images.length }),
  }));
  return {
    title: { absolute: `${product.name} — ${shop.name}` },
    description,
    ...shopIdentity(shop),
    alternates: { canonical: productPath(product.id) },
    openGraph: {
      type: "website",
      siteName: shop.name,
      title: `${product.name} — ${shop.name}`,
      description,
      url: productPath(product.id),
      images,
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: product.name,
      description,
    },
  };
}

type JsonLd = Record<string, unknown>;

export function shopJsonLd(shop: Shop, siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: shop.name,
    description: describeShop(shop),
    url: `${siteUrl}${shopPath(shop.id)}`,
    ...(shop.logo ? { logo: shop.logo, image: shop.logo } : {}),
    ...(shop.phone ? { telephone: shop.phone } : {}),
    ...(shop.address ? { address: { "@type": "PostalAddress", streetAddress: shop.address } } : {}),
    ...(shop.sector ? { knowsAbout: shop.sector } : {}),
  };
}

/** Prix annoncé aux moteurs : le même que celui affiché aux clients, dans
 * la devise de la boutique (prix promo en cours compris). */
export function productJsonLd(
  product: Product,
  shop: Shop,
  siteUrl: string,
  rates: CurrencyRates
): JsonLd {
  const currency = displayCurrency(shopCurrency(shop), rates);
  const price = convertFromXaf(effectivePrice(product), currency, rates);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: describeProduct(product, shop),
    ...(product.images.length > 0 ? { image: product.images } : {}),
    ...(product.category ? { category: product.category } : {}),
    brand: { "@type": "Brand", name: shop.name },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}${productPath(product.id)}`,
      price: currency === "XAF" ? Math.round(price) : Number(price.toFixed(2)),
      priceCurrency: currency,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: shop.name },
    },
  };
}

/** Contenu d'une balise `<script type="application/ld+json">`, avec `<`
 * neutralisé : un nom ou une description saisis par un commerçant ne
 * peuvent pas fermer la balise et injecter du HTML (guide JSON-LD de
 * Next.js). */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
