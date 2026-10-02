"use client";

import { useCallback, useEffect, useState } from "react";
import type { Step } from "react-joyride";

import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { useTour } from "@/components/onboarding/TourProvider";
import {
  REPLAY_HINT_STEP,
  TOURS,
  type TourId,
  type TourStepDefinition,
} from "@/components/onboarding/tours";
import { useAuth } from "@/components/providers/AuthProvider";
import { guestSeenTours, markGuestTourSeen } from "@/lib/guestSeenTours";
import type { User } from "@/models/user/User";
import { authService } from "@/services/AuthService";

/** Délai maximal d'attente des éléments ciblés : la plupart des pages
 * affichent d'abord "Chargement..." le temps de lire Firestore. */
const TARGETS_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 150;

function selectorOf(definition: TourStepDefinition): string {
  return `[data-tour="${definition.target}"]`;
}

/** `checkVisibility` écarte un élément présent mais masqué (sidebar du
 * dashboard en `display: none` sur mobile, par exemple). Absent sous jsdom
 * et sur les navigateurs anciens : on considère alors l'élément visible,
 * `react-joyride` sautant de toute façon une cible introuvable. */
function isVisible(element: Element): boolean {
  return typeof element.checkVisibility === "function"
    ? element.checkVisibility()
    : true;
}

function isPresent(definition: TourStepDefinition): boolean {
  if (definition.target === "center") return true;
  const element = document.querySelector(selectorOf(definition));
  return element !== null && isVisible(element);
}

/** N'ajoute `placement`/`title` que s'ils sont renseignés : `react-joyride`
 * fusionne l'étape par-dessus ses valeurs par défaut, et une clé présente
 * mais `undefined` écrase le placement par défaut ("bottom") — la bulle
 * plante alors au positionnement (`placement.startsWith`). */
function toStep({ target, content, title, placement }: TourStepDefinition): Step {
  const isCenter = target === "center";
  const finalPlacement = isCenter ? "center" : placement;
  return {
    target: isCenter ? "body" : selectorOf({ target, content }),
    content,
    ...(title ? { title } : {}),
    ...(finalPlacement ? { placement: finalPlacement } : {}),
  };
}

/** Attend que toutes les cibles soient affichées (ou le délai écoulé), puis
 * ne garde que les étapes dont la cible existe vraiment. Filtrer avant le
 * lancement plutôt que laisser `react-joyride` sauter les cibles absentes :
 * sinon son compteur "Suivant (3/7)" compterait des étapes jamais montrées
 * (liste vide, élément réservé à un autre rôle, vue mobile...). */
function resolveSteps(
  definitions: TourStepDefinition[],
  signal: { cancelled: boolean }
): Promise<Step[]> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const check = () => {
      if (signal.cancelled) return resolve([]);
      const allPresent = definitions.every(isPresent);
      if (allPresent || Date.now() - startedAt >= TARGETS_TIMEOUT_MS) {
        const present = definitions.filter(isPresent);
        // Rien à montrer en dehors d'une bulle d'accueil centrée : pas de
        // visite (page vide, données pas encore là).
        const hasRealTarget = present.some((d) => d.target !== "center");
        return resolve(hasRealTarget ? present.map(toStep) : []);
      }
      setTimeout(check, POLL_INTERVAL_MS);
    };
    check();
  });
}

function definitionsFor(
  tourId: TourId,
  role: User["role"] | undefined,
  isFirstTour: boolean
): TourStepDefinition[] {
  const all: readonly TourStepDefinition[] = TOURS[tourId];
  const steps = all.filter(
    (step) => !step.roles || (role !== undefined && step.roles.includes(role))
  );
  return isFirstTour ? [...steps, REPLAY_HINT_STEP] : steps;
}

/**
 * BF-134 : visite guidée d'une page, lancée automatiquement à la première
 * visite puis rejouable via `TourReplayButton`. "Déjà vue" mémorisé sur le
 * compte (`User.seenTours`) quand on est connecté, sinon dans le navigateur
 * (`guestSeenTours`, vitrine et pages d'auth ouvertes sans compte). Les
 * étapes de chaque page sont dans `tours.ts`, les cibles sont des
 * attributs `data-tour` posés sur les éléments de la page.
 */
export function PageTour({ tourId }: { tourId: TourId }) {
  const { profile, loading, refreshProfile } = useAuth();
  const { register } = useTour();
  const [steps, setSteps] = useState<Step[]>([]);
  const [run, setRun] = useState(false);
  // Remonte `GuidedTour` à chaque lancement : `react-joyride` ne repart
  // pas de la première étape sur un simple retour de `run` à `true`.
  const [runKey, setRunKey] = useState(0);

  const role = profile?.role;
  const seenTours = profile ? (profile.seenTours ?? []) : guestSeenTours();
  const seen = seenTours.includes(tourId);
  // Toute première visite de ce compte/navigateur : elle se termine en
  // montrant où la relancer.
  const isFirstTour = seenTours.length === 0;

  const launch = useCallback(
    (signal: { cancelled: boolean }) =>
      resolveSteps(definitionsFor(tourId, role, isFirstTour), signal).then((resolved) => {
        if (signal.cancelled || resolved.length === 0) return;
        setSteps(resolved);
        setRunKey((key) => key + 1);
        setRun(true);
      }),
    [tourId, role, isFirstTour]
  );

  // Lancement automatique, une seule fois par compte (ou navigateur).
  useEffect(() => {
    if (loading || seen) return;
    const signal = { cancelled: false };
    launch(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loading, seen, launch]);

  // Relance à la demande depuis l'en-tête, même déjà vue.
  useEffect(() => register(() => void launch({ cancelled: false })), [register, launch]);

  async function handleFinish() {
    setRun(false);
    if (profile) {
      if (seen) return;
      await authService.markTourSeen(profile.id, tourId);
      await refreshProfile();
    } else {
      markGuestTourSeen(tourId);
    }
  }

  if (!run) return null;
  return <GuidedTour key={runKey} run steps={steps} onFinish={handleFinish} />;
}
