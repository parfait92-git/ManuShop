import { hasPriceRange, hasVariants, lineName, listVariants, lowestPrice, totalVariantStock, variantOnPromo, variantPrice } from "./variants";

const product = {
  price: 3000,
  variants: {
    b: { label: "500 ml", stock: 0, price: 5500, position: 1 },
    a: { label: "250 ml", stock: 4, position: 0 },
    c: { label: "1 l", stock: 2, price: 9000, position: 2 },
  },
};

describe("variants", () => {
  it("lists versions in their display order", () => {
    expect(listVariants(product).map((v) => `${v.id}:${v.label}`)).toEqual(["a:250 ml", "b:500 ml", "c:1 l"]);
    expect(hasVariants(product)).toBe(true);
    expect(hasVariants({})).toBe(false);
  });

  it("prices a version at its own price, otherwise at the product's (promotion included)", () => {
    expect(variantPrice(product, product.variants.b)).toBe(5500);
    expect(variantPrice(product, product.variants.a)).toBe(3000);
    const promo = { ...product, isPromo: true, promoPrice: 2500 };
    expect(variantPrice(promo, promo.variants.a)).toBe(2500);
    expect(variantPrice(promo, promo.variants.b)).toBe(5500);
    expect(variantOnPromo(promo, promo.variants.a)).toBe(true);
    expect(variantOnPromo(promo, promo.variants.b)).toBe(false);
  });

  it("starts the price range at the cheapest version in stock", () => {
    expect(lowestPrice(product)).toBe(3000);
    expect(lowestPrice({ ...product, variants: { ...product.variants, a: { ...product.variants.a, stock: 0 } } })).toBe(9000);
    expect(hasPriceRange(product)).toBe(true);
    expect(hasPriceRange({ price: 1, variants: { a: { label: "S", stock: 1, position: 0 }, b: { label: "M", stock: 1, position: 1 } } })).toBe(false);
  });

  it("names an ordered line with its version, and totals the stock", () => {
    expect(lineName("Huile de coco", "500 ml")).toBe("Huile de coco — 500 ml");
    expect(lineName("Savon")).toBe("Savon");
    expect(totalVariantStock(product.variants)).toBe(6);
  });
});
