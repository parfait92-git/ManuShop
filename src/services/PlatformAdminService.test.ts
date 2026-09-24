jest.mock("../lib/firebase", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const grantAdminAction = jest.fn();
const revokeAdminAction = jest.fn();
const searchUsersAction = jest.fn();

jest.mock("../server/actions/platformAdminActions", () => ({
  grantAdminAction: (...args: unknown[]) => grantAdminAction(...args),
  revokeAdminAction: (...args: unknown[]) => revokeAdminAction(...args),
  searchUsersAction: (...args: unknown[]) => searchUsersAction(...args),
}));

import { PlatformAdminService } from "@/services/PlatformAdminService";
import type { IPlatformAdminRepository } from "@/repositories/interfaces/IPlatformAdminRepository";
import type { SearchedUserDto } from "@/server/actions/platformAdminActions";

function fakeUserDto(overrides: Partial<SearchedUserDto> = {}): SearchedUserDto {
  return {
    id: "u1",
    displayName: "Ada Diallo",
    email: "ada@example.com",
    role: "client",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("PlatformAdminService", () => {
  let platformAdmins: jest.Mocked<IPlatformAdminRepository>;
  let service: PlatformAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    platformAdmins = { exists: jest.fn() };
    service = new PlatformAdminService(platformAdmins);
  });

  describe("isSuperAdmin", () => {
    it("checks the platformAdmins collection for the given email", async () => {
      platformAdmins.exists.mockResolvedValue(true);
      expect(await service.isSuperAdmin("a@b.com")).toBe(true);
      expect(platformAdmins.exists).toHaveBeenCalledWith("a@b.com");
    });

    it("returns false without checking when there is no email (phone/anonymous accounts)", async () => {
      expect(await service.isSuperAdmin(null)).toBe(false);
      expect(await service.isSuperAdmin(undefined)).toBe(false);
      expect(platformAdmins.exists).not.toHaveBeenCalled();
    });
  });

  describe("searchUsers", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      const ada = fakeUserDto();
      searchUsersAction.mockResolvedValue([ada]);

      const result = await service.searchUsers("ada");

      expect(searchUsersAction).toHaveBeenCalledWith("token-1", "ada");
      expect(result).toEqual([
        expect.objectContaining({ id: "u1", displayName: "Ada Diallo" }),
      ]);
    });

    it("reconstructs a Firestore Timestamp from the DTO's ISO string", async () => {
      searchUsersAction.mockResolvedValue([fakeUserDto()]);

      const [user] = await service.searchUsers("ada");

      expect(user.createdAt.toDate().toISOString()).toBe(
        "2026-01-01T00:00:00.000Z"
      );
    });
  });

  describe("grantAdmin", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      await service.grantAdmin("u1");
      expect(grantAdminAction).toHaveBeenCalledWith("token-1", "u1");
    });
  });

  describe("revokeAdmin", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      await service.revokeAdmin("u1");
      expect(revokeAdminAction).toHaveBeenCalledWith("token-1", "u1");
    });
  });
});
