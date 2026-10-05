"use client";

import { PageTour } from "@/components/onboarding/PageTour";
import { TourReplayButton } from "@/components/onboarding/TourReplayButton";
import type { TourId } from "@/components/onboarding/tours";

/**
 * BF-134/135 : visite guidée d'une fenêtre ou d'un formulaire en
 * surimpression (`Dialog`), à monter à l'intérieur de celle-ci. Même
 * fonctionnement que `PageTour` (lancement automatique la première fois,
 * puis "déjà vue"), avec son propre bouton "?" : celui de l'en-tête de la
 * page est caché derrière le voile de la fenêtre. À placer dans l'en-tête
 * de la fenêtre, à côté du titre.
 */
export function DialogTour({
  tourId,
  className,
  autoStart = true,
}: {
  tourId: TourId;
  className?: string;
  /** Voir `PageTour`. */
  autoStart?: boolean;
}) {
  return (
    <>
      <PageTour tourId={tourId} replayHint={false} autoStart={autoStart} />
      <TourReplayButton className={className ?? "size-8 shrink-0"} />
    </>
  );
}
