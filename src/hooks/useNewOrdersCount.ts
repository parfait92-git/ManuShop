"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";

/**
 * Nombre de commandes "En cours d'analyse" (pas encore traitées) pour la
 * boutique — alimente la cloche de notification du tableau de bord
 * (`DashboardTopbar`). Seul usage de `onSnapshot` du projet : justifié ici
 * précisément parce qu'il s'agit d'une notification censée être "directe"
 * (demande explicite de l'utilisateur), pas d'un simple chargement de page
 * — ailleurs, un `.then()` au montage suffit (voir CataloguePageContent,
 * useCurrentShop...).
 */
export function useNewOrdersCount(shopId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shopId) {
      queueMicrotask(() => setCount(0));
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        collection(db, "orders"),
        where("shopId", "==", shopId),
        where("status", "==", "under_review")
      ),
      (snapshot) => setCount(snapshot.size)
    );
    return unsubscribe;
  }, [shopId]);

  return count;
}
