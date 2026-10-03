"use client";

import { useEffect, useState } from "react";

import { usePremiumCatalog } from "@/hooks/usePremiumCatalog";
import { hasPremiumAccess, themeItemKey, type ShopPremiumState } from "@/lib/premiumCatalog";
import { themeService } from "@/services/ThemeService";
import { resolveTheme, THEMES, type ThemeDefinition } from "@/themes/registry";

/**
 * Thème appliqué à une boutique, suivi en direct : un thème appliqué
 * depuis la page Thèmes habille aussitôt la vitrine et l'espace de
 * gestion ouverts. Sans boutique, ou tant qu'il n'est pas lu : le thème
 * par défaut (jamais d'écran sans thème).
 *
 * Thème premium dont la boutique n'a plus l'accès (abonnement expiré ou
 * changé, accès retiré) : retour au thème gratuit par défaut, et
 * `revokedTheme` dit lequel a été retiré (choix de l'utilisateur,
 * 2026-10-03).
 */
export function useShopTheme(shopId: string | undefined): {
  theme: ThemeDefinition;
  loading: boolean;
  revokedTheme: ThemeDefinition | null;
  /** Accès premium de la boutique, suivi en direct (`undefined` tant
   * qu'il n'est pas lu). */
  premiumState: ShopPremiumState | undefined;
} {
  const [state, setState] = useState<{ shopId?: string; themeId?: string }>({});
  const [premium, setPremium] = useState<{ shopId?: string; value?: ShopPremiumState }>({});
  const catalog = usePremiumCatalog();

  useEffect(() => {
    if (!shopId) return;
    const stopTheme = themeService.watchActiveTheme(shopId, (themeId) => setState({ shopId, themeId }));
    const stopPremium = themeService.watchShopPremium(shopId, (value) => setPremium({ shopId, value }));
    return () => {
      stopTheme();
      stopPremium();
    };
  }, [shopId]);

  const current = state.shopId === shopId ? state.themeId : undefined;
  const premiumState = premium.shopId === shopId ? premium.value : undefined;
  const applied = resolveTheme(current);
  // Tant que l'accès n'est pas connu, le thème appliqué est gardé.
  const revoked =
    catalog && premiumState && !hasPremiumAccess(themeItemKey(applied.id), premiumState, catalog);

  return {
    theme: revoked ? THEMES[0] : applied,
    loading: !!shopId && (current === undefined || !catalog || !premiumState),
    revokedTheme: revoked ? applied : null,
    premiumState,
  };
}
