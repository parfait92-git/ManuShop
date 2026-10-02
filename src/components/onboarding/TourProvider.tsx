"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface TourContextValue {
  /** Vrai quand la page affichée a une visite guidée (`PageTour` monté). */
  hasTour: boolean;
  /** Relance la visite de la page affichée, même déjà vue. */
  replay: () => void;
  /** Réservé à `PageTour` : déclare la visite de la page, renvoie le
   * désenregistrement à appeler au démontage. */
  register: (start: () => void) => () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/**
 * BF-134/135 : relie la visite de la page affichée (`PageTour`, monté dans
 * la page) au bouton "Revoir la visite" (`TourReplayButton`, monté dans
 * l'en-tête de chaque espace) — deux arbres de composants qui ne se
 * connaissent pas, d'où ce contexte global.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const startRef = useRef<(() => void) | null>(null);
  const [hasTour, setHasTour] = useState(false);

  const register = useCallback((start: () => void) => {
    startRef.current = start;
    setHasTour(true);
    return () => {
      if (startRef.current === start) {
        startRef.current = null;
        setHasTour(false);
      }
    };
  }, []);

  const replay = useCallback(() => startRef.current?.(), []);

  const value = useMemo(() => ({ hasTour, replay, register }), [hasTour, replay, register]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/** Hors `TourProvider` (tests de composants isolés) : aucune visite. */
const NO_TOUR: TourContextValue = {
  hasTour: false,
  replay: () => {},
  register: () => () => {},
};

export function useTour(): TourContextValue {
  return useContext(TourContext) ?? NO_TOUR;
}
