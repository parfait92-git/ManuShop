import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./UserRole";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  shopId?: string;
  displayName: string;
  phone?: string;
  createdAt: Timestamp;
}
