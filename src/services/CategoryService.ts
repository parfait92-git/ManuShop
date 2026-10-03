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
  tagId?: string;
}

export class CategoryService {
  constructor(
    private readonly categories: ICategoryRepository = categoryRepository
  ) {}

  listCategories(shopId: string): Promise<Category[]> {
    return this.categories.listByShop(shopId);
  }

  /** Catégories que voient les clients sur la vitrine (2026-10-03) :
   * affichées par le commerçant (« Masquée » exclue) et pas à la
   * corbeille. */
  async listVisible(shopId: string): Promise<Category[]> {
    const categories = await this.categories.listByShop(shopId);
    return categories.filter((category) => !category.deletedAt && category.isActive !== false);
  }

  /** Catégories non mises à la corbeille (BF-99). */
  async listActive(shopId: string): Promise<Category[]> {
    const categories = await this.categories.listByShop(shopId);
    return categories.filter((category) => !category.deletedAt);
  }

  createCategory(
    shopId: string,
    { name, description, isActive, tagId }: CreateCategoryInput
  ): Promise<Category> {
    return this.categories.create({
      shopId,
      name: name.trim(),
      description: description.trim(),
      isActive,
      // Jamais `tagId: undefined` explicitement : Firestore refuse un champ
      // à `undefined` sur `setDoc` (contrairement à son absence pure et
      // simple de l'objet).
      ...(tagId ? { tagId } : {}),
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
