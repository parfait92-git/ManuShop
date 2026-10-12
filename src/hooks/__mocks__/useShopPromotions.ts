/**
 * Remplaçant des tests (`jest.mock("…/hooks/useShopPromotions")`) :
 * campagnes de promotion fixées par le test (aucune par défaut), sans
 * lecture Firestore ; heure fixe pour des prix stables.
 */
import type { Promotion } from "@/models/promotion/Promotion";

let mockPromotions: Promotion[] = [];
const NOW = new Date();

/** Campagnes renvoyées pour toute boutique ; `[]` pour revenir à aucune. */
export function __setMockPromotions(promotions: Promotion[]) {
  mockPromotions = promotions;
}

export function useShopPromotions(shopId: string | null | undefined): Promotion[] {
  return shopId ? mockPromotions : [];
}

export function useShopsPromotions(shopIds: string[]): Map<string, Promotion[]> {
  return new Map(shopIds.map((id) => [id, mockPromotions]));
}

export function useNow(): Date {
  return NOW;
}
