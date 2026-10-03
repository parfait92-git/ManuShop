import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";

import {
  computeProfitReport,
  computeStockValue,
  customPeriod,
  presetPeriod,
  startOfShopWeek,
} from "./profitReport";

const at = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => Date.parse(iso) });

function order(id: string, overrides: Partial<Order> = {}): Order {
  return {
    id,
    shopId: "shop-1",
    clientName: "Client",
    clientPhone: "",
    clientAddress: "",
    items: [{ productId: "wax", name: "Wax", quantity: 2, unitPrice: 5000 }],
    subtotal: 10000,
    discount: 0,
    total: 10000,
    status: "delivered",
    createdAt: at("2026-10-05T10:00:00Z") as never,
    updatedAt: at("2026-10-05T10:00:00Z") as never,
    ...overrides,
  };
}

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    shopId: "shop-1",
    name: id === "wax" ? "Pagne wax" : "Savon",
    description: "",
    price: 5000,
    category: id === "wax" ? "Mode" : "Hygiène",
    images: [],
    stock: 10,
    stockThreshold: 1,
    isPromo: false,
    createdAt: at("2026-01-01T00:00:00Z") as never,
    updatedAt: at("2026-01-01T00:00:00Z") as never,
    ...overrides,
  };
}

const OCTOBER = customPeriod("2026-10-01", "2026-10-31");
const products = [product("wax"), product("savon")];

describe("périodes (heure du Cameroun, UTC+1)", () => {
  it("starts the week on Monday at local midnight", () => {
    // Mercredi 7 octobre 2026, 10h au Cameroun
    expect(startOfShopWeek(new Date("2026-10-07T09:00:00Z")).toISOString()).toBe(
      "2026-10-04T23:00:00.000Z" // lundi 5 octobre 00h00 au Cameroun
    );
  });

  it("includes the whole last day of a custom period", () => {
    const period = customPeriod("2026-10-01", "2026-10-31");
    expect(period.from.toISOString()).toBe("2026-09-30T23:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-10-31T23:00:00.000Z");
  });

  it("covers the current month up to the end of today", () => {
    const period = presetPeriod("month", new Date("2026-10-15T12:00:00Z"));
    expect(period.from.toISOString()).toBe("2026-09-30T23:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-10-15T23:00:00.000Z");
  });
});

describe("computeProfitReport", () => {
  it("counts delivered orders of the period only", () => {
    const report = computeProfitReport({
      orders: [
        order("delivered"),
        order("pending", { status: "under_review" }),
        order("cancelled", { status: "cancelled" }),
        order("returned", { status: "returned" }),
        order("september", { createdAt: at("2026-09-30T22:59:00Z") as never }),
      ],
      orderCosts: [],
      productCosts: [{ productId: "wax", shopId: "shop-1", purchasePrice: 3000 }],
      products,
      period: OCTOBER,
    });

    expect(report.ordersCount).toBe(1);
    expect(report.totals).toMatchObject({ revenue: 10000, cost: 6000, gain: 4000, quantity: 2 });
    expect(report.totals.marginRate).toBeCloseTo(0.4);
  });

  it("prefers the purchase price frozen at sale time over today's, estimates older sales, and keeps cost-less sales out of the gain", () => {
    const report = computeProfitReport({
      orders: [
        order("recorded"),
        order("older"),
        order("no-cost", {
          items: [{ productId: "savon", name: "Savon", quantity: 1, unitPrice: 500 }],
          subtotal: 500,
          total: 500,
        }),
      ],
      orderCosts: [
        { orderId: "recorded", shopId: "shop-1", items: [{ productId: "wax", unitCost: 2000 }] },
      ],
      // Prix d'achat actuel, augmenté depuis la vente "recorded"
      productCosts: [{ productId: "wax", shopId: "shop-1", purchasePrice: 3000 }],
      products,
      period: OCTOBER,
    });

    expect(report.totals).toMatchObject({
      revenue: 20500,
      revenueWithCost: 20000,
      cost: 2 * 2000 + 2 * 3000,
      gain: 10000,
      estimatedLines: 1,
      unknownLines: 1,
    });
    const savon = report.byProduct.find((g) => g.key === "savon")!;
    expect(savon).toMatchObject({ revenue: 500, revenueWithCost: 0, marginRate: null });
  });

  it("spreads an order discount across its lines", () => {
    const report = computeProfitReport({
      orders: [order("discounted", { discount: 1000, total: 9000 })],
      orderCosts: [],
      productCosts: [{ productId: "wax", shopId: "shop-1", purchasePrice: 3000 }],
      products,
      period: OCTOBER,
    });

    expect(report.totals).toMatchObject({ revenue: 9000, gain: 3000 });
  });

  it("groups gains by product (best first), category, week and month", () => {
    const report = computeProfitReport({
      orders: [
        order("w1"),
        order("w2", {
          createdAt: at("2026-10-14T10:00:00Z") as never,
          items: [{ productId: "savon", name: "Savon", quantity: 10, unitPrice: 500 }],
          subtotal: 5000,
          total: 5000,
        }),
      ],
      orderCosts: [],
      productCosts: [
        { productId: "wax", shopId: "shop-1", purchasePrice: 3000 },
        { productId: "savon", shopId: "shop-1", purchasePrice: 100 },
      ],
      products,
      period: OCTOBER,
    });

    // Même gain : départagés par le chiffre d'affaires (10 000 contre 5 000).
    expect(report.byProduct.map((g) => [g.label, g.gain])).toEqual([
      ["Pagne wax", 4000],
      ["Savon", 4000],
    ]);
    expect(report.byCategory.map((g) => g.label).sort()).toEqual(["Hygiène", "Mode"]);
    expect(report.byWeek.map((g) => g.label)).toEqual([
      "Semaine du 5 oct.",
      "Semaine du 12 oct.",
    ]);
    expect(report.byMonth).toHaveLength(1);
    expect(report.byMonth[0]).toMatchObject({ label: "octobre 2026", gain: 8000 });
  });

  it("keeps the name and category of a product sold then deleted", () => {
    const report = computeProfitReport({
      orders: [order("gone", { items: [{ productId: "deleted", name: "Ancien article", quantity: 1, unitPrice: 1000 }], subtotal: 1000, total: 1000 })],
      orderCosts: [],
      productCosts: [],
      products,
      period: OCTOBER,
    });
    expect(report.byProduct[0].label).toBe("Ancien article");
    expect(report.byCategory[0].label).toBe("Sans catégorie");
  });
});

describe("computeStockValue", () => {
  it("values stock at purchase price and counts products without one", () => {
    expect(
      computeStockValue(
        [product("wax", { stock: 4 }), product("savon", { stock: 3 }), product("x", { stock: 0 })],
        [{ productId: "wax", shopId: "shop-1", purchasePrice: 3000 }]
      )
    ).toEqual({ value: 12000, productsWithoutCost: 1 });
  });
});
