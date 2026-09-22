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
}
