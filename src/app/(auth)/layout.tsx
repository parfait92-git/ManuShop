import { ArrowLeft, Store } from "lucide-react";
import Link from "next/link";

import { TourReplayButton } from "@/components/onboarding/TourReplayButton";
import { PageBackground } from "@/components/sections/PageBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex min-h-svh flex-col overflow-hidden bg-slate-950">
      <PageBackground />

      {/* Petits écrans et police agrandie : la page est en `overflow-hidden`,
      tout ce qui dépasse de cet en-tête serait coupé — logo tronquable,
      « Retour à l'accueil » réduit à sa flèche sous `sm`. */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-4 py-5 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight text-white"
        >
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10"
          >
            <Store className="size-4 text-cyan-300" />
          </span>
          <span className="truncate">
            Manu <span className="text-cyan-300">Shop</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <TourReplayButton className="border-white/15 text-white/70 hover:bg-white/10 hover:text-white" />
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span className="hidden sm:inline">Retour à l&apos;accueil</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  );
}
