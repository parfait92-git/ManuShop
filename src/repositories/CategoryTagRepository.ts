import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { CategoryTag } from "@/models/category/CategoryTag";
import type { ICategoryTagRepository } from "@/repositories/interfaces/ICategoryTagRepository";

const CATEGORY_TAGS_COLLECTION = "categoryTags";

export class CategoryTagRepository implements ICategoryTagRepository {
  async listAll(): Promise<CategoryTag[]> {
    const snapshot = await getDocs(collection(db, CATEGORY_TAGS_COLLECTION));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoryTag);
  }
}

export const categoryTagRepository = new CategoryTagRepository();
