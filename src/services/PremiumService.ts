import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { resolvePremiumCatalog, type PremiumCatalog } from "@/lib/premiumCatalog";
import type { PremiumRequest } from "@/models/premium/PremiumRequest";
import {
  decidePremiumRequestAction,
  listPremiumRequestsAction,
  requestPremiumItemAction,
  setPremiumCatalogAction,
} from "@/server/actions/premiumActions";

/** Offres premium (2026-10-03) : catalogue public, demandes d'achat. */
export class PremiumService {
  private cached: Promise<PremiumCatalog> | null = null;

  /** Catalogue en vigueur, lu une fois par chargement de page. */
  getCatalog(): Promise<PremiumCatalog> {
    this.cached ??= getDoc(doc(db, "configuration", "premium"))
      .then((snapshot) => resolvePremiumCatalog(snapshot.data()))
      .catch(() => {
        this.cached = null;
        return resolvePremiumCatalog(undefined);
      });
    return this.cached;
  }

  async saveCatalog(catalog: PremiumCatalog): Promise<void> {
    await setPremiumCatalogAction(await this.token(), catalog);
    this.cached = Promise.resolve(resolvePremiumCatalog(catalog));
  }

  async requestItem(itemKey: string): Promise<void> {
    await requestPremiumItemAction(await this.token(), itemKey);
  }

  /** Demandes de la boutique, en direct (page Thèmes du gérant). */
  watchShopRequests(shopId: string, onChange: (requests: PremiumRequest[]) => void): () => void {
    return onSnapshot(
      query(collection(db, "premiumRequests"), where("shopId", "==", shopId)),
      (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PremiumRequest)),
      () => onChange([])
    );
  }

  async listRequests() {
    return listPremiumRequestsAction(await this.token());
  }

  async decideRequest(requestId: string, approve: boolean): Promise<void> {
    await decidePremiumRequestAction(await this.token(), requestId, approve);
  }

  private async token(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Vous devez être connecté.");
    return token;
  }
}

export const premiumService = new PremiumService();
