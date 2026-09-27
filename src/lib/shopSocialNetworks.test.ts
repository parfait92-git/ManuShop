import { getPrimarySocialNetworkUrl } from "./shopSocialNetworks";
import type { Shop } from "@/models/shop/Shop";

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Boutique Awa",
    logo: "",
    address: "Douala",
    phone: "",
    whatsapp: "",
    currency: "XAF",
    ownerId: "u1",
    createdAt: {} as never,
    ...overrides,
  };
}

describe("getPrimarySocialNetworkUrl", () => {
  it("returns null when no primary social network is chosen", () => {
    expect(getPrimarySocialNetworkUrl(fakeShop())).toBeNull();
  });

  it("returns null when the primary network's url field is empty", () => {
    expect(
      getPrimarySocialNetworkUrl(
        fakeShop({ primarySocialNetwork: "facebook", facebookUrl: "" })
      )
    ).toBeNull();
  });

  it("returns the matching url for the primary network", () => {
    expect(
      getPrimarySocialNetworkUrl(
        fakeShop({
          primarySocialNetwork: "instagram",
          instagramUrl: "https://instagram.com/boutiqueawa",
        })
      )
    ).toBe("https://instagram.com/boutiqueawa");
  });

  it("ignores a url set for a different network than the chosen primary one", () => {
    expect(
      getPrimarySocialNetworkUrl(
        fakeShop({
          primarySocialNetwork: "tiktok",
          facebookUrl: "https://facebook.com/boutiqueawa",
          tiktokUrl: "",
        })
      )
    ).toBeNull();
  });
});
