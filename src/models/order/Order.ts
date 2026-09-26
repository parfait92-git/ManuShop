import type { Timestamp } from "firebase/firestore";
import type { OrderItem } from "./OrderItem";
import type { OrderStatus } from "./OrderStatus";

export interface Order {
  id: string;
  shopId: string;
  // Absent pour une commande manuelle (BF-21, client physique sans compte) —
  // présent (uid du compte acheteur) pour une commande passée en ligne.
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  // Requis avant de passer à 'cancelled' (BF-23).
  cancelReason?: string;
  // Requis avant de passer à 'returned'/'defective' (BF-96/97).
  returnReason?: string;
  // Posé quand le stock des articles a été réincrémenté (annulation, retour,
  // défectueux) — voir `src/server/actions/orderActions.ts`.
  restockedAt?: Timestamp;
  invoiceUrl?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
