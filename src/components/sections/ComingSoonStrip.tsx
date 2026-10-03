import { cn } from "cn";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { COMING_SOON, COMING_SOON_ICON as Icon } from "@/components/sections/landingContent";

/**
 * Fonctions prévues mais pas encore disponibles, annoncées comme telles
 * sous les cartes de l'accueil : la feuille de route reste visible (et ses
 * mots clés aussi), sans laisser croire qu'elles existent déjà.
 */
export function ComingSoonStrip({ className }: { className?: string }) {
  return (
    <ScrollReveal className={cn("w-full", className)}>
      <section
        aria-labelledby="bientot-titre"
        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-white sm:flex-row sm:items-center sm:gap-5"
      >
        <h2
          id="bientot-titre"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-wide text-cyan-300 uppercase"
        >
          <Icon aria-hidden className="size-4" />
          Bientôt sur ManuShop
        </h2>
        <ul className="flex flex-wrap gap-2">
          {COMING_SOON.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-white/15 px-3 py-1 text-sm text-white/75"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </ScrollReveal>
  );
}
