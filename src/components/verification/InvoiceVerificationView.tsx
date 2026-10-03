import { CheckCircle2, CircleDashed, Lock, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CertifiedSeal } from "@/components/verification/CertifiedSeal";
import { isOptimizableImage } from "@/lib/imageHosts";
import { shopPath } from "@/lib/seo";
import type { InvoiceVerification } from "@/server/integrity/verifyInvoice";

const dateTime = (date: Date) =>
  date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Douala",
  });

/**
 * Page publique de vérification d'une facture (2026-10-03), ouverte en
 * scannant son QR code : la boutique, le sceau (authentique, non signée ou
 * non conforme), les montants officiels à comparer avec le papier, et la
 * chronologie de la commande.
 */
export function InvoiceVerificationView({
  verification,
  shop,
  siteOrigin,
}: {
  verification: InvoiceVerification;
  shop: { name: string; logo?: string } | null;
  /** Domaine officiel en vigueur, ex. « https://manu-shop.vercel.app ». */
  siteOrigin: string;
}) {
  const v = verification;
  const shopName = shop?.name ?? v.sellerName;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={shopPath(v.shopId)}
        className="flex min-w-0 items-center gap-3 self-start rounded-lg hover:opacity-80"
      >
        {shop?.logo ? (
          <Image
            src={shop.logo}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-full border border-border object-cover"
            unoptimized={!isOptimizableImage(shop.logo)}
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Store className="size-5 text-primary" aria-hidden />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold">{shopName}</span>
          <span className="block text-sm text-muted-foreground">Voir la boutique</span>
        </span>
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vérification de facture</h1>
        <p className="mt-1 text-sm text-muted-foreground">Code {v.code}</p>
      </div>

      <CertifiedSeal state={v.state} partialHistory={v.partialHistory} />

      <p className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 break-words">
          Cette vérification n&apos;a de valeur que si l&apos;adresse de cette page commence par{" "}
          <strong className="break-all">{siteOrigin}/</strong>. Comparez aussi les montants ci-dessous avec ceux de
          votre facture : ils doivent être identiques.
        </span>
      </p>

      <section aria-labelledby="invoice-details" className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:p-6">
        <h2 id="invoice-details" className="font-semibold">
          Facture {v.number}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Vendeur</dt>
            <dd className="font-medium break-words">{v.sellerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Client</dt>
            <dd className="font-medium">{v.clientInitials}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date d&apos;émission</dt>
            <dd className="font-medium">{dateTime(v.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Devise</dt>
            <dd className="font-medium">{v.currencyLabel}</dd>
          </div>
        </dl>

        <ul className="flex flex-col divide-y divide-border border-y border-border text-sm">
          {v.items.map((item, index) => (
            <li key={index} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0 break-words">
                {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{item.total}</span>
            </li>
          ))}
        </ul>
        {v.discount && (
          <p className="flex justify-between gap-3 text-sm">
            <span>Remise</span>
            <span className="tabular-nums">- {v.discount}</span>
          </p>
        )}
        <p className="flex justify-between gap-3 text-base font-semibold">
          <span>Total payé</span>
          <span className="tabular-nums">{v.total}</span>
        </p>
      </section>

      <section aria-labelledby="order-timeline" className="flex flex-col gap-3">
        <h2 id="order-timeline" className="font-semibold">
          Parcours de la commande
        </h2>
        <ol className="flex flex-col">
          {v.timeline.map((step, index) => (
            <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
              {index < v.timeline.length - 1 && (
                <span aria-hidden className="absolute top-6 bottom-0 left-[0.6875rem] w-px bg-border" />
              )}
              {step.signed ? (
                <CheckCircle2
                  className={`relative size-6 shrink-0 ${step.warning ? "text-amber-600" : "text-emerald-600"}`}
                  aria-label="étape signée"
                />
              ) : (
                <CircleDashed className="relative size-6 shrink-0 text-muted-foreground" aria-label="étape non signée" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium break-words ${step.warning ? "text-amber-700 dark:text-amber-400" : ""}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{dateTime(step.at)}</p>
              </div>
            </li>
          ))}
        </ol>
        {v.partialHistory && (
          <p className="text-xs text-muted-foreground">
            Commande antérieure au journal signé de ManuShop : les étapes en pointillés sont
            reconstituées à partir des dates enregistrées.
          </p>
        )}
      </section>
    </div>
  );
}
