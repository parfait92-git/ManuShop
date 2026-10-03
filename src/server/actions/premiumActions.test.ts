jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));
jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => ({ __op: "serverTimestamp" }),
    arrayUnion: (v: string) => ({ __op: "arrayUnion", v }),
  },
}));

let docs: Record<string, Record<string, unknown> | undefined> = {};
const added: Record<string, unknown>[] = [];
const batchOps: unknown[] = [];
const setMock = jest.fn();

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({ data: () => docs[`${name}/${id}`] }),
        set: (...a: unknown[]) => setMock(`${name}/${id}`, ...a),
        __path: `${name}/${id}`,
      }),
      where: (field: string, _op: string, value: unknown) => ({
        where: (field2: string, _op2: string, value2: unknown) => ({
          get: async () => ({
            docs: Object.entries(docs)
              .filter(([k, d]) => k.startsWith(`${name}/`) && d?.[field] === value && d?.[field2] === value2)
              .map(([, d]) => ({ data: () => d })),
          }),
        }),
      }),
      add: async (data: Record<string, unknown>) => {
        added.push(data);
      },
    }),
    batch: () => ({
      update: (ref: { __path: string }, data: unknown) => batchOps.push([ref.__path, data]),
      commit: async () => {},
    }),
  }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  decidePremiumRequestAction,
  requestPremiumItemAction,
  setPremiumCatalogAction,
} from "@/server/actions/premiumActions";
import { resolvePremiumCatalog } from "@/lib/premiumCatalog";
import { ForbiddenError, ValidationError } from "@/server/errors";

const priced = { items: { "theme:ocean-neon": { premium: true, priceFcfa: 5000 } } };

describe("premiumActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    added.length = 0;
    batchOps.length = 0;
    (requireCaller as jest.Mock).mockResolvedValue({ uid: "admin-1" });
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ uid: "sa" });
    docs = {
      "users/admin-1": { role: "admin", shopId: "shop-1", displayName: "Awa" },
      "shops/shop-1": { name: "Chez Awa", premiumFeatures: [] },
      "configuration/premium": priced,
    };
  });

  it("records a purchase request at the current price", async () => {
    await requestPremiumItemAction("t", "theme:ocean-neon");
    expect(added).toEqual([
      expect.objectContaining({
        shopId: "shop-1",
        itemKey: "theme:ocean-neon",
        itemLabel: "Thème « Néon Océan »",
        priceFcfa: 5000,
        status: "pending",
        requestedBy: "admin-1",
      }),
    ]);
  });

  it("refuses a request for a free, unpriced, owned or already requested item", async () => {
    await expect(requestPremiumItemAction("t", "theme:wax-soleil")).rejects.toThrow("gratuit");
    docs["configuration/premium"] = undefined;
    await expect(requestPremiumItemAction("t", "theme:ocean-neon")).rejects.toThrow("prix");
    docs["configuration/premium"] = priced;
    docs["shops/shop-1"] = { name: "Chez Awa", premiumFeatures: ["theme:ocean-neon"] };
    await expect(requestPremiumItemAction("t", "theme:ocean-neon")).rejects.toThrow("déjà accès");
    docs["shops/shop-1"] = { name: "Chez Awa", premiumFeatures: [] };
    docs["premiumRequests/r1"] = { shopId: "shop-1", status: "pending", itemKey: "theme:ocean-neon" };
    await expect(requestPremiumItemAction("t", "theme:ocean-neon")).rejects.toThrow("déjà en attente");
    expect(added).toEqual([]);
  });

  it("is reserved to the shop's manager", async () => {
    docs["users/admin-1"] = { role: "seller", shopId: "shop-1" };
    await expect(requestPremiumItemAction("t", "theme:ocean-neon")).rejects.toThrow(ForbiddenError);
  });

  it("grants the item for good when the Super Admin approves", async () => {
    docs["premiumRequests/r1"] = { shopId: "shop-1", status: "pending", itemKey: "theme:ocean-neon" };
    await decidePremiumRequestAction("t", "r1", true);
    expect(batchOps).toEqual([
      ["premiumRequests/r1", { status: "approved", decidedAt: { __op: "serverTimestamp" } }],
      ["shops/shop-1", { premiumFeatures: { __op: "arrayUnion", v: "theme:ocean-neon" } }],
    ]);
  });

  it("grants nothing on refusal, and never decides twice", async () => {
    docs["premiumRequests/r1"] = { shopId: "shop-1", status: "pending", itemKey: "theme:ocean-neon" };
    await decidePremiumRequestAction("t", "r1", false);
    expect(batchOps).toEqual([["premiumRequests/r1", { status: "rejected", decidedAt: { __op: "serverTimestamp" } }]]);
    docs["premiumRequests/r1"] = { status: "approved" };
    await expect(decidePremiumRequestAction("t", "r1", true)).rejects.toThrow(ValidationError);
  });

  it("saves the Super Admin's catalog after validating it", async () => {
    const catalog = resolvePremiumCatalog(priced);
    await setPremiumCatalogAction("t", catalog);
    expect(setMock).toHaveBeenCalledWith("configuration/premium", catalog);
    await expect(
      setPremiumCatalogAction("t", { ...catalog, plans: { ...catalog.plans, daily: { priceFcfa: -1, includes: [] } } })
    ).rejects.toThrow(ValidationError);
  });
});
