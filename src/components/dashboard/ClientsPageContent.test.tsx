jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));
const listByShopMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: { listByShop: (...args: unknown[]) => listByShopMock(...args) },
}));

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClientsPageContent } from "./ClientsPageContent";

const ts = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return { toDate: () => d, toMillis: () => d.getTime() };
};

const base = {
  shopId: "shop-1",
  clientAddress: "Akwa",
  items: [{ productId: "p", name: "P", quantity: 2, unitPrice: 5000 }],
  subtotal: 10000,
  discount: 0,
  total: 10000,
  status: "delivered",
  updatedAt: ts(0),
};

describe("ClientsPageContent", () => {
  beforeEach(() => {
    listByShopMock.mockResolvedValue([
      { ...base, id: "o1", clientName: "Awa Diallo", clientPhone: "+237690000001", createdAt: ts(2) },
      { ...base, id: "o2", clientName: "Awa Diallo", clientPhone: "+237690000001", createdAt: ts(40), status: "cancelled" },
      { ...base, id: "o3", clientName: "Paul Mbarga", clientPhone: "+237699999999", createdAt: ts(100) },
    ]);
  });

  it("lists clients with their orders and amount spent, filterable by segment and searchable", async () => {
    const user = userEvent.setup();
    render(<ClientsPageContent shopId="shop-1" />);

    const table = await screen.findByRole("region", { name: "Liste des clients" });
    expect(within(table).getByRole("button", { name: "Voir la fiche de Awa Diallo" })).toBeInTheDocument();
    expect(within(table).getByText("Paul Mbarga")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inactifs · 1" }));
    expect(screen.queryByText("Awa Diallo")).not.toBeInTheDocument();
    expect(screen.getByText("Paul Mbarga")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tous · 2" }));
    await user.type(screen.getByLabelText("Rechercher un client"), "690000001");
    expect(screen.getByText("Awa Diallo")).toBeInTheDocument();
    expect(screen.queryByText("Paul Mbarga")).not.toBeInTheDocument();
  });

  it("opens a client's file with contact buttons and full order history", async () => {
    const user = userEvent.setup();
    render(<ClientsPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("button", { name: "Voir la fiche de Awa Diallo" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: /Appeler/ })).toHaveAttribute("href", "tel:+237690000001");
    expect(within(dialog).getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/237690000001");
    expect(within(dialog).getByText("Annulée")).toBeInTheDocument();
    expect(within(dialog).getByText("Livré")).toBeInTheDocument();
  });

  it("explains where clients come from when there are none yet", async () => {
    listByShopMock.mockResolvedValue([]);
    render(<ClientsPageContent shopId="shop-1" />);
    expect(await screen.findByText("Pas encore de client")).toBeInTheDocument();
  });
});
