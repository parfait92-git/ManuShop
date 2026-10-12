import { campaignImpacts, codeImpacts } from "@/lib/promotionImpact";
import type { Order } from "@/models/order/Order";

const order = (overrides: Partial<Order>): Order =>
  ({ id: "o", shopId: "s1", status: "delivered", items: [], subtotal: 0, discount: 0, total: 0, ...overrides }) as Order;

describe("campaignImpacts", () => {
  it("adds up the lines each campaign priced, counting an order once", () => {
    const impacts = campaignImpacts([
      order({
        items: [
          { productId: "a", name: "A", quantity: 2, unitPrice: 2800, promotionId: "flash", priceBeforeCampaign: 3500 },
          { productId: "b", name: "B", quantity: 1, unitPrice: 800, promotionId: "flash", priceBeforeCampaign: 1000 },
          { productId: "c", name: "C", quantity: 1, unitPrice: 5000 },
        ],
      }),
      order({ status: "under_review", items: [{ productId: "a", name: "A", quantity: 1, unitPrice: 2800, promotionId: "flash" }] }),
      order({ status: "cancelled", items: [{ productId: "a", name: "A", quantity: 9, unitPrice: 2800, promotionId: "flash", priceBeforeCampaign: 3500 }] }),
    ]);
    expect(impacts.get("flash")).toEqual({ orders: 2, units: 4, revenue: 9200, discount: 1600 });
    expect(impacts.size).toBe(1);
  });
});

describe("codeImpacts", () => {
  it("adds up the orders placed with each code, except those not sold", () => {
    const impacts = codeImpacts([
      order({ promoCodeId: "s1_X", total: 9000, discount: 1000, items: [{ productId: "a", name: "A", quantity: 2, unitPrice: 5000 }] }),
      order({ promoCodeId: "s1_X", total: 4500, discount: 500, items: [{ productId: "a", name: "A", quantity: 1, unitPrice: 5000 }] }),
      order({ promoCodeId: "s1_X", status: "returned", total: 4500, discount: 500 }),
      order({ total: 5000 }),
    ]);
    expect(impacts.get("s1_X")).toEqual({ orders: 2, units: 3, revenue: 13500, discount: 1500 });
  });
});
