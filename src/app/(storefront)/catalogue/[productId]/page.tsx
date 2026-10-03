import type { Metadata } from "next";

import { PageTour } from "@/components/onboarding/PageTour";
import { ProductDetailPageContent } from "@/components/storefront/ProductDetailPageContent";
import {
  hiddenPageMetadata,
  productJsonLd,
  productMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import { getPublicProduct, getPublicRates } from "@/server/seo/publicData";

/**
 * Fiche publique d'un article. Composant serveur pour le référencement
 * (2026-10-02) : titre, description, photos de partage et données
 * structurées schema.org `Product` (prix dans la devise affichée aux
 * clients, disponibilité) — la fiche elle-même reste interactive.
 */
export async function generateMetadata({
  params,
}: PageProps<"/catalogue/[productId]">): Promise<Metadata> {
  const { productId } = await params;
  const found = await getPublicProduct(productId);
  return found
    ? productMetadata(found.product, found.shop)
    : hiddenPageMetadata("Article introuvable");
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/catalogue/[productId]">) {
  const { productId } = await params;
  const found = await getPublicProduct(productId);
  const rates = found ? await getPublicRates() : null;

  return (
    <>
      {found && rates && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(productJsonLd(found.product, found.shop, getSiteUrl(), rates)),
          }}
        />
      )}
      <PageTour tourId="storefront-product" />
      <ProductDetailPageContent productId={productId} />
    </>
  );
}
