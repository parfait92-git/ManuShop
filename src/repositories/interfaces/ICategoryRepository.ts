import type { Category } from "@/models/category/Category";

export type CreateCategoryDto = Omit<Category, "id" | "createdAt">;

export interface ICategoryRepository {
  listByShop(shopId: string): Promise<Category[]>;
  create(data: CreateCategoryDto): Promise<Category>;
  remove(id: string): Promise<void>;
}
