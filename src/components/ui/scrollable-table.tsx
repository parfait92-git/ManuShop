"use client";

import { ChevronsRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

/**
 * Conteneur de tableau de données, défilable horizontalement quand l'écran
 * est trop étroit pour toutes ses colonnes : petit téléphone, ou police
 * système agrandie (les largeurs sont en `rem`, elles grandissent avec
 * elle). Plutôt que d'écraser les colonnes ou de faire déborder la page :
 *
 * - la première colonne (produit, client...) reste fixe à gauche, pour
 *   garder le contexte de chaque ligne pendant le défilement ;
 * - une ombre sur chaque bord signale qu'il reste du contenu caché de ce
 *   côté, et une ligne d'aide l'explique tant que la fin n'est pas atteinte ;
 * - la zone est nommée (`role="region"` + `aria-label`) et atteignable au
 *   clavier (flèches gauche/droite) quand elle déborde (WCAG 2.1.1).
 *
 * Le tableau enfant fixe sa largeur minimale (`min-w-*`), et ses cellules
 * courtes (prix, date, statut, actions) restent sur une ligne
 * (`whitespace-nowrap`).
 */
/**
 * À poser sur le contenu de la première colonne (dans la cellule, pas sur
 * la cellule elle-même) : sur mobile, elle reste fixe à gauche, et doit
 * donc rester étroite (40 % de l'écran, quelle que soit la police) pour
 * laisser de la place aux colonnes qui défilent. La largeur est portée par
 * le contenu car un tableau en mise en page automatique ignore `max-width`
 * sur une cellule et n'y respecte pas `width` comme minimum. Les mots
 * longs sont coupés avec césure (`lang="fr"`), sinon n'importe où.
 *
 * À partir de la tablette (2026-10-04), la colonne n'est plus fixe : la
 * coupure « n'importe où » y laissait le navigateur réduire la colonne à
 * une lettre de large pour faire de la place aux autres (« Christe lle
 * Ngo »). Elle garde une largeur minimale et ne coupe un mot qu'en
 * dernier recours.
 */
export const STICKY_COLUMN_CONTENT =
  "w-[calc(40vw-1.5rem)] hyphens-auto [overflow-wrap:anywhere] sm:w-auto sm:min-w-40 sm:[overflow-wrap:break-word]";

export function ScrollableTable({
  label,
  className,
  hintClassName,
  children,
}: {
  /** Nom de la zone pour les lecteurs d'écran, ex. "Liste des produits". */
  label: string;
  className?: string;
  /** Ajustement de la ligne d'aide (ex. marge haute dans une carte sans
   * rembourrage). */
  hintClassName?: string;
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const start = scroller.scrollLeft > 1;
      const end = scroller.scrollLeft < maxScroll - 1;
      setEdges((current) =>
        current.start === start && current.end === end ? current : { start, end }
      );
    };

    // Mesure initiale différée : la règle `react-hooks/set-state-in-effect`
    // interdit un `setState` synchrone dans le corps de l'effet.
    queueMicrotask(update);
    scroller.addEventListener("scroll", update, { passive: true });
    // Rotation de l'écran, police modifiée, lignes ajoutées ou retirées.
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(scroller);
    if (scroller.firstElementChild) {
      resizeObserver?.observe(scroller.firstElementChild);
    }

    return () => {
      scroller.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
    };
  }, []);

  const overflowing = edges.start || edges.end;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {overflowing && (
        <p
          className={cn(
            "flex items-center gap-1.5 px-4 text-xs text-slate-500 sm:px-6",
            hintClassName
          )}
        >
          <ChevronsRight aria-hidden className="size-3.5 shrink-0" />
          Faites glisser le tableau pour voir toutes les colonnes.
        </p>
      )}
      <div className="relative">
        <div
          ref={scrollerRef}
          role="region"
          aria-label={label}
          tabIndex={overflowing ? 0 : undefined}
          data-scrolled={edges.start || undefined}
          className={cn(
            "overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 focus-visible:ring-inset",
            // Première colonne fixe, sur fond opaque pour masquer ce qui
            // défile dessous, avec une ombre dès que le tableau a défilé.
            "[&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-10 [&_tr>*:first-child]:bg-shell-surface",
            "data-scrolled:[&_tr>*:first-child]:shadow-[6px_0_8px_-6px_rgb(15_23_42/0.25)]"
          )}
        >
          {children}
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-shell-text/10 to-transparent transition-opacity",
            edges.end ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  );
}
