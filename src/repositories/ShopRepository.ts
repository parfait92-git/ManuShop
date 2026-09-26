import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Shop } from "@/models/shop/Shop";
import type {
  CreateShopDto,
  IShopRepository,
  UpdateShopDto,
} from "@/repositories/interfaces/IShopRepository";

const SHOPS_COLLECTION = "shops";

export class ShopRepository implements IShopRepository {
  async getById(id: string): Promise<Shop | null> {
    const snapshot = await getDoc(doc(db, SHOPS_COLLECTION, id));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Shop;
  }

  async getFirst(): Promise<Shop | null> {
    const snapshot = await getDocs(
      query(collection(db, SHOPS_COLLECTION), limit(1))
    );
    const [first] = snapshot.docs;
    return first ? ({ id: first.id, ...first.data() } as Shop) : null;
  }

  async listByOwner(ownerId: string): Promise<Shop[]> {
    const snapshot = await getDocs(
      query(collection(db, SHOPS_COLLECTION), where("ownerId", "==", ownerId))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop);
  }

  async listPublished(): Promise<Shop[]> {
    const snapshot = await getDocs(collection(db, SHOPS_COLLECTION));
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Shop)
      .filter((shop) => shop.isPublished === true);
  }

  async create(data: CreateShopDto): Promise<Shop> {
    const ref = doc(collection(db, SHOPS_COLLECTION));
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
    const created = await this.getById(ref.id);
    if (!created) {
      throw new Error("Échec de la création de la boutique.");
    }
    return created;
  }

  async update(id: string, data: UpdateShopDto): Promise<void> {
    await updateDoc(doc(db, SHOPS_COLLECTION, id), data);
  }
}

export const shopRepository = new ShopRepository();
