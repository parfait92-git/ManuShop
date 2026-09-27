jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const arrayUnionMock = jest.fn((v: unknown) => ({ __op: "arrayUnion", v }));
const arrayRemoveMock = jest.fn((v: unknown) => ({ __op: "arrayRemove", v }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    arrayUnion: (v: unknown) => arrayUnionMock(v),
    arrayRemove: (v: unknown) => arrayRemoveMock(v),
  },
}));

// Collection "users" — inchangé (grant/revoke/search), `get` sur le doc
// ajouté pour `listMerchantsAction` (profil du propriétaire d'une boutique).
const updateMock = jest.fn();
const userDocGetMock = jest.fn();
const docMock = jest.fn(() => ({ update: updateMock, get: userDocGetMock }));
const getMock = jest.fn();

// Collection "shops" — nouveau, pour `listMerchantsAction`/
// `setShopPremiumFeatureAction`.
const shopsGetMock = jest.fn();
const shopsUpdateMock = jest.fn();
const shopsDocMock = jest.fn(() => ({ update: shopsUpdateMock }));

const collectionMock = jest.fn((name: string) => {
  if (name === "shops") return { doc: shopsDocMock, get: shopsGetMock };
  return { doc: docMock, get: getMock };
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  grantAdminAction,
  listMerchantsAction,
  revokeAdminAction,
  searchUsersAction,
  setShopPremiumFeatureAction,
} from "@/server/actions/platformAdminActions";
import { ForbiddenError } from "@/server/errors";

const requireSuperAdminMock = requireSuperAdmin as jest.Mock;

function fakeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("platformAdminActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSuperAdminMock.mockResolvedValue({ uid: "admin-1", email: "a@b.com" });
  });

  describe("grantAdminAction", () => {
    it("re-verifies Super Admin privilege before writing", async () => {
      await grantAdminAction("token", "u1");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("users");
      expect(docMock).toHaveBeenCalledWith("u1");
      expect(updateMock).toHaveBeenCalledWith({
        role: "admin",
        adminSource: "manual",
      });
    });

    it("never writes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(grantAdminAction("token", "u1")).rejects.toThrow(
        ForbiddenError
      );
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe("revokeAdminAction", () => {
    it("sets role back to client", async () => {
      await revokeAdminAction("token", "u1");
      expect(updateMock).toHaveBeenCalledWith({ role: "client" });
    });
  });

  describe("searchUsersAction", () => {
    it("returns nothing for an empty term without reading Firestore", async () => {
      expect(await searchUsersAction("token", "  ")).toEqual([]);
      expect(getMock).not.toHaveBeenCalled();
    });

    it("filters by display name, email or phone, converting Timestamps to ISO strings", async () => {
      getMock.mockResolvedValue({
        docs: [
          fakeDoc("u1", {
            displayName: "Ada Diallo",
            email: "ada@example.com",
            role: "client",
            createdAt: { toDate: () => new Date("2026-01-01T00:00:00.000Z") },
          }),
          fakeDoc("u2", {
            displayName: "Moussa Ba",
            email: "moussa@example.com",
            phone: "+237600000000",
            role: "client",
            createdAt: { toDate: () => new Date("2026-01-02T00:00:00.000Z") },
          }),
        ],
      });

      const result = await searchUsersAction("token", "ada");

      expect(result).toEqual([
        expect.objectContaining({
          id: "u1",
          displayName: "Ada Diallo",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ]);
    });
  });

  describe("listMerchantsAction", () => {
    it("groups shops by owner and joins the owner's profile", async () => {
      shopsGetMock.mockResolvedValue({
        docs: [
          fakeDoc("shop1", {
            ownerId: "u1",
            name: "Boutique 1",
            isPublished: true,
            premiumFeatures: ["visitStats"],
          }),
          fakeDoc("shop2", {
            ownerId: "u1",
            name: "Boutique 2",
            isPublished: false,
          }),
        ],
      });
      userDocGetMock.mockResolvedValue({
        data: () => ({ displayName: "Ada Diallo", email: "ada@example.com" }),
      });

      const result = await listMerchantsAction("token");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("shops");
      expect(docMock).toHaveBeenCalledWith("u1");
      expect(result).toEqual([
        {
          ownerId: "u1",
          displayName: "Ada Diallo",
          email: "ada@example.com",
          shops: [
            {
              id: "shop1",
              name: "Boutique 1",
              isPublished: true,
              premiumFeatures: ["visitStats"],
            },
            {
              id: "shop2",
              name: "Boutique 2",
              isPublished: false,
              premiumFeatures: [],
            },
          ],
        },
      ]);
    });

    it("falls back to 'Compte supprimé' when the owner profile is missing", async () => {
      shopsGetMock.mockResolvedValue({
        docs: [
          fakeDoc("shop1", { ownerId: "ghost", name: "Boutique fantôme", isPublished: true }),
        ],
      });
      userDocGetMock.mockResolvedValue({ data: () => undefined });

      const result = await listMerchantsAction("token");

      expect(result).toEqual([
        {
          ownerId: "ghost",
          displayName: "Compte supprimé",
          email: undefined,
          shops: [
            {
              id: "shop1",
              name: "Boutique fantôme",
              isPublished: true,
              premiumFeatures: [],
            },
          ],
        },
      ]);
    });

    it("never reads Firestore when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(listMerchantsAction("token")).rejects.toThrow(ForbiddenError);
      expect(shopsGetMock).not.toHaveBeenCalled();
    });
  });

  describe("setShopPremiumFeatureAction", () => {
    it("re-verifies Super Admin privilege before writing", async () => {
      await setShopPremiumFeatureAction("token", "shop1", "visitStats", true);
      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("shops");
      expect(shopsDocMock).toHaveBeenCalledWith("shop1");
    });

    it("uses arrayUnion when enabling a feature", async () => {
      await setShopPremiumFeatureAction("token", "shop1", "visitStats", true);
      expect(arrayUnionMock).toHaveBeenCalledWith("visitStats");
      expect(shopsUpdateMock).toHaveBeenCalledWith({
        premiumFeatures: { __op: "arrayUnion", v: "visitStats" },
      });
    });

    it("uses arrayRemove when disabling a feature", async () => {
      await setShopPremiumFeatureAction("token", "shop1", "visitStats", false);
      expect(arrayRemoveMock).toHaveBeenCalledWith("visitStats");
      expect(shopsUpdateMock).toHaveBeenCalledWith({
        premiumFeatures: { __op: "arrayRemove", v: "visitStats" },
      });
    });

    it("never writes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(
        setShopPremiumFeatureAction("token", "shop1", "visitStats", true)
      ).rejects.toThrow(ForbiddenError);
      expect(shopsUpdateMock).not.toHaveBeenCalled();
    });
  });
});
