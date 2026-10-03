const useAuthMock = jest.fn();
jest.mock("../../providers/AuthProvider", () => ({ useAuth: () => useAuthMock() }));
jest.mock("../../../hooks/useCurrentShop", () => ({
  useCurrentShop: () => ({ shop: { name: "Chez Awa", themeColor: "" } }),
}));
jest.mock("../../../hooks/useShopTheme", () => ({
  useShopTheme: () => ({ theme: { invoiceColor: "#B4451F" } }),
}));
const listActiveMock = jest.fn();
jest.mock("../../../services/ProductService", () => ({
  productService: { listActive: (...a: unknown[]) => listActiveMock(...a) },
}));
const listByShopMock = jest.fn();
jest.mock("../../../services/OrderService", () => ({
  orderService: { listByShop: (...a: unknown[]) => listByShopMock(...a) },
}));
const listProductCostsMock = jest.fn();
jest.mock("../../../services/CostService", () => ({
  costService: { listProductCosts: (...a: unknown[]) => listProductCostsMock(...a) },
}));
const listShopMovementsMock = jest.fn();
jest.mock("../../../services/StockService", () => ({
  stockService: { listShopMovements: (...a: unknown[]) => listShopMovementsMock(...a) },
}));
const downloadCsvMock = jest.fn();
const downloadPdfMock = jest.fn().mockResolvedValue(undefined);
jest.mock("./downloadReport", () => ({
  downloadCsv: (...a: unknown[]) => downloadCsvMock(...a),
  downloadPdf: (...a: unknown[]) => downloadPdfMock(...a),
}));
jest.mock("../../ui/CoachMark", () => ({ CoachMark: () => null }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StockReportsPageContent } from "./StockReportsPageContent";

const products = [
  { id: "p1", name: "Robe", category: "Mode", price: 15000, stock: 1, stockThreshold: 2, isPublished: true },
  { id: "p2", name: "Sac", category: "Mode", price: 8000, stock: 10, stockThreshold: 2, isPublished: true },
];

describe("StockReportsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listActiveMock.mockResolvedValue(products);
    listByShopMock.mockResolvedValue([]);
    listProductCostsMock.mockResolvedValue([{ productId: "p1", purchasePrice: 9000 }]);
    listShopMovementsMock.mockResolvedValue([]);
  });

  it("lists this month's stock movements in order, with raw numbers in the CSV", async () => {
    useAuthMock.mockReturnValue({ profile: { role: "seller" } });
    const now = Date.now();
    const at = (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) });
    listShopMovementsMock.mockResolvedValue([
      { id: "m2", productName: "Robe", type: "order", quantity: -2, stockAfter: 1, orderId: "abcdefgh1", createdAt: at(now - 1000) },
      { id: "m1", productName: "Robe", type: "restock", quantity: 3, stockAfter: 3, actorName: "Awa", note: "Fournisseur", createdAt: at(now - 2000) },
      { id: "old", productName: "Sac", type: "restock", quantity: 9, stockAfter: 9, createdAt: at(now - 400 * 86_400_000) },
    ]);
    const user = userEvent.setup();
    render(<StockReportsPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("radio", { name: /Mouvements de stock/ }));

    expect(screen.getByRole("columnheader", { name: "Stock après" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Réapprovisionnement");
    expect(rows[0]).toHaveTextContent("+3");
    expect(rows[0]).toHaveTextContent("Fournisseur");
    expect(rows[1]).toHaveTextContent("Commande ABCDEFGH");
    expect(screen.getByText("Unités entrées").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Unités sorties").nextSibling).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Télécharger en CSV" }));
    const [csvProps, csvName] = downloadCsvMock.mock.calls[0];
    expect(csvName).toMatch(/^mouvements-de-stock-.*-chez-awa\.csv$/);
    expect(csvProps.table.rows[0].slice(1, 6)).toEqual(["Robe", "Réapprovisionnement", 3, 3, "Awa"]);
  });

  it("shows the manager the stock state with purchase prices, and downloads it", async () => {
    useAuthMock.mockReturnValue({ profile: { role: "admin" } });
    const user = userEvent.setup();
    render(<StockReportsPageContent shopId="shop-1" />);

    expect(await screen.findByRole("columnheader", { name: "Prix d'achat" })).toBeInTheDocument();
    expect(screen.getByText("Valeur au prix d'achat")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Télécharger en CSV" }));
    const [csvProps, csvName] = downloadCsvMock.mock.calls[0];
    expect(csvName).toMatch(/^etat-du-stock-\d{4}-\d{2}-\d{2}-chez-awa\.csv$/);
    // Montants en nombres bruts dans le CSV.
    expect(csvProps.table.rows[0]).toEqual(["Robe", "Mode", 1, 2, "Faible", 15000, 9000, 9000, 15000, "Oui"]);

    await user.click(screen.getByRole("button", { name: "Télécharger en PDF" }));
    await waitFor(() => expect(downloadPdfMock).toHaveBeenCalled());
    expect(downloadPdfMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ title: "État du stock", shopName: "Chez Awa", color: "#B4451F" })
    );
  });

  it("never shows purchase prices to a seller", async () => {
    useAuthMock.mockReturnValue({ profile: { role: "seller" } });
    render(<StockReportsPageContent shopId="shop-1" />);

    expect(await screen.findByRole("columnheader", { name: "Prix de vente" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Prix d'achat" })).toBeNull();
    expect(listProductCostsMock).not.toHaveBeenCalled();
  });

  it("asks for both dates of a custom period", async () => {
    useAuthMock.mockReturnValue({ profile: { role: "admin" } });
    const user = userEvent.setup();
    render(<StockReportsPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("radio", { name: /Sorties de stock/ }));
    expect(screen.getByRole("heading", { name: "Sorties de stock" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Période", { exact: true }), "custom");
    expect(screen.getByText("Choisissez les dates de début et de fin de la période.")).toBeInTheDocument();
  });
});
