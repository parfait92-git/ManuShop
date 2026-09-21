import type { Shop } from "@/models/shop/Shop";

export type CreateShopDto = Omit<Shop, "id" | "createdAt">;
export type UpdateShopDto = Partial<
  Omit<Shop, "id" | "createdAt" | "ownerId" | "currency">
>;

export interface IShopRepository {
  getById(id: string): Promise<Shop | null>;
  create(data: CreateShopDto): Promise<Shop>;
  update(id: string, data: UpdateShopDto): Promise<void>;
}
