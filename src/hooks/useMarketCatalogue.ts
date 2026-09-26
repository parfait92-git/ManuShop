"use client";

import { useEffect, useState } from "react";

import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";
import { productService } from "@/services/ProductService";
import { shopService } from "@/services/ShopService";

export interface MarketProduct {
  product: Product;
  shop: Shop;
}

/**
 * Agrégation multi-boutique côté client (page Marché, BF-108 — version
 * réduite sans classement des meilleures boutiques ni tags système, voir
 * 04-besoins-techniques.md §22) : liste les boutiques publiées puis leurs
 * produits visibles, en mémoire — même approche que
 * `useDemoCatalogueAvailable`. Une lecture par boutique ; correct au nombre
 * de boutiques actuel, à revoir (index dédié/moteur de recherche) si la
 * plateforme grossit beaucoup.
 *
 * `undefined` tant que la réponse n'est pas connue. Un échec de lecture se
 * replie sur `[]` (jamais bloqué sur "Chargement...") — l'appelant doit
 * traiter ça comme un marché honnêtement vide, pas comme une erreur à
 * afficher (même esprit que `useDemoCatalogueAvailable`).
 */
export function useMarketCatalogue(): MarketProduct[] | undefined {
  const [items, setItems] = useState<MarketProduct[] | undefined>(undefined);

  useEffect(() => {
    let active = true;

    shopService
      .listPublishedShops()
      .then((shops) =>
        Promise.all(
          shops.map((shop) =>
            productService
              .listProducts(shop.id)
              .then((products) => ({ shop, products }))
          )
        )
      )
      .then((perShop) => {
        if (!active) return;
        setItems(
          perShop.flatMap(({ shop, products }) =>
            products
              .filter((product) => productService.isVisibleToCustomers(product))
              .map((product) => ({ product, shop }))
          )
        );
      })
      .catch(() => {
        if (active) setItems([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return items;
}
