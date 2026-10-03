const useDashboardDataMock = jest.fn();
jest.mock("../../../hooks/useDashboardData", () => ({
  useDashboardData: (...args: unknown[]) => useDashboardDataMock(...args),
}));
jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ profile: { displayName: "Awa Mbarga" } }),
}));
jest.mock("../../../hooks/useCurrentShop", () => ({
  useCurrentShop: () => ({ shop: { name: "Chez Awa", logo: "" } }),
}));
jest.mock("../../../hooks/useShopCurrency", () => ({ useShopCurrency: () => "XAF" }));
jest.mock("../../ui/CoachMark", () => ({ CoachMark: () => null }));
// Recharts mesure son conteneur, nul dans jsdom : on vérifie la structure,
// pas le dessin.
jest.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return new Proxy({}, { get: () => Stub });
});

import { render, screen, within } from "@testing-library/react";

import { DashboardOverview } from "./DashboardOverview";
import { computeDashboardMetrics } from "@/lib/dashboardMetrics";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";

const now = new Date();
const ts = { toMillis: () => now.getTime(), toDate: () => now } as never;
const order = (overrides: Partial<Order>): Order => ({
  id: "o1",
  shopId: "shop-1",
  clientId: "c1",
  clientName: "Fatou Ba",
  clientPhone: "",
  clientAddress: "",
  items: [{ productId: "p1", name: "Robe", quantity: 2, unitPrice: 15000 }],
  subtotal: 30000,
  discount: 0,
  total: 30000,
  status: "delivered",
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
});
const product = (stock: number) => ({ stock, stockThreshold: 2 }) as Product;

describe("DashboardOverview", () => {
  it("carries the default theme's dashboard on its container", () => {
    useDashboardDataMock.mockReturnValue({ status: "loading" });
    const { container } = render(<DashboardOverview shopId="shop-1" />);
    expect(container.firstChild).toHaveAttribute("data-dashboard-theme", "manushop");
    expect(screen.getByText("Chargement du tableau de bord...")).toBeInTheDocument();
  });

  it("can be given another theme", () => {
    useDashboardDataMock.mockReturnValue({ status: "loading" });
    const { container } = render(<DashboardOverview shopId="shop-1" theme="light" />);
    expect(container.firstChild).toHaveAttribute("data-dashboard-theme", "light");
  });

  it("shows the shop's real figures", () => {
    useDashboardDataMock.mockReturnValue({
      status: "ready",
      metrics: computeDashboardMetrics(
        [order({}), order({ id: "o2", clientName: "Jean", status: "under_review", total: 5000 })],
        [product(10), product(1), product(0)]
      ),
    });
    render(<DashboardOverview shopId="shop-1" />);

    expect(screen.getByRole("heading", { name: "Bonjour, Awa" })).toBeInTheDocument();
    expect(screen.getByText("Chez Awa")).toBeInTheDocument();
    expect(screen.getByText("30 000 FCFA", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("2 en alerte de stock")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Produits en stock" })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByRole("link", { name: "Réapprovisionner 2 articles" })).toHaveAttribute(
      "href",
      "/dashboard/products"
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText("Fatou Ba")).toBeInTheDocument();
    expect(within(table).getByText("En cours d'analyse")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir ma boutique" })).toHaveAttribute("href", "/boutique/shop-1");
    expect(screen.getByRole("link", { name: /1 commande à traiter/ })).toHaveAttribute(
      "href",
      "/dashboard/orders"
    );
  });

  it("never draws made-up figures for a new shop", () => {
    useDashboardDataMock.mockReturnValue({ status: "ready", metrics: computeDashboardMetrics([], []) });
    render(<DashboardOverview shopId="shop-1" />);

    expect(screen.getByText("Aucune vente sur les 12 derniers mois pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText("Aucune commande ces 7 derniers jours.")).toBeInTheDocument();
    expect(screen.getByText("Aucune commande pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText("Ajoutez vos premiers produits pour suivre votre stock.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains a loading failure", () => {
    useDashboardDataMock.mockReturnValue({ status: "error" });
    render(<DashboardOverview shopId="shop-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les chiffres");
  });
});
