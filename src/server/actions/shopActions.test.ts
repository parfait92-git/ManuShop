jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));

const shopSetMock = jest.fn();
const shopDocMock = jest.fn(() => ({ set: shopSetMock, id: "shop-new" }));

const userGetMock = jest.fn();
const userUpdateMock = jest.fn();
const userDocMock = jest.fn(() => ({ get: userGetMock, update: userUpdateMock }));

const collectionMock = jest.fn((name: string) =>
  name === "shops" ? { doc: shopDocMock } : { doc: userDocMock }
);

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { createShopAction } from "@/server/actions/shopActions";

const requireCallerMock = requireCaller as jest.Mock;

describe("createShopAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "u1", email: "a@b.com" });
  });

  it("creates the shop with a computed expiry and promotes a client to admin", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    const result = await createShopAction("token", {
      name: "Ma Boutique",
      subscriptionPlan: "monthly",
    });

    expect(requireCallerMock).toHaveBeenCalledWith("token");
    expect(collectionMock).toHaveBeenCalledWith("shops");
    expect(shopSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ma Boutique",
        ownerId: "u1",
        adminSource: "subscription",
        subscriptionPlan: "monthly",
      })
    );
    expect(userUpdateMock).toHaveBeenCalledWith({
      shopId: "shop-new",
      role: "admin",
      adminSource: "subscription",
    });
    expect(result).toEqual({ shopId: "shop-new" });
  });

  it("does not touch role/adminSource when the caller is already admin", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin" }) });

    await createShopAction("token", {
      name: "Deuxième boutique",
      subscriptionPlan: "yearly",
    });

    expect(userUpdateMock).toHaveBeenCalledWith({ shopId: "shop-new" });
  });

  it("defaults optional fields to empty strings", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    await createShopAction("token", {
      name: "Sans détails",
      subscriptionPlan: "daily",
    });

    expect(shopSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sector: "",
        logo: "",
        address: "",
        phone: "",
        whatsapp: "",
      })
    );
  });
});
