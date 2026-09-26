"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CataloguePageContent } from "@/components/storefront/CataloguePageContent";
import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

/**
 * BF-64 (version ciblée, voir journal du 2026-09-25) : URL publique dédiée
 * à UNE boutique précise, par son id Firestore — déjà une chaîne opaque
 * non séquentielle, pas besoin d'un encodage supplémentaire (ownerId+shopId)
 * comme envisagé initialement en 04-besoins-techniques.md §11.3. Distincte
 * de `/catalogue`, laissé mono-tenant tel quel pour l'instant (voir BF-91,
 * `ShareShopLinkButton`, qui pointe ici).
 */
export default function ShopStorefrontPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    shopService.getShop(shopId).then((data) => {
      if (!active) return;
      setShop(data && data.isPublished ? data : null);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  if (shop === undefined) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (shop === null) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
        <p>Boutique introuvable ou non publiée.</p>
        <Link href="/catalogue" className="text-sm text-primary underline">
          Découvrir une boutique
        </Link>
      </div>
    );
  }

  return <CataloguePageContent shopId={shop.id} />;
}
