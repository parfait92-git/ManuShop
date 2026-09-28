import { Timestamp } from "firebase/firestore";

jest.mock("../lib/firebase", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const createCategoryTagAction = jest.fn();
const updateCategoryTagAction = jest.fn();
const deleteCategoryTagAction = jest.fn();

jest.mock("../server/actions/categoryTagActions", () => ({
  createCategoryTagAction: (...args: unknown[]) =>
    createCategoryTagAction(...args),
  updateCategoryTagAction: (...args: unknown[]) =>
    updateCategoryTagAction(...args),
  deleteCategoryTagAction: (...args: unknown[]) =>
    deleteCategoryTagAction(...args),
}));

import { CategoryTagService } from "@/services/CategoryTagService";
import type { ICategoryTagRepository } from "@/repositories/interfaces/ICategoryTagRepository";

describe("CategoryTagService", () => {
  let categoryTags: jest.Mocked<ICategoryTagRepository>;
  let service: CategoryTagService;

  beforeEach(() => {
    jest.clearAllMocks();
    categoryTags = { listAll: jest.fn() };
    service = new CategoryTagService(categoryTags);
  });

  describe("listTags", () => {
    it("delegates to the repository", async () => {
      const tags = [
        { id: "t1", name: "Promo", color: "#2563eb", createdAt: Timestamp.now() },
      ];
      categoryTags.listAll.mockResolvedValue(tags);

      const result = await service.listTags();

      expect(categoryTags.listAll).toHaveBeenCalled();
      expect(result).toBe(tags);
    });
  });

  describe("createTag", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      createCategoryTagAction.mockResolvedValue({ id: "t1" });

      const result = await service.createTag("Promo", "#2563eb");

      expect(createCategoryTagAction).toHaveBeenCalledWith(
        "token-1",
        "Promo",
        "#2563eb"
      );
      expect(result).toEqual({ id: "t1" });
    });
  });

  describe("updateTag", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      await service.updateTag("t1", "Promo", "#2563eb");
      expect(updateCategoryTagAction).toHaveBeenCalledWith(
        "token-1",
        "t1",
        "Promo",
        "#2563eb"
      );
    });
  });

  describe("deleteTag", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      await service.deleteTag("t1");
      expect(deleteCategoryTagAction).toHaveBeenCalledWith("token-1", "t1");
    });
  });
});
