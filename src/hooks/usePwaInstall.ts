"use client";

import { useEffect, useState } from "react";

/** Non standard, pas dans le DOM lib TypeScript — l'API n'est implémentée
 * que par les navigateurs Chromium. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaInstallState =
  | { platform: "none" }
  | { platform: "ios" }
  | { platform: "android"; promptInstall: () => Promise<void> };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Propriété non standard, uniquement Safari iOS.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Détecte la possibilité d'installer la PWA et expose de quoi le proposer.
 * - Android/Chrome (et autres navigateurs Chromium) : capture l'événement
 *   `beforeinstallprompt` natif pour pouvoir le déclencher nous-mêmes depuis
 *   une bannière custom, à n'importe quel moment plutôt que la mini-barre
 *   automatique du navigateur.
 * - iOS Safari : n'expose aucune API d'installation — seule l'indication
 *   manuelle (Partager → Sur l'écran d'accueil) est possible.
 * Ne rend rien (`platform: "none"`) si l'app tourne déjà en mode installé
 * (`display-mode: standalone`, ou `navigator.standalone` sur iOS).
 */
export function usePwaInstall(): PwaInstallState {
  const [state, setState] = useState<PwaInstallState>({ platform: "none" });

  useEffect(() => {
    if (isStandalone()) return;

    if (isIOS()) {
      queueMicrotask(() => setState({ platform: "ios" }));
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      const deferred = event as BeforeInstallPromptEvent;
      setState({
        platform: "android",
        promptInstall: async () => {
          await deferred.prompt();
          // Que l'appel natif soit accepté ou refusé, l'événement est
          // consommé — un nouveau ne sera émis qu'à un futur chargement de
          // page, donc on masque notre bannière dans les deux cas.
          await deferred.userChoice;
          setState({ platform: "none" });
        },
      });
    }

    function handleAppInstalled() {
      setState({ platform: "none" });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return state;
}
