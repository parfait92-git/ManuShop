import type { Metadata } from "next";

import { InvoiceVerificationView } from "@/components/verification/InvoiceVerificationView";
import { UnknownInvoice } from "@/components/verification/UnknownInvoice";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { hiddenPageMetadata } from "@/lib/seo";
import { normalizeVerificationCode } from "@/server/integrity/signing";
import { verifyInvoiceByCode } from "@/server/integrity/verifyInvoice";
import { getPublicShop, getPublicSiteUrl } from "@/server/seo/publicData";

export const metadata: Metadata = hiddenPageMetadata("Vérification de facture");

/**
 * Page ouverte par le QR code d'une facture (2026-10-03), à l'adresse de
 * la boutique. Toujours relue au moment de la visite (jamais mise en
 * cache) : elle montre l'état réel de la commande.
 */
export default async function InvoiceVerificationPage({
  params,
}: {
  params: Promise<{ shopId: string; code: string }>;
}) {
  const { shopId, code: rawCode } = await params;
  const code = normalizeVerificationCode(decodeURIComponent(rawCode));
  const verification = code ? await verifyInvoiceByCode(getAdminDb(), code) : null;

  // Un code valide présenté sous une autre boutique ne vaut rien : un
  // faussaire ne doit pas pouvoir afficher la facture d'une boutique sous
  // le nom d'une autre.
  if (!verification || verification.shopId !== shopId) {
    return <UnknownInvoice code={decodeURIComponent(rawCode)} />;
  }

  const [shop, siteUrl] = await Promise.all([getPublicShop(shopId), getPublicSiteUrl()]);
  return (
    <InvoiceVerificationView
      verification={verification}
      shop={shop ? { name: shop.name, logo: shop.logo || undefined } : null}
      siteOrigin={siteUrl}
    />
  );
}
