"use client";

import { EVENTS, Joyride, STATUS, type EventData, type Step } from "react-joyride";

export type { Step as GuidedTourStep };

const PRIMARY_COLOR = "#0891b2"; // cyan-600 — cohérent avec le reste du dashboard

/**
 * BF-135 : moteur réutilisable de "product tour" (séquence de bulles
 * "Suivant"/"Précédent" + spotlight), construit sur `react-joyride`
 * (SSR-safe nativement — pas besoin d'un import dynamique `ssr: false`).
 * Ne gère jamais lui-même la persistance "déjà vu" : l'appelant décide de
 * `run` (typiquement `!profile.seenTours?.includes(tourId)`) et réagit à
 * `onFinish` pour appeler `authService.markTourSeen`. Réutilisé tel quel par
 * BF-134 (onboarding par page) : un onboarding n'est qu'un tour auto-lancé
 * une seule fois par compte.
 */
export function GuidedTour({
  run,
  steps,
  onFinish,
}: {
  run: boolean;
  steps: Step[];
  onFinish: () => void;
}) {
  function handleEvent(data: EventData) {
    if (
      data.type === EVENTS.TOUR_END &&
      (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED)
    ) {
      onFinish();
    }
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      onEvent={handleEvent}
      locale={{
        back: "Précédent",
        close: "Fermer",
        last: "Terminer",
        next: "Suivant",
        nextWithProgress: "Suivant ({current}/{total})",
        open: "Ouvrir la visite",
        skip: "Passer",
      }}
      options={{
        primaryColor: PRIMARY_COLOR,
        zIndex: 10000,
        showProgress: true,
        // Contenu affiché immédiatement plutôt que derrière un balise
        // pulsante à cliquer d'abord — le tour est déjà lancé
        // automatiquement (onboarding), un clic supplémentaire serait de
        // trop.
        skipBeacon: true,
        // Marge au défilement vers une cible : la vitrine a un en-tête
        // collant (~60px) qui recouvrait la cible avec la marge par défaut
        // (20px) — la bulle pointait alors vers un élément caché.
        scrollOffset: 100,
        // 380px par défaut : plus large qu'un petit téléphone (320px). La
        // bulle prend toute la largeur disponible, marges comprises.
        width: "min(380px, calc(100vw - 24px))",
        buttons: ["back", "close", "primary", "skip"],
      }}
    />
  );
}
