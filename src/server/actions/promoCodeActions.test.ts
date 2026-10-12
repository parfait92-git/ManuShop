jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn(async () => ({ uid: "u1" })) }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "now" },
  Timestamp: { fromDate: (d: Date) => ({ toMillis: () => d.getTime() }), fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}));

let mockUser: Record<string, unknown> = { role: "admin", shopId: "s1" };
const codes: Record<string, Record<string, unknown>> = {};
const uses: Record<string, number> = {};
const createMock = jest.fn();
const updateMock = jest.fn();
const deleteMock = jest.fn();

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => {
      if (name === "users") return { doc: () => ({ get: async () => ({ data: () => mockUser }) }) };
      if (name === "promoCodes")
        return {
          doc: (id: string) => ({
            id,
            get: async () => ({ data: () => codes[id] }),
            create: async (d: unknown) => {
              if (codes[id]) throw Object.assign(new Error("exists"), { code: 6 });
              createMock(id, d);
            },
            update: (d: unknown) => updateMock(id, d),
            delete: () => deleteMock(id),
            collection: () => ({ doc: (uid: string) => ({ get: async () => ({ data: () => (uses[`${id}/${uid}`] ? { count: uses[`${id}/${uid}`] } : undefined) }) }) }),
          }),
        };
      throw new Error(name);
    },
  }),
}));

import {
  checkPromoCodeAction,
  deletePromoCodeAction,
  endPromoCodeAction,
  savePromoCodeAction,
  type PromoCodeInput,
} from "./promoCodeActions";
import { ForbiddenError } from "@/server/errors";

const HOUR = 3_600_000;
const iso = (h: number) => new Date(Date.now() + h * HOUR).toISOString();
const ts = (h: number) => ({ toMillis: () => Date.now() + h * HOUR });
const input = (overrides: Partial<PromoCodeInput> = {}): PromoCodeInput => ({
  code: "rentrée 10",
  kind: "percent",
  value: 10,
  minSubtotal: 0,
  maxUses: null,
  perClient: 1,
  startsAt: iso(0),
  endsAt: iso(48),
  ...overrides,
});
const stored = (overrides: Record<string, unknown> = {}) => ({
  shopId: "s1",
  code: "RENTREE10",
  kind: "percent",
  value: 10,
  minSubtotal: 5000,
  maxUses: 10,
  perClient: 1,
  startsAt: ts(-1),
  endsAt: ts(48),
  usedCount: 2,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { role: "admin", shopId: "s1" };
  for (const k of Object.keys(codes)) delete codes[k];
  for (const k of Object.keys(uses)) delete uses[k];
});

describe("savePromoCodeAction", () => {
  it("creates the code in capitals, unique in the manager's shop", async () => {
    expect(await savePromoCodeAction("t", input())).toEqual({ id: "s1_RENTREE10" });
    expect(createMock).toHaveBeenCalledWith("s1_RENTREE10", expect.objectContaining({ shopId: "s1", code: "RENTREE10", usedCount: 0, perClient: 1 }));
  });

  it("refuses a code that already exists in the shop", async () => {
    codes.s1_RENTREE10 = stored();
    await expect(savePromoCodeAction("t", input())).rejects.toThrow("existe déjà");
  });

  it("keeps codes in the manager's hands", async () => {
    mockUser = { role: "seller", shopId: "s1" };
    await expect(savePromoCodeAction("t", input())).rejects.toThrow(ForbiddenError);
  });

  it.each([
    [{ code: "a" }, /3 à 20/],
    [{ code: "PROMO!" }, /3 à 20/],
    [{ value: 0 }, /entre 1 et 90/],
    [{ kind: "amount" as const, value: 6000, minSubtotal: 5000 }, /dépasse le montant minimum/],
    [{ maxUses: 0 }, /au moins 1/],
    [{ perClient: 1.5 }, /au moins 1/],
    [{ endsAt: iso(-1), startsAt: iso(-2) }, /déjà passée/],
  ])("validates %p", async (overrides, message) => {
    await expect(savePromoCodeAction("t", input(overrides))).rejects.toThrow(message);
  });

  it("never lowers the limit below the uses already made", async () => {
    codes.s1_RENTREE10 = stored({ usedCount: 4 });
    await expect(savePromoCodeAction("t", input({ id: "s1_RENTREE10", maxUses: 3 }))).rejects.toThrow("4 fois");
    await savePromoCodeAction("t", input({ id: "s1_RENTREE10", maxUses: 4 }));
    expect(updateMock).toHaveBeenCalledWith("s1_RENTREE10", expect.objectContaining({ maxUses: 4 }));
  });
});

describe("endPromoCodeAction / deletePromoCodeAction", () => {
  it("ends a code now, and refuses to delete one that has served", async () => {
    codes.s1_RENTREE10 = stored();
    await endPromoCodeAction("t", "s1_RENTREE10");
    expect(updateMock.mock.calls[0][1].endsAt.toMillis()).toBeLessThanOrEqual(Date.now());
    await expect(deletePromoCodeAction("t", "s1_RENTREE10")).rejects.toThrow("déjà servi");
  });

  it("deletes a code never used, but not another shop's", async () => {
    codes.s1_NEUF = stored({ usedCount: 0 });
    codes.s2_AUTRE = stored({ shopId: "s2", usedCount: 0 });
    await deletePromoCodeAction("t", "s1_NEUF");
    expect(deleteMock).toHaveBeenCalledWith("s1_NEUF");
    await expect(deletePromoCodeAction("t", "s2_AUTRE")).rejects.toThrow("introuvable");
  });
});

describe("checkPromoCodeAction", () => {
  it("returns the discount for the client's cart", async () => {
    codes.s1_RENTREE10 = stored();
    expect(await checkPromoCodeAction("t", { shopId: "s1", code: "rentree10", subtotal: 12500 })).toEqual({
      code: "RENTREE10",
      kind: "percent",
      value: 10,
      discount: 1250,
    });
  });

  it("explains why a code doesn't apply", async () => {
    codes.s1_RENTREE10 = stored();
    await expect(checkPromoCodeAction("t", { shopId: "s1", code: "NOPE", subtotal: 9000 })).rejects.toThrow("n'existe pas");
    await expect(checkPromoCodeAction("t", { shopId: "s1", code: "RENTREE10", subtotal: 3000 })).rejects.toThrow("au moins");
    uses["s1_RENTREE10/u1"] = 1;
    await expect(checkPromoCodeAction("t", { shopId: "s1", code: "RENTREE10", subtotal: 9000 })).rejects.toThrow("déjà utilisé");
  });
});
