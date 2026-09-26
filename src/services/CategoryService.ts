import type { Category } from "@/models/category/Category";
import { categoryRepository } from "@/repositories/CategoryRepository";
import type {
  ICategoryRepository,
  UpdateCategoryDto,
} from "@/repositories/interfaces/ICategoryRepository";

export interface CreateCategoryInput {
  name: string;
  description: string;
  isActive: boolean;
}

export class CategoryService {
  constructor(
    private readonly categories: ICategoryRepository = categoryRepository
  ) {}

  listCategories(shopId: string): Promise<Category[]> {
    return this.categories.listByShop(shopId);
  }

  /** Catégories non mises à la corbeille (BF-99). */
  async listActive(shopId: string): Promise<Category[]> {
    const categories = await this.categories.listByShop(shopId);
    return categories.filter((category) => !category.deletedAt);
  }

  createCategory(
    shopId: string,
    { name, description, isActive }: CreateCategoryInput
  ): Promise<Category> {
    return this.categories.create({
      shopId,
      name: name.trim(),
      description: description.trim(),
      isActive,
    });
  }

  updateCategory(id: string, data: UpdateCategoryDto): Promise<void> {
    return this.categories.update(id, data);
  }

  /** Bascule visible/masquée (BF-09) : préférée à la suppression pour une
   * catégorie saisonnière, comme suggéré dans la page elle-même — les
   * produits qui y sont déjà rattachés ne perdent pas leur catégorie. */
  setCategoryActive(id: string, isActive: boolean): Promise<void> {
    return this.categories.update(id, { isActive });
  }

  deleteCategory(id: string): Promise<void> {
    return this.categories.remove(id);
  }
}

export const categoryService = new CategoryService();
