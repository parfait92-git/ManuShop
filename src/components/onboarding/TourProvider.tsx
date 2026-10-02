"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

interface TourContextValue {
  /** Vrai quand l'écran affiché a une visite guidée (`PageTour` monté). */
  hasTour: boolean;
  /** Relance la visite de l'écran au premier plan, même déjà vue. */
  replay: () => void;
  /** Réservé à `PageTour` : déclare une visite, renvoie le
   * désenregistrement à appeler au démontage. La dernière déclarée passe
   * au premier plan — celle d'une fenêtre ouverte par-dessus la page. */
  register: (start: () => void) => () => void;
  /** Vrai pendant qu'une visite est affichée. Lu par `Dialog` : une
   * fenêtre ne doit ni se fermer ni bloquer les clics sur la bulle de
   * visite (rendue hors de la fenêtre) pendant ce temps. */
  isRunning: boolean;
  /** Réservé à `PageTour` : signale une visite affichée, renvoie la fin. */
  markRunning: () => () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/**
 * BF-134/135 : relie les visites (`PageTour`, montées dans les pages et les
 * fenêtres) au bouton "Revoir la visite" (`TourReplayButton`) et aux
 * fenêtres (`Dialog`) — des arbres de composants qui ne se connaissent pas,
 * d'où ce contexte global.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  // Pile : la page enregistre sa visite, une fenêtre ouverte par-dessus
  // enregistre la sienne au-dessus, et la page reprend la main à sa
  // fermeture.
  const stackRef = useRef<(() => void)[]>([]);
  const [hasTour, setHasTour] = useState(false);
  const [runningCount, setRunningCount] = useState(0);

  const register = useCallback((start: () => void) => {
    // Enveloppe propre à cet enregistrement : deux enregistrements de la
    // même fonction restent distincts dans la pile.
    const entry = () => start();
    stackRef.current = [...stackRef.current, entry];
    setHasTour(true);
    return () => {
      stackRef.current = stackRef.current.filter((item) => item !== entry);
      setHasTour(stackRef.current.length > 0);
    };
  }, []);

  const replay = useCallback(() => stackRef.current.at(-1)?.(), []);

  const markRunning = useCallback(() => {
    setRunningCount((count) => count + 1);
    return () => setRunningCount((count) => count - 1);
  }, []);

  const value = useMemo(
    () => ({
      hasTour,
      replay,
      register,
      isRunning: runningCount > 0,
      markRunning,
    }),
    [hasTour, replay, register, runningCount, markRunning]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/** Hors `TourProvider` (tests de composants isolés) : aucune visite. */
const NO_TOUR: TourContextValue = {
  hasTour: false,
  replay: () => {},
  register: () => () => {},
  isRunning: false,
  markRunning: () => () => {},
};

export function useTour(): TourContextValue {
  return useContext(TourContext) ?? NO_TOUR;
}
