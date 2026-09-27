import { auth } from "@/lib/firebase";
import type { CategoryTag } from "@/models/category/CategoryTag";
import { categoryTagRepository } from "@/repositories/CategoryTagRepository";
import type { ICategoryTagRepository } from "@/repositories/interfaces/ICategoryTagRepository";
import {
  createCategoryTagAction,
  deleteCategoryTagAction,
} from "@/server/actions/categoryTagActions";

export class CategoryTagService {
  constructor(
    private readonly categoryTags: ICategoryTagRepository = categoryTagRepository
  ) {}

  /** Lecture publique — un commerçant en a besoin pour choisir un tag. */
  listTags(): Promise<CategoryTag[]> {
    return this.categoryTags.listAll();
  }

  /** BF-109 : Super Admin uniquement, revalidé côté serveur (voir
   * `categoryTagActions.ts`). */
  async createTag(name: string, color: string): Promise<{ id: string }> {
    return createCategoryTagAction(await this.getCallerIdToken(), name, color);
  }

  async deleteTag(id: string): Promise<void> {
    await deleteCategoryTagAction(await this.getCallerIdToken(), id);
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const categoryTagService = new CategoryTagService();
