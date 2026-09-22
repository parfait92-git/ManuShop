import type { Timestamp } from "firebase/firestore";

jest.mock("firebase/auth", () => ({
  browserLocalPersistence: "local",
  browserSessionPersistence: "session",
  createUserWithEmailAndPassword: jest.fn(),
  FacebookAuthProvider: jest.fn(function FacebookAuthProvider(this: object) {
    Object.assign(this, { __tag: "facebook-provider" });
  }),
  GoogleAuthProvider: jest.fn(function GoogleAuthProvider(this: object) {
    Object.assign(this, { __tag: "google-provider" });
  }),
  onAuthStateChanged: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  setPersistence: jest.fn(),
  signInAnonymously: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithPhoneNumber: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

const secondaryAuthInstance = { __tag: "secondary" };

// `jest.mock` resolves its module argument through Jest's own resolver, not
// through the SWC alias rewrite `next/jest` applies to real `import`
// statements — so the `@/...` alias must be spelled out relative here.
jest.mock("../lib/firebase", () => ({
  auth: { __tag: "primary", currentUser: null },
  getSecondaryAuth: jest.fn(() => secondaryAuthInstance),
}));

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
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
const setPersistenceMock = setPersistence as jest.Mock;
const signInAnonymouslyMock = signInAnonymously as jest.Mock;
const signInWithEmailAndPasswordMock = signInWithEmailAndPassword as jest.Mock;
const signInWithPhoneNumberMock = signInWithPhoneNumber as jest.Mock;
const signInWithPopupMock = signInWithPopup as jest.Mock;
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
    (auth as { currentUser: unknown }).currentUser = null;
    users = {
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      listByShop: jest.fn(),
      listAll: jest.fn(),
    };
    shops = {
      getById: jest.fn(),
      getFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new AuthService(users, shops);
  });

  describe("registerShopOwner", () => {
    it("creates the Firebase account and a client profile — never admin directly (Module 12)", async () => {
      createUserWithEmailAndPasswordMock.mockResolvedValue({
        user: { uid: "uid-1" },
      });
      users.create.mockResolvedValue(fakeUser({ role: "client" }));

      const result = await service.registerShopOwner({
        displayName: "Ada",
        email: "a@b.com",
        password: "azerty12",
      });

      expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
        auth,
        "a@b.com",
        "azerty12"
      );

      expect(users.create).toHaveBeenCalledWith("uid-1", {
        email: "a@b.com",
        displayName: "Ada",
        role: "client",
      } satisfies CreateUserDto);

      expect(shops.create).not.toHaveBeenCalled();
      expect(result.role).toBe("client");
    });
  });

  describe("createShop", () => {
    it("creates a shop for the current user and links it to their profile", async () => {
      (auth as { currentUser: unknown }).currentUser = { uid: "uid-1" };
      shops.create.mockResolvedValue(fakeShop());

      const shopId = await service.createShop("Ada Boutique");

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
      expect(shopId).toBe("shop-1");
    });

    it("rejects when no Firebase user is signed in", async () => {
      await expect(service.createShop("Ada Boutique")).rejects.toThrow(
        /connecté/
      );
      expect(shops.create).not.toHaveBeenCalled();
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

  describe("completeMerchantSignup", () => {
    it("creates a client profile for the currently signed-in Firebase user", async () => {
      (auth as { currentUser: unknown }).currentUser = {
        uid: "uid-3",
        email: null,
        phoneNumber: "+237600000000",
      };
      users.create.mockResolvedValue(
        fakeUser({
          id: "uid-3",
          email: undefined,
          phone: "+237600000000",
          role: "client",
        })
      );

      const result = await service.completeMerchantSignup({
        displayName: "Moussa",
      });

      // No email for a phone sign-up: the field must be omitted, not set to
      // `undefined` (Firestore rejects `undefined` field values).
      expect(users.create).toHaveBeenCalledWith("uid-3", {
        phone: "+237600000000",
        displayName: "Moussa",
        role: "client",
      });
      expect(shops.create).not.toHaveBeenCalled();
      expect(result.role).toBe("client");
    });

    it("rejects when no Firebase user is signed in", async () => {
      await expect(
        service.completeMerchantSignup({ displayName: "Moussa" })
      ).rejects.toThrow(/connecté/);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe("setRememberMe", () => {
    it("uses local persistence when true", async () => {
      await service.setRememberMe(true);
      expect(setPersistenceMock).toHaveBeenCalledWith(auth, "local");
    });

    it("uses session persistence when false", async () => {
      await service.setRememberMe(false);
      expect(setPersistenceMock).toHaveBeenCalledWith(auth, "session");
    });
  });

  describe("social and anonymous sign-in", () => {
    it("loginWithGoogle signs in via popup with a Google provider", async () => {
      signInWithPopupMock.mockResolvedValue({ user: { uid: "uid-4" } });
      const user = await service.loginWithGoogle();
      expect(signInWithPopupMock).toHaveBeenCalledWith(
        auth,
        expect.objectContaining({ __tag: "google-provider" })
      );
      expect(user.uid).toBe("uid-4");
    });

    it("loginWithFacebook signs in via popup with a Facebook provider", async () => {
      signInWithPopupMock.mockResolvedValue({ user: { uid: "uid-5" } });
      const user = await service.loginWithFacebook();
      expect(signInWithPopupMock).toHaveBeenCalledWith(
        auth,
        expect.objectContaining({ __tag: "facebook-provider" })
      );
      expect(user.uid).toBe("uid-5");
    });

    it("loginAnonymously signs in anonymously", async () => {
      signInAnonymouslyMock.mockResolvedValue({ user: { uid: "uid-6" } });
      const user = await service.loginAnonymously();
      expect(signInAnonymouslyMock).toHaveBeenCalledWith(auth);
      expect(user.uid).toBe("uid-6");
    });
  });

  describe("phone sign-in", () => {
    it("startPhoneSignIn delegates to signInWithPhoneNumber", async () => {
      const verifier = { __tag: "verifier" };
      const confirmationResult = { __tag: "confirmation" };
      signInWithPhoneNumberMock.mockResolvedValue(confirmationResult);

      const result = await service.startPhoneSignIn(
        "+237600000000",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        verifier as any
      );

      expect(signInWithPhoneNumberMock).toHaveBeenCalledWith(
        auth,
        "+237600000000",
        verifier
      );
      expect(result).toBe(confirmationResult);
    });

    it("confirmPhoneCode confirms the code and returns the user", async () => {
      const confirm = jest.fn().mockResolvedValue({ user: { uid: "uid-7" } });
      const user = await service.confirmPhoneCode(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { confirm } as any,
        "123456"
      );

      expect(confirm).toHaveBeenCalledWith("123456");
      expect(user.uid).toBe("uid-7");
    });
  });
});
