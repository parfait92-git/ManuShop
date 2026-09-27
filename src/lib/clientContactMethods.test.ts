import { buildClientContactLink } from "./clientContactMethods";

const baseShop = {
  name: "Ada Boutique",
  whatsapp: "",
  facebookUrl: "",
  instagramUrl: "",
  publicContactEmail: "",
};

describe("buildClientContactLink", () => {
  it("builds a mailto: link for email when set", () => {
    const shop = { ...baseShop, publicContactEmail: "ada@example.com" };
    expect(buildClientContactLink(shop, "email")).toBe(
      "mailto:ada@example.com"
    );
  });

  it("returns undefined for email when unset", () => {
    expect(buildClientContactLink(baseShop, "email")).toBeUndefined();
  });

  it("builds a wa.me link for whatsapp when set", () => {
    const shop = { ...baseShop, whatsapp: "+237600000000" };
    expect(buildClientContactLink(shop, "whatsapp")).toContain(
      "https://wa.me/237600000000"
    );
  });

  it("returns undefined for whatsapp when unset", () => {
    expect(buildClientContactLink(baseShop, "whatsapp")).toBeUndefined();
  });

  it("returns the facebook URL directly when set", () => {
    const shop = { ...baseShop, facebookUrl: "https://facebook.com/ada" };
    expect(buildClientContactLink(shop, "facebook")).toBe(
      "https://facebook.com/ada"
    );
  });

  it("returns undefined for facebook when unset", () => {
    expect(buildClientContactLink(baseShop, "facebook")).toBeUndefined();
  });

  it("returns the instagram URL directly when set", () => {
    const shop = { ...baseShop, instagramUrl: "https://instagram.com/ada" };
    expect(buildClientContactLink(shop, "instagram")).toBe(
      "https://instagram.com/ada"
    );
  });

  it("returns undefined for instagram when unset", () => {
    expect(buildClientContactLink(baseShop, "instagram")).toBeUndefined();
  });
});
