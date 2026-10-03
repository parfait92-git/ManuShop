"use client";

import { useEffect, useState } from "react";

import { themeService } from "@/services/ThemeService";
import { resolveTheme, type ThemeDefinition } from "@/themes/registry";

/**
 * Thème appliqué à une boutique, suivi en direct : un thème appliqué
 * depuis la page Thèmes habille aussitôt la vitrine et l'espace de
 * gestion ouverts. Sans boutique, ou tant qu'il n'est pas lu : le thème
 * par défaut (jamais d'écran sans thème).
 */
export function useShopTheme(shopId: string | undefined): {
  theme: ThemeDefinition;
  loading: boolean;
} {
  const [state, setState] = useState<{ shopId?: string; themeId?: string }>({});

  useEffect(() => {
    if (!shopId) return;
    return themeService.watchActiveTheme(shopId, (themeId) => setState({ shopId, themeId }));
  }, [shopId]);

  const current = state.shopId === shopId ? state.themeId : undefined;
  return { theme: resolveTheme(current), loading: !!shopId && current === undefined };
}
