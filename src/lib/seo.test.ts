import { buildRates } from "@/lib/currency";
import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";

import {
  describeProduct,
  describeShop,
  hiddenPageMetadata,
  productImageAlt,
  productJsonLd,
  productMetadata,
  serializeJsonLd,
  shopJsonLd,
  shopMetadata,
  truncate,
} from "./seo";

const shop = (overrides: Partial<Shop> = {}): Shop =>
  ({
    id: "s1",
    name: "Chez Awa",
    logo: "https://res.cloudinary.com/demo/logo.webp",
    address: "Akwa, Douala",
    phone: "+237690000000",
    whatsapp: "",
    currency: "XAF",
    ownerId: "u1",
    sector: "Mode",
    isPublished: true,
    createdAt: {} as never,
    ...overrides,
  }) as Shop;

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  shopId: "s1",
  name: "Pagne wax",
  description: "Pagne 6 yards, motif traditionnel.",
  price: 10000,
  category: "Mode",
  images: ["https://res.cloudinary.com/demo/a.webp", "https://res.cloudinary.com/demo/b.webp"],
  stock: 4,
  stockThreshold: 1,
  isPromo: false,
  createdAt: {} as never,
  updatedAt: {} as never,
  ...overrides,
});

describe("descriptions", () => {
  it("uses the shop's own description, else builds one from its sector and city — never empty", () => {
    expect(describeShop(shop({ description: "Tissus et pagnes depuis 1998." }))).toBe(
      "Tissus et pagnes depuis 1998."
    );
    expect(describeShop(shop())).toBe(
      "Chez Awa — Mode à Akwa, Douala. Découvrez nos produits et commandez en ligne."
    );
  });

  it("truncates long descriptions at a word boundary, under search engines' limit", () => {
    const long = "mot ".repeat(80);
    const result = truncate(long);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/mo…$/);
  });

  it("describes a product without description from its name, category and shop", () => {
    expect(describeProduct(product({ description: "" }), shop())).toBe(
      "Pagne wax (Mode) — Chez Awa. Commandez en ligne."
    );
  });

  it("writes image alt texts that say what the photo shows", () => {
    expect(productImageAlt(product(), { shopName: "Chez Awa", index: 1, total: 2 })).toBe(
      "Pagne wax — Mode — Chez Awa (photo 2 sur 2)"
    );
    expect(productImageAlt(product())).toBe("Pagne wax — Mode");
  });
});

describe("métadonnées", () => {
  it("presents the shop as the merchant's own site: its name as title and site name, its logo as icon — no ManuShop", () => {
    const metadata = shopMetadata(shop());
    expect(metadata.title).toEqual({ absolute: "Chez Awa — Mode" });
    expect(metadata.applicationName).toBe("Chez Awa");
    expect(metadata.openGraph).toMatchObject({ siteName: "Chez Awa" });
    expect(metadata.icons).toEqual({
      icon: "https://res.cloudinary.com/demo/logo.webp",
      apple: "https://res.cloudinary.com/demo/logo.webp",
    });
    expect(metadata.keywords).toEqual(["Chez Awa", "Mode", "Akwa, Douala"]);
    expect(JSON.stringify(metadata)).not.toContain("ManuShop");
    expect(metadata.alternates?.canonical).toBe("/boutique/s1");
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://res.cloudinary.com/demo/logo.webp", alt: "Logo de Chez Awa" },
    ]);
  });

  it("gives a product its photos as share images", () => {
    const metadata = productMetadata(product(), shop());
    expect(metadata.title).toEqual({ absolute: "Pagne wax — Chez Awa" });
    expect(metadata.openGraph).toMatchObject({ siteName: "Chez Awa" });
    expect(JSON.stringify(metadata)).not.toContain("ManuShop");
    expect(Array.isArray(metadata.openGraph?.images) && metadata.openGraph.images).toHaveLength(2);
  });

  it("keeps hidden pages (unpublished, missing) out of search results", () => {
    const hidden = hiddenPageMetadata("Boutique introuvable");
    expect(hidden.robots).toEqual({ index: false, follow: false });
    expect(hidden.alternates?.canonical).toBeNull();
  });
});

describe("données structurées", () => {
  const rates = buildRates(600);

  it("describes the shop as a schema.org Store", () => {
    expect(shopJsonLd(shop(), "https://manushop.cm")).toMatchObject({
      "@type": "Store",
      name: "Chez Awa",
      url: "https://manushop.cm/boutique/s1",
      address: { "@type": "PostalAddress", streetAddress: "Akwa, Douala" },
    });
  });

  it("announces the price customers actually see: current promo, shop currency, availability", () => {
    const promo = product({ isPromo: true, promoPrice: 8000 });
    expect(productJsonLd(promo, shop(), "https://manushop.cm", rates).offers).toMatchObject({
      price: 8000,
      priceCurrency: "XAF",
      availability: "https://schema.org/InStock",
    });
    const inEuros = productJsonLd(product({ stock: 0 }), shop({ currency: "EUR" }), "https://manushop.cm", rates);
    expect(inEuros.offers).toMatchObject({
      price: 15.24,
      priceCurrency: "EUR",
      availability: "https://schema.org/OutOfStock",
    });
  });

  it("neutralises '<' so a merchant-typed name can't close the script tag", () => {
    const json = serializeJsonLd(productJsonLd(product({ name: "</script><script>alert(1)" }), shop(), "https://x", rates));
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)");
  });
});
