import type { Timestamp } from "firebase/firestore";

// See ProductService.test.ts: avoids loading the real Firebase SDK via the
// repository's transitive "@/lib/firebase" import.
jest.mock("../lib/firebase", () => ({
  db: {},
}));

import { CategoryService } from "@/services/CategoryService";
import type { ICategoryRepository } from "@/repositories/interfaces/ICategoryRepository";
import type { Category } from "@/models/category/Category";

describe("CategoryService", () => {
  let categories: jest.Mocked<ICategoryRepository>;
  let service: CategoryService;

  beforeEach(() => {
    categories = {
      listByShop: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    service = new CategoryService(categories);
  });

  it("lists categories for a shop", async () => {
    const category: Category = {
      id: "c1",
      shopId: "shop-1",
      name: "Mode",
      description: "Vêtements",
      isActive: true,
      createdAt: {} as Timestamp,
    };
    categories.listByShop.mockResolvedValue([category]);

    const result = await service.listCategories("shop-1");

    expect(categories.listByShop).toHaveBeenCalledWith("shop-1");
    expect(result).toEqual([category]);
  });

  it("creates a category with trimmed name/description", async () => {
    await service.createCategory("shop-1", {
      name: "  Mode  ",
      description: "  Vêtements  ",
      isActive: true,
    });

    expect(categories.create).toHaveBeenCalledWith({
      shopId: "shop-1",
      name: "Mode",
      description: "Vêtements",
      isActive: true,
    });
  });

  it("updates a category", async () => {
    await service.updateCategory("c1", { name: "Nouveau nom" });
    expect(categories.update).toHaveBeenCalledWith("c1", {
      name: "Nouveau nom",
    });
  });

  it("toggles active state", async () => {
    await service.setCategoryActive("c1", false);
    expect(categories.update).toHaveBeenCalledWith("c1", { isActive: false });
  });

  it("deletes a category by id", async () => {
    await service.deleteCategory("c1");
    expect(categories.remove).toHaveBeenCalledWith("c1");
  });
});
