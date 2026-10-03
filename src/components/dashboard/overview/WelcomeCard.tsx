import { ArrowRight, ClipboardList, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { isOptimizableImage } from "@/lib/imageHosts";
import { shopPath } from "@/lib/seo";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Bannière d'accueil : gérant, boutique, date, lien vers la vitrine. */
export function WelcomeCard({
  firstName,
  shopId,
  shopName,
  shopLogo,
  toProcess,
}: {
  firstName: string;
  shopId: string;
  shopName: string | null;
  shopLogo?: string;
  /** Commandes reçues, prêtes ou en livraison : à faire avancer. */
  toProcess: number;
}) {
  const today = capitalize(
    new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );

  return (
    <section
      aria-label="Bienvenue"
      className="relative flex min-h-56 min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-dash border border-dash-border p-6 text-dash-welcome-text shadow-dash bg-[linear-gradient(135deg,var(--dashboard-welcome-gradient-start),var(--dashboard-welcome-gradient-end))] lg:p-8"
    >
      {/* Halo décoratif, couleur d'accent du thème. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full opacity-60 blur-3xl bg-[radial-gradient(circle,var(--dashboard-bg-glow),transparent_70%)]"
      />
      <div className="relative min-w-0">
        <p className="text-sm text-dash-welcome-muted">{today}</p>
        <h1 className="mt-2 text-2xl font-bold break-words lg:text-3xl">
          Bonjour{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 max-w-md text-sm text-dash-welcome-muted">
          {shopName ? (
            <>
              Voici l&apos;activité de <strong className="font-semibold">{shopName}</strong>{" "}
              aujourd&apos;hui.
            </>
          ) : (
            "Voici l'activité de votre boutique aujourd'hui."
          )}
        </p>
      </div>
      <Link
        href="/dashboard/orders"
        className="relative flex w-fit items-center gap-3 rounded-2xl border border-dash-welcome-text/25 px-4 py-3 hover:bg-dash-welcome-text/10 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
      >
        <ClipboardList className="size-6 shrink-0" aria-hidden />
        <span className="min-w-0">
          <span className="block text-2xl leading-none font-bold tabular-nums">{toProcess}</span>
          <span className="text-sm text-dash-welcome-muted">
            {toProcess === 0
              ? "Aucune commande à traiter"
              : `commande${toProcess > 1 ? "s" : ""} à traiter`}
          </span>
        </span>
      </Link>
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <Link
          href={shopPath(shopId)}
          data-tour="view-shop"
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
        >
          Voir ma boutique
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {shopLogo ? (
          <Image
            src={shopLogo}
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-2xl border border-dash-welcome-text/25 object-cover"
            unoptimized={!isOptimizableImage(shopLogo)}
          />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-2xl border border-dash-welcome-text/25">
            <Store className="size-7" aria-hidden />
          </span>
        )}
      </div>
    </section>
  );
}
