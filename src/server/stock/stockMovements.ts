import "server-only";

import { FieldValue, type Firestore, type Transaction, type WriteBatch } from "firebase-admin/firestore";

import type { StockMovementType } from "@/models/stock/StockMovement";

export const STOCK_MOVEMENTS_COLLECTION = "stockMovements";

export interface StockMovementInput {
  shopId: string;
  productId: string;
  productName: string;
  /** Version concernée (BF-17) ; `stockAfter` est alors celui de la version. */
  variantId?: string;
  variantLabel?: string;
  type: StockMovementType;
  quantity: number;
  stockAfter: number;
  orderId?: string;
  note?: string;
  actorId?: string;
  actorName?: string;
}

/**
 * Ajoute un mouvement de stock (BF-15) au même lot ou à la même transaction
 * que la mise à jour du stock : l'un n'existe jamais sans l'autre.
 */
export function queueStockMovement(
  db: Firestore,
  writer: WriteBatch | Transaction,
  input: StockMovementInput
): void {
  // Pas de champ à `undefined` : Firestore le refuse.
  const entry = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== "")
  );
  (writer as WriteBatch).set(db.collection(STOCK_MOVEMENTS_COLLECTION).doc(), {
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}
