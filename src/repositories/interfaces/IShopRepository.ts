import type { Shop } from "@/models/shop/Shop";

export type CreateShopDto = Omit<Shop, "id" | "createdAt">;
export type UpdateShopDto = Partial<
  Omit<Shop, "id" | "createdAt" | "ownerId" | "currency">
>;

export interface IShopRepository {
  getById(id: string): Promise<Shop | null>;
  /** The project is single-tenant for now (one shop per deployment): used
   * by the public storefront, which has no shop id to key off of yet. */
  getFirst(): Promise<Shop | null>;
  create(data: CreateShopDto): Promise<Shop>;
  update(id: string, data: UpdateShopDto): Promise<void>;
}
