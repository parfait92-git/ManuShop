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

export interface ProductVariant {
  id: string;
  label: string;
  stock: number;
  priceOverride?: number;
}

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

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus = "pending" | "confirmed" | "delivering" | "delivered" | "cancelled";

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

export type PublishingChannel = "whatsapp" | "facebook" | "instagram" | "tiktok";

export interface PublishResult {
  channel: PublishingChannel;
  success: boolean;
  message?: string;
}

export interface Publication {
  id: string;
  shopId: string;
  content: string;
  imageUrl: string;
  channels: PublishingChannel[];
  scheduledAt?: Timestamp;
  publishedAt?: Timestamp;
  status: "draft" | "scheduled" | "published" | "failed";
  results: PublishResult[];
}

export type UserRole = "admin" | "seller" | "client";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  shopId?: string;
  displayName: string;
  phone?: string;
  createdAt: Timestamp;
}
