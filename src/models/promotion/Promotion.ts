import type { Timestamp } from "firebase/firestore";

export interface Promotion {
  id: string;
  shopId: string;
  title: string;
  type: "percentage" | "fixed";
  value: number;
  targetType: "product" | "category" | "all";
  targetId?: string;
  code?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
}
