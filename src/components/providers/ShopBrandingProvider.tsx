"use client";

import { createContext, useContext, useState } from "react";

export interface ShopBranding {
  shopId: string;
  name: string;
  logo?: string;
}

interface ShopBrandingContextValue {
  branding: ShopBranding | null;
  setBranding: (branding: ShopBranding | null) => void;
}

const ShopBrandingContext = createContext<ShopBrandingContextValue | undefined>(
  undefined
);

/**
 * Permet à une page storefront profonde (ex. `/boutique/[shopId]`) de
 * personnaliser la marque affichée par `StorefrontHeader` — rendu par le
 * layout partagé, donc un ancêtre de la page, pas un parent direct qui
 * pourrait recevoir une prop normalement. Un contexte est le seul moyen
 * propre de faire remonter cette info sans restructurer le layout.
 */
export function ShopBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState<ShopBranding | null>(null);

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
