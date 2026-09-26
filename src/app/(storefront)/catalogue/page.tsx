"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CataloguePageContent } from "@/components/storefront/CataloguePageContent";
import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";
import { useShop } from "@/hooks/useShop";

export default function CataloguePage() {
  const { shop, loading } = useShop();
  const demoAvailable = useDemoCatalogueAvailable();
  const router = useRouter();

  const shopUnusable = !loading && (!shop || !shop.isPublished);
  // Rien de réel à montrer (pas de boutique encore, ou volontairement
  // dépubliée) : plutôt qu'une page vide, on bascule sur le catalogue de
  // démo — mais seulement tant qu'elle a encore lieu d'être (voir
  // `useDemoCatalogueAvailable` : désactivée dès qu'une vraie boutique
  // publiée existe quelque part sur la plateforme, ou coupée à la main par
  // le Super Admin). Sinon, état honnête plutôt qu'une démo qui n'a plus
  // de sens une fois de vraies boutiques en ligne.
  const redirectToDemo = shopUnusable && demoAvailable === true;
  const stillDeciding = shopUnusable && demoAvailable === undefined;

  useEffect(() => {
    if (redirectToDemo) {
      router.replace("/demo-catalogue");
    }
  }, [redirectToDemo, router]);

  if (loading || stillDeciding || redirectToDemo) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (!shop || !shop.isPublished) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Aucune boutique disponible pour le moment.
      </p>
    );
  }

  return <CataloguePageContent shopId={shop.id} />;
}
