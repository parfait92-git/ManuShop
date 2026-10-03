"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  hasPremiumAccess,
  isPremiumItemKey,
  listPremiumItems,
  resolvePremiumCatalog,
  toShopPremiumState,
  validatePremiumCatalog,
  type PremiumCatalog,
} from "@/lib/premiumCatalog";
import { requireCaller } from "@/server/auth/requireCaller";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { PREMIUM_CONFIG_DOC, readPremiumCatalog } from "@/server/premium/readCatalog";

const REQUESTS = "premiumRequests";

/** Offres premium (Super Admin) : articles premium et leurs prix, prix et
 * contenu des formules d'abonnement. */
export async function setPremiumCatalogAction(idToken: string, input: PremiumCatalog): Promise<void> {
  await requireSuperAdmin(idToken);
  // Repasse par la résolution : rien d'inconnu ni de mal formé n'est
  // enregistré, et l'erreur de saisie est signalée.
  const error = validatePremiumCatalog(input);
  if (error) throw new ValidationError(error);
  const catalog = resolvePremiumCatalog(input);
  await getAdminDb().collection("configuration").doc(PREMIUM_CONFIG_DOC).set(catalog);
}

/**
 * Demande d'achat d'un article premium par le gérant de la boutique
 * (2026-10-03). Refusée si l'article est gratuit, sans prix, déjà
 * accessible, ou déjà demandé.
 */
export async function requestPremiumItemAction(idToken: string, itemKey: string): Promise<void> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();
  const user = (await db.collection("users").doc(caller.uid).get()).data();
  if (!user || user.role !== "admin" || !user.shopId) throw new ForbiddenError();
  if (!isPremiumItemKey(itemKey)) throw new ValidationError("Article inconnu.");

  const [shopSnapshot, catalog, pending] = await Promise.all([
    db.collection("shops").doc(user.shopId).get(),
    readPremiumCatalog(db),
    db.collection(REQUESTS).where("shopId", "==", user.shopId).where("status", "==", "pending").get(),
  ]);
  const shop = shopSnapshot.data();
  if (!shop) throw new NotFoundError("Boutique introuvable.");
  const settings = catalog.items[itemKey];
  if (!settings.premium) throw new ValidationError("Cet article est gratuit.");
  if (settings.priceFcfa === null) {
    throw new ValidationError("Le prix de cet article n'est pas encore fixé. Réessayez plus tard.");
  }
  if (hasPremiumAccess(itemKey, toShopPremiumState(shop), catalog)) {
    throw new ValidationError("Votre boutique y a déjà accès.");
  }
  if (pending.docs.some((d) => d.data().itemKey === itemKey)) {
    throw new ValidationError("Une demande est déjà en attente pour cet article.");
  }

  const item = listPremiumItems().find((i) => i.key === itemKey)!;
  await db.collection(REQUESTS).add({
    shopId: user.shopId,
    shopName: shop.name ?? "Boutique",
    itemKey,
    itemLabel: item.label,
    priceFcfa: settings.priceFcfa,
    status: "pending",
    requestedBy: caller.uid,
    requestedByName: user.displayName ?? "",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export interface PremiumRequestDto {
  id: string;
  shopId: string;
  shopName: string;
  itemKey: string;
  itemLabel: string;
  priceFcfa: number;
  status: "pending" | "approved" | "rejected";
  requestedByName: string;
  createdAt: string;
  decidedAt?: string;
}

/** Demandes d'achat, les plus récentes d'abord (Super Admin). */
export async function listPremiumRequestsAction(idToken: string): Promise<PremiumRequestDto[]> {
  await requireSuperAdmin(idToken);
  const snapshot = await getAdminDb().collection(REQUESTS).get();
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        shopId: data.shopId,
        shopName: data.shopName,
        itemKey: data.itemKey,
        itemLabel: data.itemLabel,
        priceFcfa: data.priceFcfa,
        status: data.status,
        requestedByName: data.requestedByName ?? "",
        createdAt: data.createdAt?.toDate?.().toISOString() ?? new Date(0).toISOString(),
        decidedAt: data.decidedAt?.toDate?.().toISOString(),
      } as PremiumRequestDto;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Le Super Admin valide (après avoir encaissé le paiement) ou refuse une
 * demande. Validée : l'article est ajouté définitivement aux privilèges de
 * la boutique, dans le même lot que la décision.
 */
export async function decidePremiumRequestAction(
  idToken: string,
  requestId: string,
  approve: boolean
): Promise<void> {
  await requireSuperAdmin(idToken);
  const db = getAdminDb();
  const ref = db.collection(REQUESTS).doc(requestId);
  const request = (await ref.get()).data();
  if (!request) throw new NotFoundError("Demande introuvable.");
  if (request.status !== "pending") throw new ValidationError("Cette demande a déjà été traitée.");

  const batch = db.batch();
  batch.update(ref, {
    status: approve ? "approved" : "rejected",
    decidedAt: FieldValue.serverTimestamp(),
  });
  if (approve) {
    batch.update(db.collection("shops").doc(request.shopId), {
      premiumFeatures: FieldValue.arrayUnion(request.itemKey),
    });
  }
  await batch.commit();
}
