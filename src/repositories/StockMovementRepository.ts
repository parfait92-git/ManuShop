import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { StockMovement } from "@/models/stock/StockMovement";
import type { IStockMovementRepository } from "@/repositories/interfaces/IStockMovementRepository";

const STOCK_MOVEMENTS_COLLECTION = "stockMovements";

/** Lecture seule : les mouvements sont écrits par le serveur. Filtres
 * d'égalité uniquement (aucun index composite à créer), tri côté service. */
export class StockMovementRepository implements IStockMovementRepository {
  async listByProduct(shopId: string, productId: string): Promise<StockMovement[]> {
    const snapshot = await getDocs(
      query(
        collection(db, STOCK_MOVEMENTS_COLLECTION),
        where("shopId", "==", shopId),
        where("productId", "==", productId)
      )
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StockMovement);
  }

  async listByShop(shopId: string): Promise<StockMovement[]> {
    const snapshot = await getDocs(
      query(collection(db, STOCK_MOVEMENTS_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StockMovement);
  }
}

export const stockMovementRepository = new StockMovementRepository();
