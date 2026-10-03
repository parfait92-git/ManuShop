import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { toShopPremiumState, type ShopPremiumState } from "@/lib/premiumCatalog";
import { ACTIVE_THEME_DOC } from "@/models/theme/ShopTheme";
import { applyShopThemeAction } from "@/server/actions/themeActions";
import { DEFAULT_THEME_ID } from "@/themes/registry";

/** Thème des boutiques (2026-10-03) : lecture en direct du thème appliqué
 * (`shops/{shopId}/themes/active`), application par le serveur. */
export class ThemeService {
  /** Suit le thème appliqué ; le thème par défaut si aucun ne l'est. */
  watchActiveTheme(shopId: string, onChange: (themeId: string) => void): () => void {
    return onSnapshot(
      doc(db, "shops", shopId, "themes", ACTIVE_THEME_DOC),
      (snapshot) => onChange((snapshot.data()?.themeId as string | undefined) ?? DEFAULT_THEME_ID),
      () => onChange(DEFAULT_THEME_ID)
    );
  }

  /** Ce qui ouvre l'accès premium de la boutique (privilèges,
   * abonnement), suivi en direct : un achat validé ou un abonnement
   * changé s'applique aussitôt. */
  watchShopPremium(shopId: string, onChange: (state: ShopPremiumState) => void): () => void {
    return onSnapshot(
      doc(db, "shops", shopId),
      (snapshot) => onChange(toShopPremiumState(snapshot.data() ?? {})),
      () => onChange({})
    );
  }

  async applyTheme(themeId: string): Promise<void> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Vous devez être connecté.");
    await applyShopThemeAction(token, themeId);
  }
}

export const themeService = new ThemeService();
