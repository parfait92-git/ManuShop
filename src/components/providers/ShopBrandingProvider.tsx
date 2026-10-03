"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface ShopBranding {
  shopId: string;
  name: string;
  logo?: string;
  /** BF-106 : liens renseignés pour un réseau donné, uniquement si le
   * privilège premium `socialFooterLinks` est accessible à la boutique —
   * `undefined`/absent sinon. Consommé par `StorefrontFooter`. */
  socialLinks?: Partial<Record<"whatsapp" | "facebook" | "instagram" | "tiktok", string>>;
}

interface ShopBrandingContextValue {
  branding: ShopBranding | null;
  setBranding: (branding: ShopBranding | null) => void;
}

const ShopBrandingContext = createContext<ShopBrandingContextValue | undefined>(
  undefined
);

/** Boutique visitée, gardée le temps de la session du navigateur. */
const STORAGE_KEY = "manushop:current-shop";

function readStored(): ShopBranding | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as ShopBranding) : null;
    return value && typeof value.shopId === "string" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Boutique dont on parcourt le site (en-tête, pied de page, thème) — les
 * pages de la vitrine sont des descendantes de la mise en page qui
 * l'affiche, d'où un contexte.
 *
 * Elle est **gardée** d'une page à l'autre (2026-10-03, signalé par
 * l'utilisateur) : la fiche d'un article, le panier, le paiement, « Mes
 * commandes » restent aux couleurs de la boutique visitée. Seules les
 * pages de la plateforme (Marché, annuaire) reviennent à ManuShop
 * (`useClearShopBranding`). Mémorisée pour la session : un rechargement
 * de page la conserve.
 */
export function ShopBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setState] = useState<ShopBranding | null>(null);

  // Après le premier rendu (le serveur ne connaît pas la session).
  useEffect(() => {
    const stored = readStored();
    if (stored) queueMicrotask(() => setState((current) => current ?? stored));
  }, []);

  const setBranding = useCallback((value: ShopBranding | null) => {
    setState(value);
    try {
      if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Stockage indisponible (navigation privée) : la boutique reste
      // connue pour cette page seulement.
    }
  }, []);

  return (
    <ShopBrandingContext.Provider value={{ branding, setBranding }}>
      {children}
    </ShopBrandingContext.Provider>
  );
}

export function useShopBranding(): ShopBrandingContextValue {
  const context = useContext(ShopBrandingContext);
  if (!context) {
    throw new Error(
      "useShopBranding doit être utilisé à l'intérieur d'un ShopBrandingProvider."
    );
  }
  return context;
}

/** Pages de la plateforme (Marché, annuaire des boutiques) : on quitte le
 * site d'une boutique, retour à l'apparence ManuShop. */
export function useClearShopBranding(): void {
  const { setBranding } = useShopBranding();
  useEffect(() => {
    setBranding(null);
  }, [setBranding]);
}
