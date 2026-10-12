"use client";

import { useEffect, useState } from "react";

import { quote } from "@/lib/pricing";
import { promotionService } from "@/services/PromotionService";
import { productService } from "@/services/ProductService";
import { lineName } from "@/lib/variants";
import { cartLineKey, useCartStore } from "@/store/cartStore";

/**
 * Le panier est conservé dans le navigateur avec le prix du moment de
 * l'ajout. Relit chaque produit à l'ouverture du panier ou de l'écran de
 * paiement et remet les prix à jour — typiquement à la fin d'une promotion,
 * ou si le commerçant a changé un prix depuis. Le total affiché correspond
 * ainsi à celui que `createOrderAction` facturera (il recalcule lui-même les
 * prix, quoi que le panier envoie), et le message WhatsApp généré depuis le
 * panier annonce le bon prix.
 *
 * Renvoie le nom des articles dont le prix a changé, pour en informer le
 * client plutôt que de modifier son total en silence.
 */
export function useCartPriceSync(): string[] {
  const [changedNames, setChangedNames] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const { items, refreshPrices } = useCartStore.getState();
    if (items.length === 0) return;

    // Campagnes de promotion des boutiques du panier (BF-30), pour le même
    // prix que la vitrine et la commande.
    const shopIds = [...new Set(items.map((item) => item.shopId).filter((id): id is string => !!id))];
    Promise.all([
      Promise.all(items.map((item) => productService.getProduct(item.productId).catch(() => null))),
      Promise.all(shopIds.map((id) => promotionService.listByShop(id).catch(() => []))),
    ]).then(([products, campaignLists]) => {
      const campaignsByShop = new Map(shopIds.map((id, i) => [id, campaignLists[i]]));
      if (!active) return;
      const current: Record<string, { price: number; shopId: string }> = {};
      const changed: string[] = [];
      products.forEach((product, index) => {
        if (!product) return;
        const item = items[index];
        // Une version (BF-17) a son prix propre, sinon celui du produit.
        const variant = item.variantId ? product.variants?.[item.variantId] : undefined;
        if (item.variantId && !variant) return;
        const price = quote(product, variant, campaignsByShop.get(product.shopId) ?? []).price;
        current[cartLineKey(item)] = { price, shopId: product.shopId };
        if (price !== item.price) changed.push(lineName(item.name, item.variantLabel));
      });
      refreshPrices(current);
      setChangedNames(changed);
    });

    return () => {
      active = false;
    };
  }, []);

  return changedNames;
}
