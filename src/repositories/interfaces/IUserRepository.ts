import type { User } from "@/models/user/User";

export type CreateUserDto = Omit<User, "id" | "createdAt">;
export type UpdateUserDto = Partial<Omit<User, "id" | "createdAt" | "email">>;

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  create(id: string, data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<void>;
  listByShop(shopId: string): Promise<User[]>;
  /** Réservé au Super Admin (BF-68) — la règle Firestore qui l'autorise ne
   * s'applique qu'à ce rôle. */
  listAll(): Promise<User[]>;
  /** BF-129 : `arrayUnion`/`arrayRemove`, pas une lecture puis réécriture du
   * tableau complet — évite d'écraser un ajout/retrait concurrent (deux
   * onglets du même navigateur, par ex.). */
  addFavorite(id: string, productId: string): Promise<void>;
  removeFavorite(id: string, productId: string): Promise<void>;
  /** BF-134/BF-135 : `arrayUnion`, même raisonnement que `addFavorite` —
   * jamais de retrait (pas de besoin identifié de "revoir" un tour). */
  markTourSeen(id: string, tourId: string): Promise<void>;
}
