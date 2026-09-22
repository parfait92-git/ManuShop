import type { Category } from "@/models/category/Category";

export type CreateCategoryDto = Omit<Category, "id" | "createdAt">;
export type UpdateCategoryDto = Partial<
  Omit<Category, "id" | "shopId" | "createdAt">
>;

export interface ICategoryRepository {
  listByShop(shopId: string): Promise<Category[]>;
  create(data: CreateCategoryDto): Promise<Category>;
  update(id: string, data: UpdateCategoryDto): Promise<void>;
  remove(id: string): Promise<void>;
}
