import type { Metadata } from "next";

import { MARKET_DESCRIPTION, MARKET_KEYWORDS, MARKET_TITLE } from "@/lib/platformSeo";

/** Métadonnées du Marché (`/catalogue`, page côté navigateur qui ne peut
 * pas les déclarer elle-même). Les fiches d'article, sous ce segment, ont
 * les leurs (`[productId]/page.tsx`), au nom de leur boutique. */
export const metadata: Metadata = {
  // Un titre simple ici interromprait le modèle « … | ManuShop » de la
  // mise en page racine pour les pages en dessous : on le redéclare (le
  // modèle racine ajoute déjà « | ManuShop » au titre par défaut).
  title: { default: MARKET_TITLE, template: "%s | ManuShop" },
  description: MARKET_DESCRIPTION,
  keywords: MARKET_KEYWORDS,
  alternates: { canonical: "/catalogue" },
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
