import type { Timestamp } from "firebase/firestore";

// See ProductService.test.ts: avoids loading the real Firebase SDK via the
// repository's transitive "@/lib/firebase" import.
jest.mock("../lib/firebase", () => ({
  db: {},
}));

import { ShopService } from "@/services/ShopService";
import type { IShopRepository } from "@/repositories/interfaces/IShopRepository";
import type { Shop } from "@/models/shop/Shop";

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Ada Boutique",
    logo: "",
    address: "",
    phone: "",
    whatsapp: "+237600000000",
    currency: "XAF",
    ownerId: "uid-1",
    createdAt: {} as Timestamp,
    ...overrides,
  };
}

describe("ShopService", () => {
  let shops: jest.Mocked<IShopRepository>;
  let service: ShopService;

  beforeEach(() => {
    shops = {
      getById: jest.fn(),
      getFirst: jest.fn(),
      listByOwner: jest.fn(),
      listPublished: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new ShopService(shops);
  });

  it("getShop delegates to the repository", async () => {
    shops.getById.mockResolvedValue(fakeShop());
    const shop = await service.getShop("shop-1");
    expect(shops.getById).toHaveBeenCalledWith("shop-1");
    expect(shop?.id).toBe("shop-1");
  });

  it("getPrimaryShop resolves the single-tenant shop", async () => {
    shops.getFirst.mockResolvedValue(fakeShop());
    const shop = await service.getPrimaryShop();
    expect(shops.getFirst).toHaveBeenCalled();
    expect(shop?.id).toBe("shop-1");
  });

  it("getPrimaryShop returns null when no shop exists yet", async () => {
    shops.getFirst.mockResolvedValue(null);
    expect(await service.getPrimaryShop()).toBeNull();
  });

  it("updateProfile delegates to the repository", async () => {
    await service.updateProfile("shop-1", { name: "Nouveau nom" });
    expect(shops.update).toHaveBeenCalledWith("shop-1", { name: "Nouveau nom" });
  });

  it("listMyShops delegates to the repository", async () => {
    shops.listByOwner.mockResolvedValue([fakeShop()]);
    const result = await service.listMyShops("uid-1");
    expect(shops.listByOwner).toHaveBeenCalledWith("uid-1");
    expect(result).toHaveLength(1);
  });

  it("listPublishedShops delegates to the repository", async () => {
    shops.listPublished.mockResolvedValue([fakeShop({ isPublished: true })]);
    const result = await service.listPublishedShops();
    expect(shops.listPublished).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
