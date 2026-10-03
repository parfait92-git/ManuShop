import type { Metadata } from "next";

import { DIRECTORY_DESCRIPTION, DIRECTORY_TITLE, MARKET_KEYWORDS } from "@/lib/platformSeo";

/** Métadonnées de l'annuaire des boutiques (page côté navigateur). */
export const metadata: Metadata = {
  title: DIRECTORY_TITLE,
  description: DIRECTORY_DESCRIPTION,
  keywords: MARKET_KEYWORDS,
  alternates: { canonical: "/boutiques" },
};

export default function ShopsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
