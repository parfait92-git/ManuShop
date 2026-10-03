import { BadgeCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

import type { VerificationState } from "@/server/integrity/verifyInvoice";

const SEALS: Record<
  VerificationState,
  { icon: typeof BadgeCheck; title: string; subtitle: string; className: string; iconClass: string }
> = {
  authentic: {
    icon: BadgeCheck,
    title: "Facture authentique",
    subtitle: "Signature numérique vérifiée par ManuShop",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  unsigned: {
    icon: ShieldQuestion,
    title: "Facture enregistrée, non signée",
    subtitle:
      "Elle correspond aux enregistrements de ManuShop, mais a été émise avant la signature numérique.",
    className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  tampered: {
    icon: ShieldAlert,
    title: "Attention : facture non conforme",
    subtitle:
      "Les données ne correspondent plus à leur signature. Ne vous fiez pas à cette facture et contactez la boutique.",
    className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-400",
  },
};

/** Sceau de certification de la page de vérification. Il n'a de valeur
 * que sur le domaine officiel : un faussaire peut copier l'image, pas la
 * page servie par ManuShop. */
export function CertifiedSeal({
  state,
  partialHistory = false,
}: {
  state: VerificationState;
  /** Commande antérieure au journal signé : la facture est signée, mais
   * pas chacune des étapes passées. */
  partialHistory?: boolean;
}) {
  const seal = SEALS[state];
  const subtitle =
    state === "authentic" && partialHistory
      ? "Signature numérique vérifiée par ManuShop. Commande antérieure au journal signé : ses premières étapes sont reconstituées."
      : seal.subtitle;
  const Icon = seal.icon;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 ${seal.className}`}>
      <span className="relative flex size-11 shrink-0 sm:size-14 items-center justify-center rounded-full border-2 border-current/30 bg-background">
        <Icon className={`size-6 sm:size-8 ${seal.iconClass}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold break-words hyphens-auto">{seal.title}</p>
        <p className="text-sm break-words opacity-90">{subtitle}</p>
      </div>
    </div>
  );
}
