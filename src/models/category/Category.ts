import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  shopId: string;
  name: string;
  createdAt: Timestamp;
}
