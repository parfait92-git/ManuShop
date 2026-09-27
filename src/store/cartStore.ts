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
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
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
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: clampToStock(quantity, i.stock) }
                    : i
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "manushop-cart" }
  )
);

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
