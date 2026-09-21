import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./UserRole";

export interface User {
  id: string;
  // Optional: a user who signed up via téléphone or anonymement has no
  // email, and one who signed up via email/Google/Facebook has no phone.
  email?: string;
  role: UserRole;
  shopId?: string;
  displayName: string;
  phone?: string;
  createdAt: Timestamp;
}
