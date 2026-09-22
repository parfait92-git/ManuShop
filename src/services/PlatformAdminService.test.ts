import type { Timestamp } from "firebase/firestore";

jest.mock("../lib/firebase", () => ({ db: {} }));

import { PlatformAdminService } from "@/services/PlatformAdminService";
import type { IPlatformAdminRepository } from "@/repositories/interfaces/IPlatformAdminRepository";
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository";
import type { User } from "@/models/user/User";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    displayName: "Ada Diallo",
    email: "ada@example.com",
    role: "client",
    createdAt: {} as Timestamp,
    ...overrides,
  };
}

describe("PlatformAdminService", () => {
  let platformAdmins: jest.Mocked<IPlatformAdminRepository>;
  let users: jest.Mocked<IUserRepository>;
  let service: PlatformAdminService;

  beforeEach(() => {
    platformAdmins = { exists: jest.fn() };
    users = {
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      listByShop: jest.fn(),
      listAll: jest.fn(),
    };
    service = new PlatformAdminService(platformAdmins, users);
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
    const ada = fakeUser({ id: "u1", displayName: "Ada Diallo", email: "ada@example.com" });
    const moussa = fakeUser({
      id: "u2",
      displayName: "Moussa Ba",
      email: "moussa@example.com",
      phone: "+237600000000",
    });

    beforeEach(() => {
      users.listAll.mockResolvedValue([ada, moussa]);
    });

    it("returns nothing for an empty term without fetching", async () => {
      expect(await service.searchUsers("  ")).toEqual([]);
      expect(users.listAll).not.toHaveBeenCalled();
    });

    it("matches by display name, case-insensitively", async () => {
      expect(await service.searchUsers("ada")).toEqual([ada]);
    });

    it("matches by email", async () => {
      expect(await service.searchUsers("moussa@example.com")).toEqual([moussa]);
    });

    it("matches by phone", async () => {
      expect(await service.searchUsers("600000000")).toEqual([moussa]);
    });
  });

  describe("grantAdmin", () => {
    it("sets role admin with a manual source", async () => {
      await service.grantAdmin("u1");
      expect(users.update).toHaveBeenCalledWith("u1", {
        role: "admin",
        adminSource: "manual",
      });
    });
  });

  describe("revokeAdmin", () => {
    it("sets role back to client", async () => {
      await service.revokeAdmin("u1");
      expect(users.update).toHaveBeenCalledWith("u1", { role: "client" });
    });
  });
});
