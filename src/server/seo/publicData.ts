import "server-only";

import { cache } from "react";

import { buildRates, type CurrencyRates } from "@/lib/currency";
import { resolveLaunchPromo, type LaunchPromoSettings } from "@/lib/launchPromo";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getSiteUrl, normalizeSiteUrl } from "@/lib/siteUrl";
import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";

/**
 * Données publiques lues côté serveur pour le référencement (métadonnées,
 * données structurées, plan du site). Uniquement ce qu'un visiteur voit
 * déjà sur la vitrine : boutiques publiées, articles visibles. Un échec de
 * lecture (identifiants serveur absents en local...) ne casse jamais la
 * page : elle garde ses métadonnées génériques.
 *
 * `cache` (React) : `generateMetadata` et la page lisent la même boutique
 * ou le même article une seule fois par requête.
 */

function isVisibleProduct(product: Product): boolean {
  return !product.deletedAt && product.isPublished !== false;
}

async function safely<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`Référencement : lecture « ${label} » impossible`, error);
    return fallback;
  }
}

export const getPublicShop = cache(async (shopId: string): Promise<Shop | null> =>
  safely(
    `boutique ${shopId}`,
    async () => {
      const snapshot = await getAdminDb().collection("shops").doc(shopId).get();
      const shop = snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as Shop) : null;
      return shop?.isPublished ? shop : null;
    },
    null
  )
);

/** Article visible d'une boutique publiée, avec sa boutique. */
export const getPublicProduct = cache(
  async (productId: string): Promise<{ product: Product; shop: Shop } | null> =>
    safely(
      `article ${productId}`,
      async () => {
        const snapshot = await getAdminDb().collection("products").doc(productId).get();
        if (!snapshot.exists) return null;
        const product = { id: snapshot.id, ...snapshot.data() } as Product;
        if (!isVisibleProduct(product)) return null;
        const shop = await getPublicShop(product.shopId);
        return shop ? { product, shop } : null;
      },
      null
    )
);

/** Taux de change de la plateforme — prix des données structurées dans la
 * devise affichée aux clients. */
export const getPublicRates = cache(async (): Promise<CurrencyRates> =>
  safely(
    "taux de change",
    async () => {
      const snapshot = await getAdminDb().collection("configuration").doc("general").get();
      return buildRates(snapshot.data()?.usdToXafRate);
    },
    buildRates(undefined)
  )
);

export interface SitemapData {
  shops: Shop[];
  products: Product[];
}

/** Boutiques publiées et leurs articles visibles, pour `sitemap.xml`. */
export async function listPublicCatalogue(): Promise<SitemapData> {
  return safely(
    "plan du site",
    async () => {
      const db = getAdminDb();
      const shopsSnapshot = await db.collection("shops").where("isPublished", "==", true).get();
      const shops = shopsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop);
      const publishedIds = new Set(shops.map((s) => s.id));
      const productsSnapshot = await db.collection("products").get();
      const products = productsSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Product)
        .filter((p) => publishedIds.has(p.shopId) && isVisibleProduct(p));
      return { shops, products };
    },
    { shops: [], products: [] }
  );
}

/** Promotion de l'accueil. Échec de lecture : `null` (promotion masquée)
 * plutôt que les valeurs par défaut — ne jamais réafficher une offre que le
 * Super Admin aurait désactivée. */
export async function getLaunchPromo(): Promise<LaunchPromoSettings | null> {
  return safely(
    "promotion de l'accueil",
    async () => {
      const snapshot = await getAdminDb().collection("configuration").doc("general").get();
      return resolveLaunchPromo(snapshot.data()?.launchPromo);
    },
    null
  );
}

/**
 * Adresse publique du site : celle réglée par le Super Admin (nouveau
 * domaine), sinon `getSiteUrl()`. Sert aux liens absolus (QR code des
 * factures, plan du site, données structurées, aperçus de partage).
 */
export const getPublicSiteUrl = cache(async (): Promise<string> =>
  safely(
    "adresse du site",
    async () => {
      const snapshot = await getAdminDb().collection("configuration").doc("general").get();
      const configured = snapshot.data()?.siteUrl;
      return (typeof configured === "string" && normalizeSiteUrl(configured)) || getSiteUrl();
    },
    getSiteUrl()
  )
);
