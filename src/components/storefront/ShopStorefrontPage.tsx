"use client";

import { usePremiumAccess } from "@/hooks/usePremiumCatalog";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { CataloguePageContent } from "@/components/storefront/CataloguePageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { SOCIAL_NETWORK_URL_FIELD } from "@/lib/shopSocialNetworks";
import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

/** BF-106 : un réseau n'apparaît dans `socialLinks` que si son lien est
 * renseigné ET que la boutique a le privilège premium `socialFooterLinks` —
 * `undefined` sinon, pour que `StorefrontFooter` n'affiche rien du tout. */
function socialLinksFor(shop: Shop, allowed: boolean) {
  if (!allowed) return undefined;
  const entries = Object.entries(SOCIAL_NETWORK_URL_FIELD)
    .map(([network, field]) => [network, shop[field]] as const)
    .filter(([, url]) => !!url && url.trim());
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Partie interactive de la vitrine d'une boutique — la page
 * (`app/(storefront)/boutique/[shopId]/page.tsx`) est un composant serveur
 * qui ajoute métadonnées et données structurées pour le référencement.
 *
 * BF-64 (version ciblée, voir journal du 2026-09-25) : URL publique dédiée
 * à UNE boutique précise, par son id Firestore — déjà une chaîne opaque
 * non séquentielle, pas besoin d'un encodage supplémentaire (ownerId+shopId)
 * comme envisagé initialement en 04-besoins-techniques.md §11.3. Distincte
 * de `/catalogue`, laissé mono-tenant tel quel pour l'instant (voir BF-91,
 * `ShareShopLinkButton`, qui pointe ici).
 */
export function ShopStorefrontPage({ shopId }: { shopId: string }) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const { setBranding } = useShopBranding();
  // Privilège possédé, ou inclus dans l'abonnement de la boutique.
  const hasAccess = usePremiumAccess(shop);
  const socialAllowed = hasAccess("socialFooterLinks");

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

  // Affiché par `StorefrontHeader` (logo/nom de LA boutique plutôt que la
  // marque générique ManuShop). Gardée en quittant la page : la fiche d'un
  // article, le panier ou le paiement restent aux couleurs de la boutique
  // (seules les pages du Marché la retirent, `useClearShopBranding`).
  useEffect(() => {
    if (shop) {
      setBranding({
        shopId: shop.id,
        name: shop.name,
        logo: shop.logo,
        socialLinks: socialLinksFor(shop, socialAllowed),
      });
    }
  }, [shop, socialAllowed, setBranding]);

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

  return (
    <>
      <PageTour tourId="storefront-shop" />
      <CataloguePageContent shopId={shop.id} />
    </>
  );
}
