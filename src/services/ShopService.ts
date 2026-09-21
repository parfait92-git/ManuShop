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

  updateProfile(shopId: string, data: UpdateShopDto): Promise<void> {
    return this.shops.update(shopId, data);
  }
}

export const shopService = new ShopService();
