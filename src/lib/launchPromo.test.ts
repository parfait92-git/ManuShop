import {
  DEFAULT_LAUNCH_PROMO,
  fromShopDateTimeInput,
  isLaunchPromoVisible,
  resolveLaunchPromo,
  toShopDateTimeInput,
  validateLaunchPromo,
  type LaunchPromoSettings,
} from "./launchPromo";

const NOW = new Date("2026-10-02T12:00:00Z");
const promo = (overrides: Partial<LaunchPromoSettings> = {}): LaunchPromoSettings => ({
  enabled: true,
  eyebrow: "Offre",
  title: "Votre boutique à moitié prix",
  description: "Profitez de -50 % sur votre premier mois d'abonnement.",
  endsAt: "2026-10-30T23:59:59+01:00",
  ...overrides,
});

describe("promotion de l'accueil", () => {
  it("keeps the current homepage unchanged until the Super Admin saves anything", () => {
    expect(resolveLaunchPromo(undefined)).toEqual(DEFAULT_LAUNCH_PROMO);
    expect(resolveLaunchPromo({ title: "Autre titre", enabled: "oui" })).toEqual({
      ...DEFAULT_LAUNCH_PROMO,
      title: "Autre titre",
    });
  });

  it("shows the promotion only while enabled and before its end", () => {
    expect(isLaunchPromoVisible(promo(), NOW)).toBe(true);
    expect(isLaunchPromoVisible(promo({ enabled: false }), NOW)).toBe(false);
    expect(isLaunchPromoVisible(promo({ endsAt: "2026-10-01T00:00:00+01:00" }), NOW)).toBe(false);
    expect(isLaunchPromoVisible(promo({ endsAt: "pas une date" }), NOW)).toBe(false);
  });

  it("validates lengths and refuses a past end date for an enabled offer — allowed when disabled, to keep it for later", () => {
    expect(validateLaunchPromo(promo(), NOW)).toEqual({});
    expect(validateLaunchPromo(promo({ title: "Ok" }), NOW)).toHaveProperty("title");
    expect(validateLaunchPromo(promo({ description: "Court" }), NOW)).toHaveProperty("description");
    expect(validateLaunchPromo(promo({ eyebrow: "x".repeat(41) }), NOW)).toHaveProperty("eyebrow");
    expect(validateLaunchPromo(promo({ endsAt: "" }), NOW)).toHaveProperty("endsAt");
    const past = promo({ endsAt: "2026-09-16T06:00:00+01:00" });
    expect(validateLaunchPromo(past, NOW)).toHaveProperty("endsAt");
    expect(validateLaunchPromo({ ...past, enabled: false }, NOW)).toEqual({});
  });

  it("reads and writes the end date in the device time zone (Cameroon in tests)", () => {
    expect(toShopDateTimeInput("2026-10-30T23:59:59+01:00")).toBe("2026-10-30T23:59");
    expect(toShopDateTimeInput("2026-10-30T22:59:59Z")).toBe("2026-10-30T23:59");
    expect(fromShopDateTimeInput("2026-10-30T23:59")).toBe("2026-10-30T22:59:59.000Z");
    expect(fromShopDateTimeInput("")).toBe("");
  });
});
