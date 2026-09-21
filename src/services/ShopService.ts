import type { Shop } from "@/models/shop/Shop";
import { shopRepository } from "@/repositories/ShopRepository";
import type {
  IShopRepository,
  UpdateShopDto,
} from "@/repositories/interfaces/IShopRepository";

export class ShopService {
  constructor(private readonly shops: IShopRepository = shopRepository) {}

  getShop(shopId: string): Promise<Shop | null> {
    return this.shops.getById(shopId);
  }

  /** Résout "la" boutique pour la vitrine publique (le projet est
   * mono-tenant pour l'instant : un déploiement = une boutique). */
  getPrimaryShop(): Promise<Shop | null> {
    return this.shops.getFirst();
  }

  updateProfile(shopId: string, data: UpdateShopDto): Promise<void> {
    return this.shops.update(shopId, data);
  }
}

export const shopService = new ShopService();
