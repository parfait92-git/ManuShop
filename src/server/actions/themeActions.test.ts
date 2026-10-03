jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => ({ __op: "serverTimestamp" }) },
}));

const userGetMock = jest.fn();
const themeSetMock = jest.fn();
const paths: string[] = [];
jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: userGetMock,
        collection: (sub: string) => ({
          doc: (subId: string) => {
            paths.push(`${name}/${id}/${sub}/${subId}`);
            return { set: themeSetMock };
          },
        }),
      }),
    }),
  }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { applyShopThemeAction } from "@/server/actions/themeActions";
import { ForbiddenError, ValidationError } from "@/server/errors";

describe("applyShopThemeAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paths.length = 0;
    (requireCaller as jest.Mock).mockResolvedValue({ uid: "admin-1" });
  });

  it("stores the applied theme under the shop itself", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1" }) });

    await applyShopThemeAction("token", "default");

    expect(paths).toEqual(["shops/shop-1/themes/active"]);
    expect(themeSetMock).toHaveBeenCalledWith({
      themeId: "default",
      appliedAt: { __op: "serverTimestamp" },
      appliedBy: "admin-1",
    });
  });

  it("is reserved to the shop's manager", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "seller", shopId: "shop-1" }) });
    await expect(applyShopThemeAction("token", "default")).rejects.toThrow(ForbiddenError);
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin" }) });
    await expect(applyShopThemeAction("token", "default")).rejects.toThrow(ForbiddenError);
    expect(themeSetMock).not.toHaveBeenCalled();
  });

  it("refuses a theme that isn't in the catalogue", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1" }) });
    await expect(applyShopThemeAction("token", "pirate")).rejects.toThrow(ValidationError);
    expect(themeSetMock).not.toHaveBeenCalled();
  });
});
