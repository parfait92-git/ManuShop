import "server-only";

import type { Firestore } from "firebase-admin/firestore";

/**
 * À utiliser pour toute future suppression de boutique (2026-10-03) :
 * dans Firestore, supprimer un document NE supprime PAS ses
 * sous-collections (`shops/{id}/themes`…), qui resteraient orphelines.
 * `recursiveDelete` supprime la boutique et tout ce qui est rangé sous
 * elle. Les données d'une boutique rangées AILLEURS (produits, commandes,
 * catégories, factures…) ne sont pas concernées et demandent leur propre
 * traitement.
 */
export async function deleteShopDocumentTree(db: Firestore, shopId: string): Promise<void> {
  await db.recursiveDelete(db.collection("shops").doc(shopId));
}
