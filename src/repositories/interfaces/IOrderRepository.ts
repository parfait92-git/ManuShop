import type { Order } from "@/models/order/Order";

/**
 * Lecture seule, volontairement : contrairement à `IProductRepository`/
 * `ICategoryRepository`, il n'y a pas de `create`/`update` ici. Toute
 * mutation d'une commande (création, changement de statut) doit rester
 * atomique avec l'ajustement de stock associé (BF-96) et revérifier
 * l'autorisation (client propriétaire vs commerçant de la boutique) — ça
 * passe donc par `src/server/actions/orderActions.ts` (`firebase-admin`,
 * `db.batch()`), jamais par une écriture directe du SDK client. `firestore.
 * rules` verrouille `orders` en écriture pour cette raison (comme
 * `platformAdmins`).
 */
export interface IOrderRepository {
  getById(id: string): Promise<Order | null>;
  listByShop(shopId: string): Promise<Order[]>;
  listByClient(clientId: string): Promise<Order[]>;
}
