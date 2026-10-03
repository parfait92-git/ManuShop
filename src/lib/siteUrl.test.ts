import { normalizeSiteUrl } from "./siteUrl";

describe("normalizeSiteUrl", () => {
  it("keeps only the https origin of the domain", () => {
    expect(normalizeSiteUrl("https://www.manushop.cm")).toBe("https://www.manushop.cm");
    expect(normalizeSiteUrl("https://www.ManuShop.cm/")).toBe("https://www.manushop.cm");
    expect(normalizeSiteUrl("  manushop.cm ")).toBe("https://manushop.cm");
  });

  it("refuses what can't be a site address", () => {
    expect(normalizeSiteUrl("")).toBeNull();
    expect(normalizeSiteUrl("http://manushop.cm")).toBeNull();
    expect(normalizeSiteUrl("https://manushop.cm/boutique")).toBeNull();
    expect(normalizeSiteUrl("https://manushop.cm/?a=1")).toBeNull();
    expect(normalizeSiteUrl("https://user:pass@manushop.cm")).toBeNull();
    expect(normalizeSiteUrl("ftp://manushop.cm")).toBeNull();
    expect(normalizeSiteUrl("manushop")).toBeNull();
  });

  it("allows a local server, for testing", () => {
    expect(normalizeSiteUrl("http://localhost:3918")).toBe("http://localhost:3918");
  });
});
