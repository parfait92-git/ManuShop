import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Category } from "@/models/category/Category";
import type {
  CreateCategoryDto,
  ICategoryRepository,
} from "@/repositories/interfaces/ICategoryRepository";

const CATEGORIES_COLLECTION = "categories";

export class CategoryRepository implements ICategoryRepository {
  async listByShop(shopId: string): Promise<Category[]> {
    const snapshot = await getDocs(
      query(
        collection(db, CATEGORIES_COLLECTION),
        where("shopId", "==", shopId)
      )
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    const ref = doc(collection(db, CATEGORIES_COLLECTION));
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
    const snapshot = await getDoc(ref);
    return { id: snapshot.id, ...snapshot.data() } as Category;
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
  }
}

export const categoryRepository = new CategoryRepository();
