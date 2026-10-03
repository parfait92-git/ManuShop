import type { Metadata } from "next";

import { ShopStorefrontPage } from "@/components/storefront/ShopStorefrontPage";
import { hiddenPageMetadata, serializeJsonLd, shopJsonLd, shopMetadata } from "@/lib/seo";
import { getPublicShop, getPublicSiteUrl } from "@/server/seo/publicData";

/**
 * Vitrine publique d'une boutique. Composant serveur pour le référencement
 * (2026-10-02) : titre, description et aperçu de partage propres à la
 * boutique, et données structurées schema.org `Store` — la vitrine
 * elle-même reste interactive (`ShopStorefrontPage`).
 */
export async function generateMetadata({
  params,
}: PageProps<"/boutique/[shopId]">): Promise<Metadata> {
  const { shopId } = await params;
  const shop = await getPublicShop(shopId);
  return shop ? shopMetadata(shop) : hiddenPageMetadata("Boutique introuvable");
}

export default async function ShopPage({ params }: PageProps<"/boutique/[shopId]">) {
  const { shopId } = await params;
  const shop = await getPublicShop(shopId);
  const siteUrl = await getPublicSiteUrl();

  return (
    <>
      {shop && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(shopJsonLd(shop, siteUrl)) }}
        />
      )}
      <ShopStorefrontPage shopId={shopId} />
    </>
  );
}
