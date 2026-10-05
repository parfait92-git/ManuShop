import { auth } from "@/lib/firebase";
import type { StockMovement } from "@/models/stock/StockMovement";
import type { IStockMovementRepository } from "@/repositories/interfaces/IStockMovementRepository";
import { stockMovementRepository } from "@/repositories/StockMovementRepository";
import {
  adjustStockAction,
  recordInitialStockAction,
  restockProductAction,
  saveProductVariantsAction,
} from "@/server/actions/client/stockActions";
import type {
  AdjustStockInput,
  RestockInput,
  VariantDraft,
} from "@/server/actions/stockActions";

async function idToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Vous devez être connecté.");
  return token;
}

/** Plus récents d'abord ; un mouvement tout juste écrit (date serveur pas
 * encore relue) passe en tête. */
function newestFirst(movements: StockMovement[]): StockMovement[] {
  const ms = (m: StockMovement) => m.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
  return [...movements].sort((a, b) => ms(b) - ms(a));
}

/**
 * Module Stock (BF-15, BF-16, 2026-10-03) : historique des mouvements,
 * réapprovisionnement et correction d'inventaire. Le stock ne s'écrit que
 * par le serveur, qui inscrit chaque changement dans l'historique.
 */
export class StockService {
  constructor(private readonly movements: IStockMovementRepository = stockMovementRepository) {}

  async listProductHistory(shopId: string, productId: string): Promise<StockMovement[]> {
    return newestFirst(await this.movements.listByProduct(shopId, productId));
  }

  async listShopMovements(shopId: string): Promise<StockMovement[]> {
    return newestFirst(await this.movements.listByShop(shopId));
  }

  async restock(input: RestockInput): Promise<number> {
    return (await restockProductAction(await idToken(), input)).stockAfter;
  }

  async adjust(input: AdjustStockInput): Promise<number> {
    return (await adjustStockAction(await idToken(), input)).stockAfter;
  }

  /** Versions d'un produit existant (BF-17) : ajout, prix, ordre, retrait. */
  async saveVariants(productId: string, variantName: string, variants: VariantDraft[]): Promise<void> {
    await saveProductVariantsAction(await idToken(), { productId, variantName, variants });
  }

  /** Stock de départ d'un produit qui vient d'être créé. */
  async recordInitialStock(productId: string): Promise<void> {
    await recordInitialStockAction(await idToken(), productId);
  }
}

export const stockService = new StockService();
