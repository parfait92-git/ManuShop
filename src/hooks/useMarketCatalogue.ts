"use client";

import { useEffect, useState } from "react";

import type { CategoryTag } from "@/models/category/CategoryTag";
import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";
import { categoryService } from "@/services/CategoryService";
import { categoryTagService } from "@/services/CategoryTagService";
import { productService } from "@/services/ProductService";
import { shopService } from "@/services/ShopService";

export interface MarketProduct {
  product: Product;
  shop: Shop;
  /** Tag système (BF-109→111) de la catégorie de ce produit DANS sa
   * boutique — résolu via `Category.tagId`, absent si la catégorie n'a pas
   * de tag choisi (ou n'existe plus). Jamais le nom de catégorie brut de la
   * boutique : ça ne veut rien dire au niveau du Marché, voir BF-110. */
  tag?: CategoryTag;
}

/**
 * Agrégation multi-boutique côté client (page Marché, BF-108/BF-110) :
 * liste les boutiques publiées puis, pour chacune, ses produits visibles ET
 * ses catégories (pour résoudre `Category.tagId` → tag système) — même
 * approche que `useDemoCatalogueAvailable`. Une lecture par boutique ;
 * correct au nombre de boutiques actuel, à revoir (index dédié/moteur de
 * recherche) si la plateforme grossit beaucoup.
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

    Promise.all([shopService.listPublishedShops(), categoryTagService.listTags()])
      .then(([shops, tags]) => {
        const tagById = new Map(tags.map((tag) => [tag.id, tag]));
        return Promise.all(
          shops.map((shop) =>
            Promise.all([
              productService.listProducts(shop.id),
              categoryService.listCategories(shop.id),
            ]).then(([products, categories]) => {
              const tagIdByCategoryName = new Map(
                categories.map((category) => [category.name, category.tagId])
              );
              return { shop, products, tagIdByCategoryName };
            })
          )
        ).then((perShop) => ({ perShop, tagById }));
      })
      .then(({ perShop, tagById }) => {
        if (!active) return;
        setItems(
          perShop.flatMap(({ shop, products, tagIdByCategoryName }) =>
            products
              .filter((product) => productService.isVisibleToCustomers(product))
              .map((product) => {
                const tagId = tagIdByCategoryName.get(product.category);
                return {
                  product,
                  shop,
                  tag: tagId ? tagById.get(tagId) : undefined,
                };
              })
          )
        );
      })
      .catch((error) => {
        // `console.error` : sans ça, un vrai échec de lecture (règles pas
        // encore déployées, etc.) se replie silencieusement sur un marché
        // vide, indiscernable d'une plateforme honnêtement sans produit —
        // même esprit que `useDemoCatalogueAvailable` (04-besoins-techniques.md §31).
        console.error(
          "useMarketCatalogue : échec de l'agrégation des produits publiés",
          error
        );
        if (active) setItems([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return items;
}
