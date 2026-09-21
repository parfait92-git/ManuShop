import { CategorySchema, ProductSchema } from "./product";

describe("ProductSchema", () => {
  const validInput = {
    name: "Ensemble Wax",
    description: "Ensemble deux pièces en wax.",
    price: "10000",
    category: "Mode",
    stock: "5",
    stockThreshold: "2",
    isPromo: false,
  };

  it("accepts a valid non-promo product and coerces numeric fields", () => {
    const result = ProductSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(10000);
      expect(result.data.stock).toBe(5);
    }
  });

  it("rejects a non-positive price", () => {
    expect(
      ProductSchema.safeParse({ ...validInput, price: "0" }).success
    ).toBe(false);
  });

  it("rejects a negative stock", () => {
    expect(
      ProductSchema.safeParse({ ...validInput, stock: "-1" }).success
    ).toBe(false);
  });

  it("requires a promo price when isPromo is true", () => {
    const result = ProductSchema.safeParse({
      ...validInput,
      isPromo: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("promoPrice"))
      ).toBe(true);
    }
  });

  it("rejects a promo price greater than or equal to the regular price", () => {
    const result = ProductSchema.safeParse({
      ...validInput,
      isPromo: true,
      promoPrice: "10000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid promo price below the regular price", () => {
    const result = ProductSchema.safeParse({
      ...validInput,
      isPromo: true,
      promoPrice: "8000",
    });
    expect(result.success).toBe(true);
  });
});

describe("CategorySchema", () => {
  it("accepts a valid category name", () => {
    expect(CategorySchema.safeParse({ name: "Laitiers" }).success).toBe(true);
  });

  it("rejects a too-short category name", () => {
    expect(CategorySchema.safeParse({ name: "L" }).success).toBe(false);
  });
});
