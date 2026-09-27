"use client";

import { useEffect, useState } from "react";

import { configurationService } from "@/services/ConfigurationService";
import { productService } from "@/services/ProductService";
import { shopService } from "@/services/ShopService";

/**
 * `/demo-catalogue` (et le repli automatique depuis `/catalogue`) ne doit
 * s'afficher que tant que la plateforme n'a pas encore de vraie boutique
 * publiée avec un produit visible réel — sinon la démo n'a plus lieu
 * d'être (demande utilisateur du 2026-09-26). Un Super Admin peut aussi la
 * désactiver explicitement (`configuration/general`), auquel cas elle ne
 * s'affiche jamais, quel que soit l'état réel de la plateforme.
 *
 * `undefined` tant que la réponse n'est pas connue (ne jamais rediriger
 * ni afficher la démo sur la base d'une réponse par défaut).
 */
export function useDemoCatalogueAvailable() {
  const [available, setAvailable] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function resolve() {
      try {
        const forceDisabled = await configurationService.isDemoCatalogueForceDisabled();
        if (forceDisabled) {
          if (active) setAvailable(false);
          return;
        }

        const shops = await shopService.listPublishedShops();
        const productLists = await Promise.all(
          shops.map((shop) => productService.listProducts(shop.id))
        );
        const hasRealInventory = productLists.some((products) =>
          products.some((product) => productService.isVisibleToCustomers(product))
        );

        if (active) setAvailable(!hasRealInventory);
      } catch (error) {
        // Une lecture a échoué (règles pas encore déployées, hors ligne...)
        // — ne jamais laisser la page appelante bloquée indéfiniment sur
        // "Chargement..." : repli sur le comportement historique (démo
        // affichée) plutôt qu'un état indéterminé. `console.error` : sans
        // ça, cette page se replie silencieusement sur la démo sans laisser
        // la moindre trace en cas de bug réel (voir
        // 04-besoins-techniques.md §31).
        console.error(
          "useDemoCatalogueAvailable : échec de la détection d'inventaire réel, repli sur la démo",
          error
        );
        if (active) setAvailable(true);
      }
    }

    resolve();
    return () => {
      active = false;
    };
  }, []);

  return available;
}
