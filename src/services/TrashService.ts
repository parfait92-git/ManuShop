import type { Timestamp } from "firebase/firestore";

import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { categoryRepository } from "@/repositories/CategoryRepository";
import { productRepository } from "@/repositories/ProductRepository";

interface Trashable {
  id: string;
  deletedAt?: Timestamp;
}

/** Forme minimale partagée par `IProductRepository`/`ICategoryRepository`
 * (et toute future entité qui adopte la corbeille) — voir
 * 04-besoins-techniques.md §12.4. */
export interface ITrashRepository<T> {
  listByShop(shopId: string): Promise<T[]>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Corbeille générique (BF-99/100), paramétrée par repository plutôt qu'un
 * service dédié par entité — évite de dupliquer la logique de
 * restauration/purge à chaque nouvelle entité qui l'adopte. */
export class TrashService<T extends Trashable> {
  constructor(private readonly repo: ITrashRepository<T>) {}

  async listTrashed(shopId: string): Promise<T[]> {
    const items = await this.repo.listByShop(shopId);
    return items.filter((item) => !!item.deletedAt);
  }

  softDelete(id: string): Promise<void> {
    return this.repo.softDelete(id);
  }

  restore(id: string): Promise<void> {
    return this.repo.restore(id);
  }

  /** Suppression définitive (BF-100), après le compte à rebours annulable
   * géré côté UI — un vrai `delete()` Firestore. */
  purge(id: string): Promise<void> {
    return this.repo.remove(id);
  }
}

export const productTrashService = new TrashService<Product>(productRepository);
export const categoryTrashService = new TrashService<Category>(categoryRepository);
