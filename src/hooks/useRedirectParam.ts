"use client";

import { useEffect, useState } from "react";

import { getRedirectParam } from "@/lib/redirectParam";

/**
 * Lit `?redirect=` (et `?registered=`) depuis `window.location.search` au
 * montage — même raisonnement que `CataloguePageContent`/`CatalogueExplorer` :
 * `window.location` plutôt que `useSearchParams()` pour éviter la limite
 * Suspense de Next sur ces pages déjà entièrement rendues côté client.
 */
export function useRedirectParam(): {
  redirectTarget: string | null;
  justRegistered: boolean;
} {
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      setRedirectTarget(getRedirectParam(window.location.search));
      setJustRegistered(params.get("registered") === "1");
    });
  }, []);

  return { redirectTarget, justRegistered };
}
