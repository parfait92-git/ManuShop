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
  // Absent/true = visible côté client (BF-90). Contrairement à
  // `Shop.isPublished` (absent = non publiée), absent est traité comme
  // publié ici pour ne pas faire disparaître rétroactivement les produits
  // déjà en ligne créés avant l'ajout de ce champ.
  isPublished?: boolean;
  // Corbeille générique (BF-99/100, 04-besoins-techniques.md §12.4) : une
  // "suppression" pose ce champ plutôt qu'un vrai delete Firestore.
  deletedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
