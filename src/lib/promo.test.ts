import { effectivePrice, isPromoActive, isPromoExpired, promoEndsAt } from "@/lib/promo";

/** Comme `ProductForm` : la date choisie ("2026-10-15") enregistrée comme
 * minuit UTC de ce jour-là. */
const endOn = (day: string) => ({ toDate: () => new Date(day) });

const product = (overrides = {}) => ({
  price: 5000,
  isPromo: true,
  promoPrice: 4000,
  ...overrides,
});

describe("promo", () => {
  it("ends at midnight Cameroon time (UTC+1) after the chosen end day", () => {
    expect(promoEndsAt(endOn("2026-10-15")).toISOString()).toBe("2026-10-15T23:00:00.000Z");
  });

  it("is active through the whole end day, and over right after it, in Cameroon", () => {
    const p = product({ promoEnd: endOn("2026-10-15") });
    // 23h59 à Douala le jour de fin = 22h59 UTC
    expect(isPromoActive(p, new Date("2026-10-15T22:59:00Z"))).toBe(true);
    expect(effectivePrice(p, new Date("2026-10-15T22:59:00Z"))).toBe(4000);
    // Minuit à Douala le lendemain
    expect(isPromoActive(p, new Date("2026-10-15T23:00:00Z"))).toBe(false);
    expect(effectivePrice(p, new Date("2026-10-15T23:00:00Z"))).toBe(5000);
    expect(isPromoExpired(p, new Date("2026-10-16T08:00:00Z"))).toBe(true);
  });

  it("lasts indefinitely without an end date", () => {
    expect(effectivePrice(product(), new Date("2099-01-01"))).toBe(4000);
    expect(isPromoExpired(product(), new Date("2099-01-01"))).toBe(false);
  });

  it("falls back to the regular price when unchecked or without a valid promo price", () => {
    expect(effectivePrice(product({ isPromo: false }))).toBe(5000);
    expect(effectivePrice(product({ promoPrice: undefined }))).toBe(5000);
    expect(effectivePrice(product({ promoPrice: 0 }))).toBe(5000);
    expect(isPromoExpired(product({ isPromo: false, promoEnd: endOn("2000-01-01") }))).toBe(false);
  });
});
