"use client";

import { useEffect } from "react";

/**
 * Reporte le thème de la boutique sur `<html>` (2026-10-03) : fenêtres,
 * menus et bulles des visites guidées sont rendus hors du conteneur
 * thématisé (directement dans `<body>`) et n'en recevraient sinon pas les
 * couleurs. Retiré en quittant la page : le reste de la plateforme garde
 * son apparence.
 */
export function useDocumentShopTheme(siteTheme: string): void {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.shopTheme = siteTheme;
    return () => {
      if (root.dataset.shopTheme === siteTheme) delete root.dataset.shopTheme;
    };
  }, [siteTheme]);
}
