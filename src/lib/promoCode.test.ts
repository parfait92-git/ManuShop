import { codeDiscount, codeProblem, normalizeCode, type PromoCodeRules } from "@/lib/promoCode";

const ts = (ms: number) => ({ toMillis: () => ms });
const CODE: PromoCodeRules = {
  code: "X10",
  kind: "percent",
  value: 10,
  minSubtotal: 0,
  maxUses: null,
  perClient: null,
  startsAt: ts(0),
  endsAt: ts(1000),
  usedCount: 0,
};

describe("promo codes", () => {
  it("normalizes what the client types", () => {
    expect(normalizeCode(" rentrée 10 ")).toBe("RENTREE10");
  });

  it("never discounts more than the items", () => {
    expect(codeDiscount({ kind: "percent", value: 10 }, 12345)).toBe(1234);
    expect(codeDiscount({ kind: "amount", value: 2000 }, 1500)).toBe(1500);
  });

  it("accepts a code within its dates and limits", () => {
    expect(codeProblem(CODE, { subtotal: 100, now: 500, clientUses: 5 })).toBeNull();
    expect(codeProblem({ ...CODE, endsAt: ts(500) }, { subtotal: 100, now: 500, clientUses: 0 })).toMatch("expiré");
    expect(codeProblem({ ...CODE, perClient: 2 }, { subtotal: 100, now: 500, clientUses: 2 })).toMatch("2 fois");
  });
});
