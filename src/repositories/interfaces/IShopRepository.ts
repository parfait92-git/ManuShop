import type { Shop } from "@/models/shop/Shop";

export type CreateShopDto = Omit<Shop, "id" | "createdAt">;
export type UpdateShopDto = Partial<Omit<Shop, "id" | "createdAt" | "ownerId">>;

export interface IShopRepository {
  getById(id: string): Promise<Shop | null>;
  /** The project is single-tenant for now (one shop per deployment): used
   * by the public storefront, which has no shop id to key off of yet. */
  getFirst(): Promise<Shop | null>;
  /** Toutes les boutiques d'un même propriétaire (BF-85/87, multi-boutique). */
  listByOwner(ownerId: string): Promise<Shop[]>;
  /** Toutes les boutiques publiées, tous propriétaires confondus — page
   * Marché (BF-108). Catalogue de boutiques suffisamment petit pour filtrer
   * `isPublished` en mémoire plutôt que par une requête dédiée, cohérent
   * avec le reste du projet. */
  listPublished(): Promise<Shop[]>;
  create(data: CreateShopDto): Promise<Shop>;
  update(id: string, data: UpdateShopDto): Promise<void>;
}
