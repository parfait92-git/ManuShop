"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CataloguePageContent } from "@/components/storefront/CataloguePageContent";
import { useShop } from "@/hooks/useShop";

export default function CataloguePage() {
  const { shop, loading } = useShop();
  const router = useRouter();

  // Rien de réel à montrer (pas de boutique encore, ou volontairement
  // dépubliée) : plutôt qu'une page vide, on bascule sur le catalogue de
  // démo (voir aussi CataloguePageContent, qui redirige de la même façon
  // si la boutique existe mais n'a encore aucun produit).
  const redirectToDemo = !loading && (!shop || !shop.isPublished);

  useEffect(() => {
    if (redirectToDemo) {
      router.replace("/demo-catalogue");
    }
  }, [redirectToDemo, router]);

  if (loading || redirectToDemo || !shop) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  return <CataloguePageContent shopId={shop.id} />;
}
