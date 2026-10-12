import { applyDiscount, campaignAppliesTo, discountPercent, isCampaignLive, lowestQuote, quote, type CampaignFields } from "./pricing";
import { isPromoActive } from "./promo";

const at = (iso: string) => ({ toMillis: () => Date.parse(iso), toDate: () => new Date(iso) });
const NOW = new Date("2026-10-12T10:00:00Z");

const campaign = (overrides: Partial<CampaignFields> = {}): CampaignFields => ({
  id: "c1",
  title: "Rentrée",
  kind: "percent",
  value: 20,
  target: { type: "shop" },
  startsAt: at("2026-10-10T00:00:00Z"),
  endsAt: at("2026-10-20T00:00:00Z"),
  ...overrides,
});

const product = { id: "p1", category: "Soins cheveux", price: 5000 };

describe("pricing", () => {
  it("applies a live campaign to the regular price", () => {
    const c = campaign();
    expect(quote(product, undefined, [c], NOW)).toEqual({ price: 4000, regular: 5000, campaign: c });
    expect(discountPercent(quote(product, undefined, [campaign()], NOW))).toBe(20);
  });

  it("ignores campaigns not started yet, already over, or aimed elsewhere", () => {
    const later = campaign({ startsAt: at("2026-10-13T00:00:00Z") });
    const over = campaign({ endsAt: at("2026-10-12T09:00:00Z") });
    const otherCategory = campaign({ target: { type: "categories", categories: ["Savons"] } });
    const otherProduct = campaign({ target: { type: "products", productIds: ["p2"] } });
    expect(quote(product, undefined, [later, over, otherCategory, otherProduct], NOW)).toEqual({ price: 5000, regular: 5000 });
    expect(isCampaignLive(later, NOW)).toBe(false);
    expect(campaignAppliesTo(campaign({ target: { type: "products", productIds: ["p1"] } }), product)).toBe(true);
  });

  it("gives the lowest price, never stacking the product's promotion and a campaign", () => {
    const onPromo = { ...product, isPromo: true, promoPrice: 3500 };
    expect(quote(onPromo, undefined, [campaign()], NOW)).toEqual({ price: 3500, regular: 5000 });
    const big = campaign({ id: "c2", value: 40 });
    expect(quote(onPromo, undefined, [campaign(), big], NOW)).toEqual({ price: 3000, regular: 5000, campaign: big });
  });

  it("applies a fixed amount, never below zero", () => {
    expect(quote(product, undefined, [campaign({ kind: "amount", value: 1500 })], NOW).price).toBe(3500);
    expect(applyDiscount(1000, "amount", 2500)).toBe(0);
    expect(applyDiscount(3333, "percent", 15)).toBe(2833);
  });

  it("prices a version at its own price (without the product's promotion), campaigns included", () => {
    const withVariants = {
      ...product,
      isPromo: true,
      promoPrice: 4500,
      variants: {
        a: { label: "250 ml", stock: 3, position: 0 },
        b: { label: "500 ml", stock: 2, price: 9000, position: 1 },
      },
    };
    expect(quote(withVariants, withVariants.variants.a, [], NOW)).toEqual({ price: 4500, regular: 5000 });
    expect(quote(withVariants, withVariants.variants.b, [], NOW)).toEqual({ price: 9000, regular: 9000 });
    expect(quote(withVariants, withVariants.variants.b, [campaign()], NOW).price).toBe(7200);
    expect(lowestQuote(withVariants, [campaign()], NOW).price).toBe(4000);
  });
});

describe("date de début de la promotion d'un produit (BF-31)", () => {
  it("waits for its first day, Cameroon time", () => {
    const p = { price: 5000, isPromo: true, promoPrice: 4000, promoStart: { toDate: () => new Date("2026-10-13T00:00:00Z") } };
    // Le 13 commence à 23:00 UTC le 12 (UTC+1).
    expect(isPromoActive(p, new Date("2026-10-12T22:59:00Z"))).toBe(false);
    expect(isPromoActive(p, new Date("2026-10-12T23:00:00Z"))).toBe(true);
  });
});
