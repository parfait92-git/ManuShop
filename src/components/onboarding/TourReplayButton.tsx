"use client";

import { HelpCircle } from "lucide-react";
import { cn } from "cn";

import { useTour } from "@/components/onboarding/TourProvider";

/** Bouton "Revoir la visite guidée" de l'en-tête — n'apparaît que sur une
 * page qui a une visite (`PageTour`). La visite ne se lance d'elle-même
 * qu'une fois : c'est le seul moyen de la revoir ensuite. */
export function TourReplayButton({ className }: { className?: string }) {
  const { hasTour, replay } = useTour();
  if (!hasTour) return null;

  return (
    <button
      type="button"
      onClick={replay}
      data-tour="tour-replay"
      aria-label="Revoir la visite guidée de cette page"
      title="Revoir la visite guidée"
      className={cn(
        "flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50",
        className
      )}
    >
      <HelpCircle className="size-4" />
    </button>
  );
}
