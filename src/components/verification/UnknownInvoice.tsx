import { ShieldAlert } from "lucide-react";

import { VerificationCodeForm } from "@/components/verification/VerificationCodeForm";

/** Code inconnu : aucune facture ManuShop ne correspond. */
export function UnknownInvoice({ code }: { code: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Vérification de facture</h1>
      <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
        <ShieldAlert className="size-8 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">Aucune facture ne correspond à ce code</p>
          <p className="text-sm break-words">
            Vérifiez que vous l&apos;avez bien recopié. Si le code est exact, cette facture n&apos;a
            pas été émise par ManuShop : ne vous y fiez pas et contactez la boutique.
          </p>
        </div>
      </div>
      <VerificationCodeForm defaultValue={code} />
    </div>
  );
}
