import {
  collection,
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
import type { User } from "@/models/user/User";
import type {
  CreateUserDto,
  IUserRepository,
  UpdateUserDto,
} from "@/repositories/interfaces/IUserRepository";

const USERS_COLLECTION = "users";

export class UserRepository implements IUserRepository {
  async getById(id: string): Promise<User | null> {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, id));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as User;
  }

  async create(id: string, data: CreateUserDto): Promise<User> {
    const ref = doc(db, USERS_COLLECTION, id);
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
    const created = await this.getById(id);
    if (!created) {
      throw new Error("Échec de la création du profil utilisateur.");
    }
    return created;
  }

  async update(id: string, data: UpdateUserDto): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, id), data);
  }

  async listByShop(shopId: string): Promise<User[]> {
    const snapshot = await getDocs(
      query(collection(db, USERS_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
  }
}

export const userRepository = new UserRepository();
