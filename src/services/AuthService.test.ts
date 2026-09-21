import type { Timestamp } from "firebase/firestore";

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

const secondaryAuthInstance = { __tag: "secondary" };

// `jest.mock` resolves its module argument through Jest's own resolver, not
// through the SWC alias rewrite `next/jest` applies to real `import`
// statements — so the `@/...` alias must be spelled out relative here.
jest.mock("../lib/firebase", () => ({
  auth: { __tag: "primary" },
  getSecondaryAuth: jest.fn(() => secondaryAuthInstance),
}));

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../lib/firebase";
import { AuthService } from "@/services/AuthService";
import type {
  CreateUserDto,
  IUserRepository,
} from "@/repositories/interfaces/IUserRepository";
import type {
  CreateShopDto,
  IShopRepository,
} from "@/repositories/interfaces/IShopRepository";
import type { User } from "@/models/user/User";
import type { Shop } from "@/models/shop/Shop";

const createUserWithEmailAndPasswordMock =
  createUserWithEmailAndPassword as jest.Mock;
const sendPasswordResetEmailMock = sendPasswordResetEmail as jest.Mock;
const signInWithEmailAndPasswordMock = signInWithEmailAndPassword as jest.Mock;
const signOutMock = signOut as jest.Mock;

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "uid-1",
    email: "a@b.com",
    role: "admin",
    displayName: "Ada",
    createdAt: {} as Timestamp,
    ...overrides,
  };
}

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Ada Boutique",
    logo: "",
    address: "",
    phone: "",
    whatsapp: "",
    currency: "XAF",
    ownerId: "uid-1",
    createdAt: {} as Timestamp,
    ...overrides,
  };
}

describe("AuthService", () => {
  let users: jest.Mocked<IUserRepository>;
  let shops: jest.Mocked<IShopRepository>;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    users = {
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      listByShop: jest.fn(),
    };
    shops = {
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new AuthService(users, shops);
  });

  describe("registerShopOwner", () => {
    it("creates the Firebase account, the admin profile, then the shop, in that order", async () => {
      createUserWithEmailAndPasswordMock.mockResolvedValue({
        user: { uid: "uid-1" },
      });
      users.create.mockResolvedValue(fakeUser());
      shops.create.mockResolvedValue(fakeShop());

      const result = await service.registerShopOwner({
        displayName: "Ada",
        shopName: "Ada Boutique",
        email: "a@b.com",
        password: "azerty12",
      });

      expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
        auth,
        "a@b.com",
        "azerty12"
      );

      // The user profile must exist before the shop: Firestore rules check
      // the admin role via users/{uid} to authorize the shops/{id} write.
      const userCreateOrder =
        users.create.mock.invocationCallOrder[0];
      const shopCreateOrder =
        shops.create.mock.invocationCallOrder[0];
      expect(userCreateOrder).toBeLessThan(shopCreateOrder);

      expect(users.create).toHaveBeenCalledWith("uid-1", {
        email: "a@b.com",
        displayName: "Ada",
        role: "admin",
      } satisfies CreateUserDto);

      expect(shops.create).toHaveBeenCalledWith({
        name: "Ada Boutique",
        logo: "",
        address: "",
        phone: "",
        whatsapp: "",
        currency: "XAF",
        ownerId: "uid-1",
      } satisfies CreateShopDto);

      expect(users.update).toHaveBeenCalledWith("uid-1", { shopId: "shop-1" });
      expect(result.shopId).toBe("shop-1");
    });
  });

  describe("inviteSeller", () => {
    it("creates the account on the secondary auth instance so the admin's session is unaffected", async () => {
      createUserWithEmailAndPasswordMock.mockResolvedValue({
        user: { uid: "uid-2" },
      });
      users.create.mockResolvedValue(
        fakeUser({ id: "uid-2", role: "seller", shopId: "shop-1" })
      );

      const seller = await service.inviteSeller({
        displayName: "Moussa",
        email: "moussa@example.com",
        shopId: "shop-1",
      });

      expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
        secondaryAuthInstance,
        "moussa@example.com",
        expect.any(String)
      );
      expect(createUserWithEmailAndPasswordMock.mock.calls[0][0]).not.toBe(
        auth
      );

      expect(users.create).toHaveBeenCalledWith("uid-2", {
        email: "moussa@example.com",
        displayName: "Moussa",
        role: "seller",
        shopId: "shop-1",
      } satisfies CreateUserDto);

      // The reset email is sent from the primary auth instance — it doesn't
      // need an active session for the target email.
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
        auth,
        "moussa@example.com"
      );

      expect(signOutMock).toHaveBeenCalledWith(secondaryAuthInstance);
      expect(seller.role).toBe("seller");
    });

    it("still signs out of the secondary auth instance if the Firestore write fails", async () => {
      createUserWithEmailAndPasswordMock.mockResolvedValue({
        user: { uid: "uid-2" },
      });
      users.create.mockRejectedValue(new Error("boom"));

      await expect(
        service.inviteSeller({
          displayName: "Moussa",
          email: "moussa@example.com",
          shopId: "shop-1",
        })
      ).rejects.toThrow("boom");

      expect(signOutMock).toHaveBeenCalledWith(secondaryAuthInstance);
    });
  });

  describe("listTeamMembers", () => {
    it("delegates to the user repository", async () => {
      users.listByShop.mockResolvedValue([fakeUser()]);

      const result = await service.listTeamMembers("shop-1");

      expect(users.listByShop).toHaveBeenCalledWith("shop-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("login", () => {
    it("signs in with the primary auth instance", async () => {
      signInWithEmailAndPasswordMock.mockResolvedValue({
        user: { uid: "uid-1" },
      });

      const user = await service.login("a@b.com", "pw");

      expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(
        auth,
        "a@b.com",
        "pw"
      );
      expect(user.uid).toBe("uid-1");
    });
  });

  describe("logout", () => {
    it("signs out of the primary auth instance", async () => {
      await service.logout();
      expect(signOutMock).toHaveBeenCalledWith(auth);
    });
  });

  describe("sendPasswordReset", () => {
    it("sends the reset email via the primary auth instance", async () => {
      await service.sendPasswordReset("a@b.com");
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(auth, "a@b.com");
    });
  });

  describe("getUserProfile", () => {
    it("delegates to the user repository", async () => {
      users.getById.mockResolvedValue(fakeUser());
      const user = await service.getUserProfile("uid-1");
      expect(users.getById).toHaveBeenCalledWith("uid-1");
      expect(user?.id).toBe("uid-1");
    });
  });
});
