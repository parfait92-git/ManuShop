"use client";

import { useSyncExternalStore } from "react";

/**
 * `true`/`false` selon la requête média, suivie en direct (rotation d'une
 * tablette, fenêtre redimensionnée). `undefined` tant qu'elle n'est pas
 * connue (rendu serveur, première hydratation) : l'appelant affiche alors
 * un état neutre plutôt que de deviner — et ne charge rien d'inutile.
 */
export function useMediaQuery(query: string): boolean | undefined {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => undefined
  );
}

/** Tablette et ordinateur : à partir de 768 px (`md` de Tailwind). */
export const TABLET_UP = "(min-width: 768px)";
