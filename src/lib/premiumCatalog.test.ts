import {
  hasPremiumAccess,
  listPremiumItems,
  premiumAccess,
  resolvePremiumCatalog,
  themeItemKey,
  validatePremiumCatalog,
} from "./premiumCatalog";

const NOW = new Date("2026-10-03T12:00:00Z");
const future = NOW.getTime() + 86_400_000;
const past = NOW.getTime() - 86_400_000;

describe("premiumCatalog", () => {
  it("lists the features and every theme", () => {
    const keys = listPremiumItems().map((i) => i.key);
    expect(keys).toEqual(expect.arrayContaining(["contactForm", "theme:default", "theme:wax-soleil", "theme:ocean-neon"]));
  });

  it("makes the first two themes free and every other theme and feature premium, unpriced", () => {
    const catalog = resolvePremiumCatalog(undefined);
    expect(catalog.items["theme:default"]).toEqual({ premium: false, priceFcfa: null });
    expect(catalog.items["theme:wax-soleil"].premium).toBe(false);
    expect(catalog.items["theme:ocean-neon"]).toEqual({ premium: true, priceFcfa: null });
    expect(catalog.items.contactForm.premium).toBe(true);
    expect(catalog.plans.yearly).toEqual({ priceFcfa: 60000, includes: [] });
  });

  it("keeps the Super Admin's settings and drops anything unknown or malformed", () => {
    const catalog = resolvePremiumCatalog({
      items: { "theme:ocean-neon": { premium: true, priceFcfa: 5000 }, "theme:wax-soleil": { premium: true, priceFcfa: -3 } },
      plans: { monthly: { priceFcfa: 9000, includes: ["theme:ocean-neon", "inconnu", "theme:ocean-neon"] } },
    });
    expect(catalog.items["theme:ocean-neon"].priceFcfa).toBe(5000);
    expect(catalog.items["theme:wax-soleil"]).toEqual({ premium: true, priceFcfa: null });
    expect(catalog.plans.monthly).toEqual({ priceFcfa: 9000, includes: ["theme:ocean-neon"] });
  });

  it("validates prices and plan contents", () => {
    const catalog = resolvePremiumCatalog(undefined);
    expect(validatePremiumCatalog(catalog)).toBeNull();
    expect(validatePremiumCatalog({ ...catalog, plans: { ...catalog.plans, daily: { priceFcfa: 1.5, includes: [] } } })).toMatch(/Quotidien/);
    expect(
      validatePremiumCatalog({ ...catalog, items: { ...catalog.items, contactForm: { premium: true, priceFcfa: -1 } } })
    ).toMatch(/prix/);
  });

  it("opens access to free items, owned items, and items of an active plan", () => {
    const catalog = resolvePremiumCatalog({ plans: { monthly: { priceFcfa: 8000, includes: [themeItemKey("ocean-neon")] } } });
    const ocean = themeItemKey("ocean-neon");

    expect(premiumAccess("theme:default", {}, catalog, NOW)).toBe("free");
    expect(premiumAccess(ocean, {}, catalog, NOW)).toBeNull();
    expect(premiumAccess(ocean, { premiumFeatures: [ocean] }, catalog, NOW)).toBe("owned");
    expect(premiumAccess(ocean, { subscriptionPlan: "monthly", subscriptionExpiresAtMs: future }, catalog, NOW)).toBe("plan");
    // Abonnement terminé, ou formule qui ne l'inclut pas : plus d'accès.
    expect(hasPremiumAccess(ocean, { subscriptionPlan: "monthly", subscriptionExpiresAtMs: past }, catalog, NOW)).toBe(false);
    expect(hasPremiumAccess(ocean, { subscriptionPlan: "weekly", subscriptionExpiresAtMs: future }, catalog, NOW)).toBe(false);
  });
});
