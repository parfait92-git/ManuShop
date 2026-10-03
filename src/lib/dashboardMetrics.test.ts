import { computeDashboardMetrics, percentChange, stockSummary } from "./dashboardMetrics";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";

/** Heure du Cameroun (UTC+1) → instant. */
const cm = (iso: string) => new Date(`${iso}+01:00`);
const NOW = cm("2026-10-15T12:00:00");

let n = 0;
function order(at: string, overrides: Partial<Order> = {}): Order {
  n += 1;
  const date = cm(at);
  return {
    id: `o${n}`,
    shopId: "shop-1",
    clientId: `c${n}`,
    clientName: "Client",
    clientPhone: "",
    clientAddress: "",
    items: [{ productId: "p1", name: "Robe", quantity: 1, unitPrice: 10000 }],
    subtotal: 10000,
    discount: 0,
    total: 10000,
    status: "delivered",
    createdAt: { toMillis: () => date.getTime(), toDate: () => date } as never,
    updatedAt: { toMillis: () => date.getTime(), toDate: () => date } as never,
    ...overrides,
  };
}

const product = (stock: number, stockThreshold = 2) => ({ stock, stockThreshold }) as Product;

describe("dashboardMetrics", () => {
  it("computes a percentage change, or nothing without a base", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(5, 0)).toBeNull();
  });

  it("counts only delivered orders as revenue, compared with last month", () => {
    const metrics = computeDashboardMetrics(
      [
        order("2026-10-02T09:00:00", { total: 20000 }),
        order("2026-10-03T09:00:00", { total: 5000, status: "delivering" }),
        order("2026-10-04T09:00:00", { total: 7000, status: "cancelled" }),
        order("2026-09-10T09:00:00", { total: 10000 }),
      ],
      [],
      NOW
    );
    expect(metrics.revenue).toEqual({ value: 20000, previous: 10000, change: 100 });
    // Commandes : annulées exclues.
    expect(metrics.orders).toEqual({ value: 2, previous: 1, change: 100 });
  });

  it("uses Cameroon time for month boundaries", () => {
    // 1er octobre 00:30 au Cameroun = 30 septembre 23:30 UTC : octobre.
    const metrics = computeDashboardMetrics([order("2026-10-01T00:30:00")], [], NOW);
    expect(metrics.revenue.value).toBe(10000);
    expect(metrics.revenue.previous).toBe(0);
    expect(metrics.revenue.change).toBeNull();
  });

  it("counts a client as new only for their very first order", () => {
    const metrics = computeDashboardMetrics(
      [
        order("2026-09-05T10:00:00", { clientId: "fidele" }),
        order("2026-10-05T10:00:00", { clientId: "fidele" }),
        order("2026-10-06T10:00:00", { clientId: "nouvelle" }),
        order("2026-10-07T10:00:00", { clientId: "nouvelle" }),
        order("2026-10-08T10:00:00", { clientId: undefined }),
      ],
      [],
      NOW
    );
    expect(metrics.newClients.value).toBe(1);
    expect(metrics.newClients.previous).toBe(1);
  });

  it("lists 12 months, oldest first, with delivered and ordered amounts", () => {
    const metrics = computeDashboardMetrics(
      [
        order("2026-10-02T09:00:00", { total: 20000 }),
        order("2026-10-03T09:00:00", { total: 5000, status: "under_review" }),
        order("2025-10-20T09:00:00", { total: 9000 }),
        order("2025-09-20T09:00:00", { total: 1 }),
      ],
      [],
      NOW
    );
    expect(metrics.monthly).toHaveLength(12);
    expect(new Date(metrics.monthly[0].monthStart)).toEqual(cm("2025-11-01T00:00:00"));
    expect(metrics.monthly[11]).toEqual(
      expect.objectContaining({ delivered: 20000, ordered: 25000 })
    );
    expect(metrics.monthly.reduce((s, m) => s + m.ordered, 0)).toBe(25000);
  });

  it("counts orders per day over the last 7 days, today last", () => {
    const metrics = computeDashboardMetrics(
      [
        order("2026-10-15T08:00:00"),
        order("2026-10-15T23:30:00"),
        order("2026-10-09T00:10:00"),
        order("2026-10-08T23:50:00"),
        order("2026-10-14T10:00:00", { status: "cancelled" }),
      ],
      [],
      NOW
    );
    expect(metrics.daily.map((d) => d.orders)).toEqual([1, 0, 0, 0, 0, 0, 2]);
    expect(new Date(metrics.daily[6].dayStart)).toEqual(cm("2026-10-15T00:00:00"));
  });

  it("summarises stock against each product's alert threshold", () => {
    expect(stockSummary([product(10), product(2), product(0), product(5, 5)])).toEqual({
      total: 4,
      inStock: 1,
      low: 2,
      out: 1,
      rate: 25,
    });
    expect(stockSummary([]).rate).toBeNull();
  });

  it("keeps the most recent orders first", () => {
    const metrics = computeDashboardMetrics(
      [order("2026-10-01T09:00:00"), order("2026-10-10T09:00:00"), order("2026-10-05T09:00:00")],
      [product(3)],
      NOW,
      { recent: 2 }
    );
    expect(metrics.recentOrders.map((o) => o.createdAt.toMillis())).toEqual([
      cm("2026-10-10T09:00:00").getTime(),
      cm("2026-10-05T09:00:00").getTime(),
    ]);
    expect(metrics.activeProducts).toBe(1);
    expect(metrics.hasOrders).toBe(true);
    expect(metrics.toProcess).toBe(0);
  });

  it("counts the orders still to move forward, whatever their date", () => {
    const metrics = computeDashboardMetrics(
      [
        order("2025-01-01T09:00:00", { status: "under_review" }),
        order("2026-10-10T09:00:00", { status: "ready_for_delivery" }),
        order("2026-10-11T09:00:00", { status: "delivering" }),
        order("2026-10-12T09:00:00", { status: "delivered" }),
        order("2026-10-12T10:00:00", { status: "cancelled" }),
      ],
      [],
      NOW
    );
    expect(metrics.toProcess).toBe(3);
  });
});
