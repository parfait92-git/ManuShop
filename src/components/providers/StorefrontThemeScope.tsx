"use client";

import { useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { useDocumentShopTheme } from "@/hooks/useDocumentShopTheme";
import { useShopTheme } from "@/hooks/useShopTheme";

/**
 * Habille la vitrine avec le thème de la boutique affichée (2026-10-03) :
 * `data-shop-theme` sur le conteneur de la vitrine, dès qu'une page de
 * boutique s'est fait connaître (`ShopBrandingProvider`). Pages de la
 * plateforme (Marché, accueil) : thème par défaut.
 */
export function StorefrontThemeScope({ children }: { children: React.ReactNode }) {
  const { branding } = useShopBranding();
  const { theme } = useShopTheme(branding?.shopId);
  useDocumentShopTheme(theme.siteTheme);
  return (
    // Fond et texte repris des variables du thème : un thème qui change
    // `--background` habille ainsi toute la vitrine.
    <div data-shop-theme={theme.siteTheme} className="flex min-h-svh flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
