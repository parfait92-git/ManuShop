import type { Timestamp } from "firebase/firestore";

export interface Shop {
  id: string;
  name: string;
  logo: string;
  address: string;
  phone: string;
  whatsapp: string;
  currency: "XAF";
  ownerId: string;
  createdAt: Timestamp;
}
