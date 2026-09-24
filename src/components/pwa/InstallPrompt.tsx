"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  dismissInstallPromptForSession,
  isInstallPromptDismissed,
} from "@/lib/pwaInstallDismissal";

/** Bannière d'installation PWA, montée globalement (`app/layout.tsx`) donc
 * visible sur tout le site. Fermable pour l'onglet en cours seulement — elle
 * revient à la prochaine visite tant que l'app n'est pas installée. */
export function InstallPrompt() {
  const pwaInstall = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setDismissed(isInstallPromptDismissed()));
  }, []);

  if (dismissed || pwaInstall.platform === "none") return null;

  function dismiss() {
    dismissInstallPromptForSession();
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Installer l'application"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-border bg-background p-4 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Installer ManuShop</p>
          <p className="text-xs text-muted-foreground">
            {pwaInstall.platform === "ios"
              ? "Appuyez sur Partager puis « Sur l’écran d’accueil »."
              : "Ajoutez ManuShop à votre écran d’accueil pour un accès rapide."}
          </p>
        </div>
        {pwaInstall.platform === "android" && (
          <Button size="sm" onClick={() => void pwaInstall.promptInstall()}>
            Installer
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fermer"
          onClick={dismiss}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
