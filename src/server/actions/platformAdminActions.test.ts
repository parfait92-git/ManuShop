jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const updateMock = jest.fn();
const docMock = jest.fn(() => ({ update: updateMock }));
const getMock = jest.fn();
const collectionMock = jest.fn(() => ({ doc: docMock, get: getMock }));

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  grantAdminAction,
  revokeAdminAction,
  searchUsersAction,
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
});
