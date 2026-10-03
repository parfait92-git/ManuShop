"use client";

import { useCallback } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cartShopId, useCartStore, type CartItem } from "@/store/cartStore";

/**
 * Ajout au panier, limité à une boutique : une commande est passée à une
 * seule boutique (`createOrderAction` le revérifie). Ajouter un article
 * d'une autre boutique propose de vider le panier plutôt que de mélanger —
 * avant, le panier envoyait tout à la première boutique de la plateforme,
 * quelle que soit la boutique des articles.
 *
 * Renvoie `false` si le client refuse de vider son panier.
 */
export function useAddToCart(): (item: Omit<CartItem, "quantity">, quantity?: number) => boolean {
  const addItem = useCartStore((state) => state.addItem);
  const clear = useCartStore((state) => state.clear);
  const { t } = useI18n();

  return useCallback(
    (item, quantity) => {
      const currentShop = cartShopId(useCartStore.getState().items);
      if (currentShop && item.shopId && currentShop !== item.shopId) {
        if (!window.confirm(t("cart.otherShopConfirm"))) return false;
        clear();
      }
      addItem(item, quantity);
      return true;
    },
    [addItem, clear, t]
  );
}
