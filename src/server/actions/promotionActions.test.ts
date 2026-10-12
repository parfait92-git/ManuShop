jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn(async () => ({ uid: "u1" })) }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "now" },
  Timestamp: { fromDate: (d: Date) => ({ toMillis: () => d.getTime() }), fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}));

let mockUser: Record<string, unknown> = { role: "admin", shopId: "s1" };
const categories = [{ name: "Savons" }, { name: "Soins" }];
const productShops: Record<string, string> = { p1: "s1", p2: "s2" };
const promotions: Record<string, Record<string, unknown>> = {};
const addMock = jest.fn(async () => ({ id: "new-promo" }));
const updateMock = jest.fn();
const deleteMock = jest.fn();

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => {
      if (name === "users") return { doc: () => ({ get: async () => ({ data: () => mockUser }) }) };
      if (name === "categories") return { where: () => ({ get: async () => ({ docs: categories.map((c) => ({ data: () => c })) }) }) };
      if (name === "products") return { doc: (id: string) => ({ id }) };
      if (name === "promotions")
        return {
          add: addMock,
          doc: (id: string) => ({ get: async () => ({ data: () => promotions[id] }), update: (d: unknown) => updateMock(id, d), delete: () => deleteMock(id) }),
        };
      throw new Error(name);
    },
    getAll: async (...refs: { id: string }[]) => refs.map((r) => ({ data: () => (productShops[r.id] ? { shopId: productShops[r.id] } : undefined) })),
  }),
}));

import { deletePromotionAction, endPromotionAction, savePromotionAction, type PromotionInput } from "./promotionActions";
import { ForbiddenError, ValidationError } from "@/server/errors";

const HOUR = 3_600_000;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * HOUR).toISOString();
const input = (overrides: Partial<PromotionInput> = {}): PromotionInput => ({
  title: "Rentrée",
  kind: "percent",
  value: 20,
  target: { type: "shop" },
  startsAt: iso(0),
  endsAt: iso(48),
  flash: false,
  ...overrides,
});
const ts = (offsetHours: number) => ({ toMillis: () => Date.now() + offsetHours * HOUR });

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { role: "admin", shopId: "s1" };
  for (const k of Object.keys(promotions)) delete promotions[k];
});

describe("savePromotionAction", () => {
  it("creates a campaign for the manager's shop", async () => {
    expect(await savePromotionAction("t", input({ target: { type: "categories", categories: ["Savons", " Savons "] } }))).toEqual({ id: "new-promo" });
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: "s1", title: "Rentrée", kind: "percent", value: 20, target: { type: "categories", categories: ["Savons"] }, flash: false })
    );
  });

  it("keeps prices in the manager's hands", async () => {
    mockUser = { role: "seller", shopId: "s1" };
    await expect(savePromotionAction("t", input())).rejects.toThrow(ForbiddenError);
  });

  it.each([
    [{ title: " " }, /nom/],
    [{ value: 95 }, /entre 1 et 90/],
    [{ kind: "amount" as const, value: 0 }, /nombre entier/],
    [{ startsAt: iso(5), endsAt: iso(2) }, /après le début/],
    [{ startsAt: iso(-48), endsAt: iso(-1) }, /déjà passée/],
    [{ flash: true, endsAt: iso(24 * 8) }, /7 jours au plus/],
    [{ target: { type: "categories" as const, categories: ["Inconnue"] } }, /n'existe plus/],
    [{ target: { type: "products" as const, productIds: ["p2"] } }, /n'existe plus/],
    [{ target: { type: "products" as const, productIds: [] } }, /au moins un produit/],
  ])("refuses %p", async (overrides, message) => {
    await expect(savePromotionAction("t", input(overrides))).rejects.toThrow(message);
  });

  it("modifies a running campaign, but not a finished one", async () => {
    promotions.live = { shopId: "s1", startsAt: ts(-1), endsAt: ts(10) };
    await savePromotionAction("t", input({ id: "live", value: 30 }));
    expect(updateMock).toHaveBeenCalledWith("live", expect.objectContaining({ value: 30 }));

    promotions.over = { shopId: "s1", startsAt: ts(-10), endsAt: ts(-1) };
    await expect(savePromotionAction("t", input({ id: "over" }))).rejects.toThrow(/terminée/);
  });
});

describe("fin et suppression", () => {
  it("ends a running campaign now", async () => {
    promotions.live = { shopId: "s1", startsAt: ts(-1), endsAt: ts(10) };
    await endPromotionAction("t", "live");
    const end = updateMock.mock.calls[0][1].endsAt.toMillis();
    expect(Math.abs(end - Date.now())).toBeLessThan(5000);
  });

  it("only deletes a campaign that never ran", async () => {
    promotions.live = { shopId: "s1", startsAt: ts(-1), endsAt: ts(10) };
    await expect(deletePromotionAction("t", "live")).rejects.toThrow(ValidationError);
    promotions.later = { shopId: "s1", startsAt: ts(5), endsAt: ts(10) };
    await deletePromotionAction("t", "later");
    expect(deleteMock).toHaveBeenCalledWith("later");
  });

  it("never touches another shop's campaign", async () => {
    promotions.other = { shopId: "s2", startsAt: ts(-1), endsAt: ts(10) };
    await expect(endPromotionAction("t", "other")).rejects.toThrow(/introuvable/);
  });
});
