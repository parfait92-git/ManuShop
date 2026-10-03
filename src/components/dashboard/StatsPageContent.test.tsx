const listByShopMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: { listByShop: (...args: unknown[]) => listByShopMock(...args) },
}));
const listOrderCostsMock = jest.fn();
const listProductCostsMock = jest.fn();
jest.mock("../../services/CostService", () => ({
  costService: {
    listOrderCosts: (...args: unknown[]) => listOrderCostsMock(...args),
    listProductCosts: (...args: unknown[]) => listProductCostsMock(...args),
  },
}));
const listProductsMock = jest.fn();
jest.mock("../../services/ProductService", () => ({
  productService: { listProducts: (...args: unknown[]) => listProductsMock(...args) },
}));

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatsPageContent } from "./StatsPageContent";

const now = new Date();
const ts = (date: Date) => ({ toDate: () => date, toMillis: () => date.getTime() });

describe("StatsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listByShopMock.mockResolvedValue([
      {
        id: "o1",
        shopId: "shop-1",
        clientName: "Awa",
        items: [{ productId: "wax", name: "Pagne wax", quantity: 2, unitPrice: 10000 }],
        subtotal: 20000,
        discount: 0,
        total: 20000,
        status: "delivered",
        createdAt: ts(now),
        updatedAt: ts(now),
      },
    ]);
    listOrderCostsMock.mockResolvedValue([
      { orderId: "o1", shopId: "shop-1", items: [{ productId: "wax", unitCost: 6000 }] },
    ]);
    listProductCostsMock.mockResolvedValue([
      { productId: "wax", shopId: "shop-1", purchasePrice: 6000 },
    ]);
    listProductsMock.mockResolvedValue([
      { id: "wax", name: "Pagne wax", category: "Mode", stock: 3, price: 10000 },
    ]);
  });

  it("shows this month's revenue, cost, gain and margin, the per-article detail and the stock value", async () => {
    render(<StatsPageContent shopId="shop-1" />);

    await screen.findByRole("button", { name: "Aide : Chiffre d'affaires" });
    expect(screen.getAllByText(/20\s000 FCFA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8\s000 FCFA/).length).toBeGreaterThan(0); // gain
    expect(screen.getAllByText("40 %").length).toBeGreaterThan(0);

    const table = screen.getByRole("region", { name: /Gains par article/ });
    expect(within(table).getByText("Pagne wax")).toBeInTheDocument();

    // 3 en stock × 6 000
    expect(screen.getByText(/18\s000 FCFA/)).toBeInTheDocument();
  });

  it("rejects a custom period whose start is after its end", async () => {
    const user = userEvent.setup();
    render(<StatsPageContent shopId="shop-1" />);
    await screen.findByRole("button", { name: "Aide : Chiffre d'affaires" });

    await user.click(screen.getByRole("button", { name: "Période personnalisée" }));
    const from = screen.getByLabelText("Du");
    await user.clear(from);
    await user.type(from, "2099-01-01");

    expect(screen.getByText(/date de début antérieure/)).toBeInTheDocument();
  });
});
