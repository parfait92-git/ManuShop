import type { Category } from "@/models/category/Category";

export type CreateCategoryDto = Omit<Category, "id" | "createdAt">;
export type UpdateCategoryDto = Partial<
  Omit<Category, "id" | "shopId" | "createdAt">
>;

export interface ICategoryRepository {
  listByShop(shopId: string): Promise<Category[]>;
  create(data: CreateCategoryDto): Promise<Category>;
  update(id: string, data: UpdateCategoryDto): Promise<void>;
  /** Suppression définitive (Corbeille uniquement, BF-100). */
  remove(id: string): Promise<void>;
  /** "Suppression" par défaut (BF-99) — voir IProductRepository.softDelete. */
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
