"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  /** Stock connu au moment de l'ajout au panier — sert uniquement à borner
   * la quantité côté client (jamais la seule vérification : `createOrderAction`
   * revalide le stock réel en transaction avant d'écrire la commande, voir
   * 04-besoins-techniques.md §32). Un article déjà dans le panier avant ce
   * champ (persisté en localStorage) le lit comme `undefined` — traité comme
   * "pas de limite connue", pour ne pas bloquer une quantité déjà choisie. */
  stock?: number;
  /** Boutique de l'article. Un panier ne contient les articles que d'une
   * seule boutique : c'est à elle que la commande est passée (voir
   * `useAddToCart`). Absent sur un panier enregistré avant ce champ —
   * renseigné au rafraîchissement suivant (`useCartPriceSync`). */
  shopId?: string;
  /** Version choisie (BF-17) ; `name` reste le nom du produit, `stock`
   * celui de la version. Deux versions d'un produit font deux lignes. */
  variantId?: string;
  variantLabel?: string;
}

/** Identifiant d'une ligne du panier : le produit, et sa version. */
export function cartLineKey(item: Pick<CartItem, "productId" | "variantId">): string {
  return item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  /** `key` : `cartLineKey` de la ligne. */
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  /** Remplace le prix des articles par leur prix actuel, ex. après la fin
   * d'une promotion, et complète leur boutique (`cartLineKey` → valeurs).
   * Les articles absents de la table restent inchangés. */
  refreshPrices: (current: Record<string, { price: number; shopId: string }>) => void;
  clear: () => void;
}

function clampToStock(quantity: number, stock: number | undefined): number {
  return stock === undefined ? quantity : Math.min(quantity, stock);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const key = cartLineKey(item);
          const existing = state.items.find((i) => cartLineKey(i) === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartLineKey(i) === key
                  ? {
                      ...i,
                      stock: item.stock,
                      quantity: clampToStock(i.quantity + quantity, item.stock),
                    }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: clampToStock(quantity, item.stock) },
            ],
          };
        }),
      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((i) => cartLineKey(i) !== key),
        })),
      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => cartLineKey(i) !== key)
              : state.items.map((i) =>
                  cartLineKey(i) === key
                    ? { ...i, quantity: clampToStock(quantity, i.stock) }
                    : i
                ),
        })),
      refreshPrices: (current) =>
        set((state) => ({
          items: state.items.map((i) => {
            const latest = current[cartLineKey(i)];
            if (!latest || (latest.price === i.price && latest.shopId === i.shopId)) return i;
            return { ...i, price: latest.price, shopId: latest.shopId };
          }),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "manushop-cart" }
  )
);

/** Boutique du panier : celle de ses articles (un seul possible). */
export function cartShopId(items: CartItem[]): string | undefined {
  return items.find((item) => item.shopId)?.shopId;
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * The cart is persisted to localStorage, so a returning visitor's real
 * count differs from the empty store the server renders. Returning 0 until
 * mount keeps the first client render identical to the server's, then
 * swaps in the real value — same fix as ScrollReveal's hydration bug.
 */
export function useCartItemCount(): number {
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((state) => cartItemCount(state.items));

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  return mounted ? count : 0;
}
