const DISMISSED_KEY = "manushop:install-prompt-dismissed";

/** `sessionStorage` (pas `localStorage`) : fermer la bannière ne la masque
 * que pour l'onglet en cours — elle réapparaît à la prochaine visite tant
 * que l'app n'est pas installée. Peut être indisponible (navigation
 * privée) : on échoue silencieusement, comme `productDraft.ts`. */
export function isInstallPromptDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPromptForSession(): void {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Ignoré : la fermeture est un confort, pas une garantie.
  }
}
