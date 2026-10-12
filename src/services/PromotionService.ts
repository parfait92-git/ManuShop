import { auth } from "@/lib/firebase";
import type { Promotion } from "@/models/promotion/Promotion";
import { promotionRepository, type PromotionRepository } from "@/repositories/PromotionRepository";
import {
  deletePromotionAction,
  endPromotionAction,
  savePromotionAction,
} from "@/server/actions/client/promotionActions";
import type { PromotionInput } from "@/server/actions/promotionActions";

async function idToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Vous devez être connecté.");
  return token;
}

/** Campagnes de promotion d'une boutique (BF-30→33, 2026-10-12). */
export class PromotionService {
  constructor(private readonly promotions: PromotionRepository = promotionRepository) {}

  listByShop(shopId: string): Promise<Promotion[]> {
    return this.promotions.listByShop(shopId);
  }

  watchByShop(shopId: string, onChange: (promotions: Promotion[]) => void, onError?: () => void) {
    return this.promotions.watchByShop(shopId, onChange, onError);
  }

  async save(input: PromotionInput): Promise<string> {
    return (await savePromotionAction(await idToken(), input)).id;
  }

  async end(id: string): Promise<void> {
    await endPromotionAction(await idToken(), id);
  }

  async remove(id: string): Promise<void> {
    await deletePromotionAction(await idToken(), id);
  }
}

export const promotionService = new PromotionService();
