jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const serverTimestampMock = jest.fn(() => "SERVER_TIMESTAMP");
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => serverTimestampMock(),
  },
}));

const setMock = jest.fn();
const updateMock = jest.fn();
const deleteMock = jest.fn();
const docMock = jest.fn(() => ({
  id: "tag1",
  set: setMock,
  update: updateMock,
  delete: deleteMock,
}));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  createCategoryTagAction,
  deleteCategoryTagAction,
  updateCategoryTagAction,
} from "@/server/actions/categoryTagActions";
import { ForbiddenError, ValidationError } from "@/server/errors";

const requireSuperAdminMock = requireSuperAdmin as jest.Mock;

describe("categoryTagActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSuperAdminMock.mockResolvedValue({ uid: "admin-1", email: "a@b.com" });
  });

  describe("createCategoryTagAction", () => {
    it("re-verifies Super Admin privilege before writing", async () => {
      const result = await createCategoryTagAction("token", "Promo", "#2563eb");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("categoryTags");
      expect(setMock).toHaveBeenCalledWith({
        name: "Promo",
        color: "#2563eb",
        createdAt: "SERVER_TIMESTAMP",
      });
      expect(result).toEqual({ id: "tag1" });
    });

    it("trims the name before validating and writing", async () => {
      await createCategoryTagAction("token", "  Promo  ", "#2563eb");
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Promo" })
      );
    });

    it("rejects an empty name", async () => {
      await expect(createCategoryTagAction("token", "   ", "#2563eb")).rejects.toThrow(
        ValidationError
      );
      expect(setMock).not.toHaveBeenCalled();
    });

    it("rejects an invalid hex color", async () => {
      await expect(createCategoryTagAction("token", "Promo", "bleu")).rejects.toThrow(
        ValidationError
      );
      await expect(createCategoryTagAction("token", "Promo", "#2563e")).rejects.toThrow(
        ValidationError
      );
      expect(setMock).not.toHaveBeenCalled();
    });

    it("never writes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(
        createCategoryTagAction("token", "Promo", "#2563eb")
      ).rejects.toThrow(ForbiddenError);
      expect(setMock).not.toHaveBeenCalled();
    });
  });

  describe("updateCategoryTagAction", () => {
    it("re-verifies Super Admin privilege before writing", async () => {
      await updateCategoryTagAction("token", "tag1", "Promo", "#2563eb");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("categoryTags");
      expect(docMock).toHaveBeenCalledWith("tag1");
      expect(updateMock).toHaveBeenCalledWith({
        name: "Promo",
        color: "#2563eb",
      });
    });

    it("trims the name before validating and writing", async () => {
      await updateCategoryTagAction("token", "tag1", "  Promo  ", "#2563eb");
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Promo" })
      );
    });

    it("rejects an empty name", async () => {
      await expect(
        updateCategoryTagAction("token", "tag1", "   ", "#2563eb")
      ).rejects.toThrow(ValidationError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("rejects an invalid hex color", async () => {
      await expect(
        updateCategoryTagAction("token", "tag1", "Promo", "bleu")
      ).rejects.toThrow(ValidationError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("never writes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(
        updateCategoryTagAction("token", "tag1", "Promo", "#2563eb")
      ).rejects.toThrow(ForbiddenError);
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe("deleteCategoryTagAction", () => {
    it("re-verifies Super Admin privilege before deleting", async () => {
      await deleteCategoryTagAction("token", "tag1");
      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("categoryTags");
      expect(docMock).toHaveBeenCalledWith("tag1");
      expect(deleteMock).toHaveBeenCalled();
    });

    it("never deletes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(deleteCategoryTagAction("token", "tag1")).rejects.toThrow(
        ForbiddenError
      );
      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});
