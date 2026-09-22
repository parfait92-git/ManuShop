import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { IPlatformAdminRepository } from "@/repositories/interfaces/IPlatformAdminRepository";

const PLATFORM_ADMINS_COLLECTION = "platformAdmins";

export class PlatformAdminRepository implements IPlatformAdminRepository {
  async exists(email: string): Promise<boolean> {
    const snapshot = await getDoc(
      doc(db, PLATFORM_ADMINS_COLLECTION, email.toLowerCase())
    );
    return snapshot.exists();
  }
}

export const platformAdminRepository = new PlatformAdminRepository();
