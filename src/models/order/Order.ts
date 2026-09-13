import type { Timestamp } from "firebase/firestore";
import type { OrderItem } from "./OrderItem";
import type { OrderStatus } from "./OrderStatus";

export interface Order {
  id: string;
  shopId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  invoiceUrl?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
