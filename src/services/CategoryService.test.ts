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
      remove: jest.fn(),
    };
    service = new CategoryService(categories);
  });

  it("lists categories for a shop", async () => {
    const category: Category = {
      id: "c1",
      shopId: "shop-1",
      name: "Mode",
      createdAt: {} as Timestamp,
    };
    categories.listByShop.mockResolvedValue([category]);

    const result = await service.listCategories("shop-1");

    expect(categories.listByShop).toHaveBeenCalledWith("shop-1");
    expect(result).toEqual([category]);
  });

  it("creates a category with a trimmed name", async () => {
    await service.createCategory("shop-1", "  Mode  ");

    expect(categories.create).toHaveBeenCalledWith({
      shopId: "shop-1",
      name: "Mode",
    });
  });

  it("deletes a category by id", async () => {
    await service.deleteCategory("c1");
    expect(categories.remove).toHaveBeenCalledWith("c1");
  });
});
