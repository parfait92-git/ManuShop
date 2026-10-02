"use client";

import { HelpCircle } from "lucide-react";
import { cn } from "cn";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * BF-136 : bouton "?" qui révèle une bulle d'aide — au survol sur ordinateur,
 * au toucher sur mobile (où le survol n'existe pas), et au clavier (focus
 * puis Entrée/Espace). Sert à expliquer le rôle et l'utilité d'un champ
 * (voir `Label`, prop `help`) ou d'une fonctionnalité peu évidente. Les
 * visites guidées (BF-135) restent réservées aux séquences : ici, un point
 * d'aide isolé, consultable à tout moment.
 */
export function CoachMark({
  label = "Aide",
  className,
  children,
}: {
  /** `aria-label` du bouton — décrit ce sur quoi porte l'aide, ex.
   * "Aide : Prix (FCFA)". */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={100}
        type="button"
        aria-label={label}
        // Zone de toucher de 24 × 24 px au minimum (WCAG 2.5.8) autour
        // d'une icône de 14 px, sans décaler la mise en page (marge
        // négative compensée).
        className={cn(
          "-m-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:outline-none",
          className
        )}
      >
        <HelpCircle aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] leading-relaxed">
        {children}
      </PopoverContent>
    </Popover>
  );
}
