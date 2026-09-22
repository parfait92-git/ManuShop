import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  shopId: string;
  name: string;
  // Optionnels pour la lecture : les catégories créées avant l'ajout de ces
  // champs n'en disposent pas encore dans Firestore.
  description?: string;
  isActive?: boolean;
  createdAt: Timestamp;
}
