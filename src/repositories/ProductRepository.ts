import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Product } from "@/models/product/Product";
import type {
  CreateProductDto,
  IProductRepository,
  UpdateProductDto,
} from "@/repositories/interfaces/IProductRepository";

const PRODUCTS_COLLECTION = "products";

export class ProductRepository implements IProductRepository {
  async getById(id: string): Promise<Product | null> {
    const snapshot = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Product;
  }

  async listByShop(shopId: string): Promise<Product[]> {
    const snapshot = await getDocs(
      query(collection(db, PRODUCTS_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  }

  async create(data: CreateProductDto): Promise<Product> {
    const ref = doc(collection(db, PRODUCTS_COLLECTION));
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await this.getById(ref.id);
    if (!created) {
      throw new Error("Échec de la création du produit.");
    }
    return created;
  }

  async update(id: string, data: UpdateProductDto): Promise<void> {
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
  }

  async softDelete(id: string): Promise<void> {
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      deletedAt: serverTimestamp(),
    });
  }

  async restore(id: string): Promise<void> {
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      deletedAt: deleteField(),
    });
  }
}

export const productRepository = new ProductRepository();
