import type { Timestamp } from "firebase/firestore";

/** Id du document du thème appliqué : `shops/{shopId}/themes/active`. */
export const ACTIVE_THEME_DOC = "active";

/**
 * Thème appliqué à une boutique (2026-10-03), rangé SOUS la boutique
 * (`shops/{shopId}/themes/active`, demande de l'utilisateur) : il vit et
 * disparaît avec elle. Absent : thème par défaut. Lisible par tous (la
 * vitrine en a besoin), écrit seulement par le serveur
 * (`applyShopThemeAction`, gérant de la boutique).
 */
export interface ShopTheme {
  themeId: string;
  appliedAt: Timestamp;
  /** uid du gérant qui l'a appliqué. */
  appliedBy: string;
}
