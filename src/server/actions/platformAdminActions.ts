"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import type { User } from "@/models/user/User";

const USERS_COLLECTION = "users";

/**
 * DTO traversant la frontière Server Action : `Timestamp` (client ou admin)
 * est une instance de classe, pas une donnée plane, et ne survit pas à la
 * sérialisation RSC telle quelle. `PlatformAdminService` reconstruit un
 * vrai `Timestamp` côté client à partir des chaînes ISO ci-dessous.
 */
export type SearchedUserDto = Omit<
  User,
  "createdAt" | "subscriptionExpiresAt"
> & {
  createdAt: string;
  subscriptionExpiresAt?: string;
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
        subscriptionExpiresAt: data.subscriptionExpiresAt
          ?.toDate()
          .toISOString(),
      } as SearchedUserDto;
    })
    .filter(
      (user) =>
        user.displayName.toLowerCase().includes(normalized) ||
        (user.email?.toLowerCase().includes(normalized) ?? false) ||
        (user.phone?.toLowerCase().includes(normalized) ?? false)
    );
}
