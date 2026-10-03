/**
 * Remplaçant des tests (`jest.mock("…/hooks/usePremiumCatalog")`) : offres
 * premium par défaut, sans lecture Firestore ; même calcul d'accès que
 * l'application.
 */
import { hasPremiumAccess, resolvePremiumCatalog, toShopPremiumState } from "@/lib/premiumCatalog";

const catalog = resolvePremiumCatalog(undefined);

export function usePremiumCatalog() {
  return catalog;
}

export function usePremiumAccess(
  shop: { premiumFeatures?: unknown; subscriptionPlan?: unknown; subscriptionExpiresAt?: unknown } | null | undefined
) {
  return (key: string) => !!shop && hasPremiumAccess(key, toShopPremiumState(shop), catalog);
}
