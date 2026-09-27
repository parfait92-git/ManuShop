"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import type { PremiumFeatureKey } from "@/lib/premiumFeatures";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import type { User } from "@/models/user/User";

const USERS_COLLECTION = "users";
const SHOPS_COLLECTION = "shops";

/**
 * DTO traversant la frontière Server Action : `Timestamp` (client ou admin)
 * est une instance de classe, pas une donnée plane, et ne survit pas à la
 * sérialisation RSC telle quelle. `PlatformAdminService` reconstruit un
 * vrai `Timestamp` côté client à partir de la chaîne ISO ci-dessous.
 */
export type SearchedUserDto = Omit<User, "createdAt"> & {
  createdAt: string;
};

export async function grantAdminAction(
  idToken: string,
  userId: string
): Promise<void> {
  await requireSuperAdmin(idToken);
  await getAdminDb().collection(USERS_COLLECTION).doc(userId).update({
    role: "admin",
    adminSource: "manual",
  });
}

export async function revokeAdminAction(
  idToken: string,
  userId: string
): Promise<void> {
  await requireSuperAdmin(idToken);
  await getAdminDb().collection(USERS_COLLECTION).doc(userId).update({
    role: "client",
  });
}

export async function searchUsersAction(
  idToken: string,
  term: string
): Promise<SearchedUserDto[]> {
  await requireSuperAdmin(idToken);

  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  const snapshot = await getAdminDb().collection(USERS_COLLECTION).get();

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
      } as SearchedUserDto;
    })
    .filter(
      (user) =>
        user.displayName.toLowerCase().includes(normalized) ||
        (user.email?.toLowerCase().includes(normalized) ?? false) ||
        (user.phone?.toLowerCase().includes(normalized) ?? false)
    );
}

export interface MerchantShopDto {
  id: string;
  name: string;
  isPublished: boolean;
  premiumFeatures: string[];
}

export interface MerchantDto {
  ownerId: string;
  displayName: string;
  email?: string;
  shops: MerchantShopDto[];
}

/**
 * BF-117/118 : un commerçant est déduit des boutiques elles-mêmes (groupées
 * par `ownerId`), pas d'un rôle sur `users` — un compte peut redevenir
 * client (BF-70/93) sans que ses boutiques disparaissent. Une seule lecture
 * complète de `shops` (petite échelle, même convention que
 * `listPublishedShops`), puis un profil par propriétaire distinct.
 */
export async function listMerchantsAction(
  idToken: string
): Promise<MerchantDto[]> {
  await requireSuperAdmin(idToken);
  const db = getAdminDb();

  const shopsSnapshot = await db.collection(SHOPS_COLLECTION).get();
  const shopsByOwner = new Map<string, MerchantShopDto[]>();
  for (const shopDoc of shopsSnapshot.docs) {
    const data = shopDoc.data();
    const shops = shopsByOwner.get(data.ownerId) ?? [];
    shops.push({
      id: shopDoc.id,
      name: data.name,
      isPublished: data.isPublished === true,
      premiumFeatures: data.premiumFeatures ?? [],
    });
    shopsByOwner.set(data.ownerId, shops);
  }

  return Promise.all(
    [...shopsByOwner.entries()].map(async ([ownerId, shops]) => {
      const ownerSnapshot = await db
        .collection(USERS_COLLECTION)
        .doc(ownerId)
        .get();
      const ownerData = ownerSnapshot.data();
      return {
        ownerId,
        displayName: ownerData?.displayName ?? "Compte supprimé",
        email: ownerData?.email,
        shops,
      };
    })
  );
}

/** BF-119 : indépendant de l'abonnement — `arrayUnion`/`arrayRemove` plutôt
 * qu'un remplacement complet du tableau, pour rester sûr même si deux
 * Super Admin modifiaient la même boutique en même temps. */
export async function setShopPremiumFeatureAction(
  idToken: string,
  shopId: string,
  feature: PremiumFeatureKey,
  enabled: boolean
): Promise<void> {
  await requireSuperAdmin(idToken);
  await getAdminDb()
    .collection(SHOPS_COLLECTION)
    .doc(shopId)
    .update({
      premiumFeatures: enabled
        ? FieldValue.arrayUnion(feature)
        : FieldValue.arrayRemove(feature),
    });
}
