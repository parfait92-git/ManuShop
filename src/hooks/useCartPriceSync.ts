"use client";

import { useEffect, useState } from "react";

import { effectivePrice } from "@/lib/promo";
import { productService } from "@/services/ProductService";
import { useCartStore } from "@/store/cartStore";

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

    Promise.all(
      items.map((item) =>
        productService.getProduct(item.productId).catch(() => null)
      )
    ).then((products) => {
      if (!active) return;
      const current: Record<string, { price: number; shopId: string }> = {};
      const changed: string[] = [];
      products.forEach((product, index) => {
        if (!product) return;
        const price = effectivePrice(product);
        current[product.id] = { price, shopId: product.shopId };
        if (price !== items[index].price) changed.push(items[index].name);
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
