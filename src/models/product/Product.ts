import type { Timestamp } from "firebase/firestore";
import type { ProductVariant } from "./ProductVariant";

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  stockThreshold: number;
  isPromo: boolean;
  promoPrice?: number;
  promoEnd?: Timestamp;
  variants?: ProductVariant[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
