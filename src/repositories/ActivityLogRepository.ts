import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { ActivityLogEntry } from "@/models/activity/ActivityLogEntry";
import type {
  CreateActivityLogDto,
  IActivityLogRepository,
} from "@/repositories/interfaces/IActivityLogRepository";

const ACTIVITY_LOG_COLLECTION = "activityLog";

export class ActivityLogRepository implements IActivityLogRepository {
  async listByShop(shopId: string): Promise<ActivityLogEntry[]> {
    const snapshot = await getDocs(
      query(
        collection(db, ACTIVITY_LOG_COLLECTION),
        where("shopId", "==", shopId)
      )
    );
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ActivityLogEntry
    );
  }

  async create(data: CreateActivityLogDto): Promise<ActivityLogEntry> {
    const ref = doc(collection(db, ACTIVITY_LOG_COLLECTION));
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
    const snapshot = await getDoc(ref);
    return { id: snapshot.id, ...snapshot.data() } as ActivityLogEntry;
  }
}

export const activityLogRepository = new ActivityLogRepository();
