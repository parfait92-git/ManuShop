"use client";

import { CataloguePageContent } from "@/components/storefront/CataloguePageContent";
import { useShop } from "@/hooks/useShop";

export default function CataloguePage() {
  const { shop, loading } = useShop();

  if (loading) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (!shop) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Boutique introuvable.
      </p>
    );
  }

  return <CataloguePageContent shopId={shop.id} />;
}
