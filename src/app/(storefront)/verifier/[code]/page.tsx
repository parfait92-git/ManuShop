import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnknownInvoice } from "@/components/verification/UnknownInvoice";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { hiddenPageMetadata, shopPath } from "@/lib/seo";
import { normalizeVerificationCode } from "@/server/integrity/signing";
import { INVOICES_COLLECTION } from "@/server/invoices/issueInvoice";

export const metadata: Metadata = hiddenPageMetadata("Vérification de facture");

/** Code saisi à la main : retrouve la boutique de la facture, puis ouvre
 * la même page que le QR code. */
export default async function VerifyCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const typed = decodeURIComponent(rawCode);
  const code = normalizeVerificationCode(typed);
  if (code) {
    const found = await getAdminDb()
      .collection(INVOICES_COLLECTION)
      .where("verificationCode", "==", code)
      .limit(1)
      .get();
    if (!found.empty) {
      redirect(`${shopPath(found.docs[0].data().shopId)}/verifier/${code}`);
    }
  }
  return <UnknownInvoice code={typed} />;
}
