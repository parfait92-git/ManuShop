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
import type { ProductCost } from "@/models/product/ProductCost";
import type { IProductCostRepository } from "@/repositories/interfaces/IProductCostRepository";

const PRODUCT_COSTS_COLLECTION = "productCosts";

export class ProductCostRepository implements IProductCostRepository {
  async get(productId: string): Promise<ProductCost | null> {
    const snapshot = await getDoc(doc(db, PRODUCT_COSTS_COLLECTION, productId));
    return snapshot.exists()
      ? ({ productId: snapshot.id, ...snapshot.data() } as ProductCost)
      : null;
  }

  async listByShop(shopId: string): Promise<ProductCost[]> {
    const snapshot = await getDocs(
      query(collection(db, PRODUCT_COSTS_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => ({ productId: d.id, ...d.data() }) as ProductCost);
  }

  async set(productId: string, shopId: string, purchasePrice: number): Promise<void> {
    await setDoc(doc(db, PRODUCT_COSTS_COLLECTION, productId), {
      shopId,
      purchasePrice,
      updatedAt: serverTimestamp(),
    });
  }

  async remove(productId: string): Promise<void> {
    await deleteDoc(doc(db, PRODUCT_COSTS_COLLECTION, productId));
  }
}

export const productCostRepository = new ProductCostRepository();
