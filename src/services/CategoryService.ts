import type { Category } from "@/models/category/Category";
import { categoryRepository } from "@/repositories/CategoryRepository";
import type { ICategoryRepository } from "@/repositories/interfaces/ICategoryRepository";

export class CategoryService {
  constructor(
    private readonly categories: ICategoryRepository = categoryRepository
  ) {}

  listCategories(shopId: string): Promise<Category[]> {
    return this.categories.listByShop(shopId);
  }

  createCategory(shopId: string, name: string): Promise<Category> {
    return this.categories.create({ shopId, name: name.trim() });
  }

  deleteCategory(id: string): Promise<void> {
    return this.categories.remove(id);
  }
}

export const categoryService = new CategoryService();
