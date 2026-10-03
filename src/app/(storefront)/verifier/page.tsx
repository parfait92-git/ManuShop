import type { Metadata } from "next";

import { VerificationCodeForm } from "@/components/verification/VerificationCodeForm";
import { hiddenPageMetadata } from "@/lib/seo";

export const metadata: Metadata = hiddenPageMetadata("Vérifier une facture");

/** Vérification d'une facture par son code, pour qui ne peut pas scanner
 * le QR code. */
export default function VerifyPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vérifier une facture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez le code imprimé sous le QR code de la facture : vous verrez si elle a bien été
          émise par la boutique, son montant officiel et le parcours de la commande.
        </p>
      </div>
      <VerificationCodeForm />
    </div>
  );
}
