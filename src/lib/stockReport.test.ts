import {
  buildStockMovementsReport,
  buildStockOutflowReport,
  stockMovementsTable,
  stockMovementsTotals,
  buildStockStateReport,
  stockOutflowTable,
  stockStateTable,
  stockStateTotals,
  toCsv,
} from "./stockReport";
import type { StockMovement } from "@/models/stock/StockMovement";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";

const product = (id: string, overrides: Partial<Product> = {}) =>
  ({ id, name: `Article ${id}`, category: "Mode", price: 1000, stock: 10, stockThreshold: 2, isPublished: true, ...overrides }) as Product;

let n = 0;
function order(at: string, status: Order["status"], items: [string, number][]): Order {
  n += 1;
  const ms = Date.parse(at);
  return {
    id: `o${n}`,
    status,
    items: items.map(([productId, quantity]) => ({ productId, name: `Commandé ${productId}`, quantity, unitPrice: 1000 })),
    createdAt: { toMillis: () => ms },
  } as unknown as Order;
}

describe("stockReport", () => {
  const products = [
    product("a", { stock: 0 }),
    product("b", { stock: 2, price: 2500 }),
    product("c", { stock: 8, name: "Robe", isPublished: false }),
  ];

  it("lists the stock, what needs action first, with values", () => {
    const report = buildStockStateReport(products, new Map([["b", 1500]]));
    expect(report.rows.map((r) => [r.name, r.status])).toEqual([
      ["Article a", "Rupture"],
      ["Article b", "Faible"],
      ["Robe", "En stock"],
    ]);
    expect(report.rows[1]).toEqual(expect.objectContaining({ valueAtPrice: 5000, purchasePrice: 1500, valueAtCost: 3000 }));
    expect(report.totals).toEqual({
      products: 3,
      units: 10,
      out: 1,
      low: 1,
      inStock: 1,
      valueAtPrice: 13000,
      valueAtCost: 3000,
      missingCost: 1,
    });
    expect(stockStateTotals(report).at(-1)).toEqual(["Valeur au prix d'achat", "3 000 FCFA (1 sans prix d'achat)"]);
  });

  it("leaves purchase prices out for a seller", () => {
    const report = buildStockStateReport(products, null);
    expect(report.rows[1]).not.toHaveProperty("purchasePrice");
    expect(report.totals.valueAtCost).toBeNull();
    const table = stockStateTable(report, false, true);
    expect(table.headers).not.toContain("Prix d'achat");
    expect(table.rows[2]).toEqual(["Robe", "Mode", 8, 2, "En stock", "1 000 FCFA", "8 000 FCFA", "Non"]);
  });

  it("counts what was ordered, delivered and put back in stock over the period", () => {
    const period = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-11-01T00:00:00Z") };
    const report = buildStockOutflowReport(
      [
        order("2026-10-02T10:00:00Z", "delivered", [["b", 2], ["c", 1]]),
        order("2026-10-03T10:00:00Z", "returned", [["b", 1]]),
        order("2026-10-04T10:00:00Z", "cancelled", [["b", 5]]),
        order("2026-10-05T10:00:00Z", "under_review", [["gone", 3]]),
        order("2026-09-30T10:00:00Z", "delivered", [["b", 9]]),
      ],
      products,
      period
    );
    expect(report.totals).toEqual({ orders: 4, ordered: 7, delivered: 4, restocked: 6 });
    expect(stockOutflowTable(report).rows).toEqual([
      ["Article b", "Mode", 3, 3, 6, 2],
      ["Commandé gone", "Sans catégorie", 3, 0, 0, "Supprimé"],
      ["Robe", "Mode", 1, 1, 0, 8],
    ]);
  });

  it("writes a CSV that Excel opens with its accents, numbers as numbers", () => {
    const csv = toCsv(stockStateTable(buildStockStateReport([product("x", { name: 'Pagne "wax"; 6 yards' })], null), false, false));
    expect(csv.startsWith("﻿Article;Catégorie;Stock;Seuil;Statut;Prix de vente;Valeur (vente);Publié\r\n")).toBe(true);
    expect(csv).toContain('"Pagne ""wax""; 6 yards";Mode;10;2;En stock;1000;10000;Oui\r\n');
  });
});

describe("buildStockMovementsReport", () => {
  const at = (iso: string) => ({ toMillis: () => Date.parse(iso), toDate: () => new Date(iso) });
  const period = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-11-01T00:00:00Z") };
  const m = (id: string, type: string, quantity: number, iso: string) =>
    ({ id, productName: "Robe", type, quantity, stockAfter: 0, createdAt: at(iso) }) as unknown as StockMovement;

  it("keeps the period's movements oldest first and totals entries, exits, restocks and corrections", () => {
    const report = buildStockMovementsReport(
      [
        m("adj", "adjustment", -2, "2026-10-20T10:00:00Z"),
        m("init", "initial", 10, "2026-10-01T08:00:00Z"),
        m("order", "order", -3, "2026-10-05T10:00:00Z"),
        m("restock", "restock", 6, "2026-10-10T10:00:00Z"),
        m("cancel", "cancelled", 1, "2026-10-06T10:00:00Z"),
        m("before", "restock", 50, "2026-09-30T10:00:00Z"),
        { ...m("pending", "restock", 4, "2026-10-21T10:00:00Z"), createdAt: undefined } as unknown as StockMovement,
      ],
      period
    );

    expect(report.movements.map((x) => x.id)).toEqual(["init", "order", "cancel", "restock", "adj"]);
    // Le stock de départ n'est ni une entrée ni une sortie.
    expect(report.totals).toEqual({ movements: 5, unitsIn: 7, unitsOut: 5, restocked: 6, adjusted: -2 });
    expect(stockMovementsTotals(report)).toContainEqual(["Écart des corrections d'inventaire", "-2"]);
  });

  it("signs the change for display, keeps raw numbers for the CSV, and names who made it", () => {
    const report = buildStockMovementsReport(
      [
        { ...m("r", "restock", 6, "2026-10-10T10:00:00Z"), actorName: "Awa", note: "Fournisseur" },
        { ...m("o", "order", -2, "2026-10-11T10:00:00Z"), orderId: "abcdefgh99" },
      ] as StockMovement[],
      period
    );

    expect(stockMovementsTable(report, true).rows[0].slice(1)).toEqual(["Robe", "Réapprovisionnement", "+6", 0, "Awa", "Fournisseur"]);
    expect(stockMovementsTable(report, false).rows[0][3]).toBe(6);
    expect(stockMovementsTable(report, true).rows[1].slice(5)).toEqual(["Client", "Commande ABCDEFGH"]);
  });
});

describe("état du stock avec des versions (BF-17)", () => {
  it("lists each version on its own line, at its own price", () => {
    const report = buildStockStateReport(
      [
        {
          id: "p1",
          name: "Huile",
          category: "Soins",
          price: 3000,
          stock: 5,
          stockThreshold: 2,
          isPublished: true,
          variants: { a: { label: "250 ml", stock: 5, position: 0 }, b: { label: "500 ml", stock: 0, price: 5500, position: 1 } },
        } as unknown as Product,
      ],
      new Map([["p1", 1800]])
    );
    expect(report.rows.map((r) => [r.name, r.stock, r.status, r.price, r.valueAtPrice, r.valueAtCost])).toEqual([
      ["Huile — 500 ml", 0, "Rupture", 5500, 0, 0],
      ["Huile — 250 ml", 5, "En stock", 3000, 15000, 9000],
    ]);
    expect(report.totals.products).toBe(1);
    expect(report.totals.out).toBe(1);
  });
});
