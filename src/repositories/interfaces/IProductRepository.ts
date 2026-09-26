import type { Product } from "@/models/product/Product";

export type CreateProductDto = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type UpdateProductDto = Partial<
  Omit<Product, "id" | "shopId" | "createdAt" | "updatedAt">
>;

export interface IProductRepository {
  getById(id: string): Promise<Product | null>;
  listByShop(shopId: string): Promise<Product[]>;
  create(data: CreateProductDto): Promise<Product>;
  update(id: string, data: UpdateProductDto): Promise<void>;
  /** Suppression définitive (Corbeille uniquement, BF-100) — un vrai
   * `delete()` Firestore. */
  remove(id: string): Promise<void>;
  /** "Suppression" par défaut (BF-99) : pose `deletedAt` plutôt qu'un vrai
   * delete. Méthode dédiée plutôt qu'un passage par `update()` : `deletedAt`
   * s'écrit via `serverTimestamp()`, un `FieldValue` incompatible avec le
   * DTO strict `UpdateProductDto`. */
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
