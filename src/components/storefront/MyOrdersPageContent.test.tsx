const listByClientMock = jest.fn();
const cancelOrderMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: {
    listByClient: (...args: unknown[]) => listByClientMock(...args),
    cancelOrder: (...args: unknown[]) => cancelOrderMock(...args),
  },
}));

jest.mock("../dashboard/OrderReasonDialog", () => ({
  OrderReasonDialog: ({
    target,
    onConfirm,
  }: {
    target: { orderId: string; kind: string } | null;
    onConfirm: (reason: string) => void;
  }) =>
    target ? (
      <button type="button" onClick={() => onConfirm("Changement d'avis")}>
        Confirmer l&apos;annulation
      </button>
    ) : null,
}));

const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MyOrdersPageContent } from "@/components/storefront/MyOrdersPageContent";
import type { Order } from "@/models/order/Order";

function fakeTimestamp(iso: string) {
  const date = new Date(iso);
  return { toMillis: () => date.getTime(), toDate: () => date };
}

function fakeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    shopId: "shop-1",
    clientId: "client-1",
    clientName: "Fatou Ba",
    clientPhone: "+237600000000",
    clientAddress: "Douala",
    items: [{ productId: "p1", name: "Wax", quantity: 2, unitPrice: 5000 }],
    subtotal: 10000,
    discount: 0,
    total: 10000,
    status: "under_review",
    createdAt: fakeTimestamp("2026-01-10T00:00:00Z") as never,
    updatedAt: fakeTimestamp("2026-01-10T00:00:00Z") as never,
    ...overrides,
  };
}

describe("MyOrdersPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows an empty state when the client has no order", async () => {
    listByClientMock.mockResolvedValue([]);
    render(<MyOrdersPageContent clientId="client-1" />);
    expect(
      await screen.findByText("Vous n'avez pas encore de commande.")
    ).toBeInTheDocument();
    expect(listByClientMock).toHaveBeenCalledWith("client-1");
  });

  it("lists the client's orders with a cancel button while under review", async () => {
    listByClientMock.mockResolvedValue([fakeOrder()]);
    render(<MyOrdersPageContent clientId="client-1" />);

    expect(await screen.findByText("Wax ×2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("hides the cancel button once the order is past under_review", async () => {
    listByClientMock.mockResolvedValue([fakeOrder({ status: "delivering" })]);
    render(<MyOrdersPageContent clientId="client-1" />);

    await screen.findByText("Wax ×2");
    expect(
      screen.queryByRole("button", { name: "Annuler" })
    ).not.toBeInTheDocument();
  });

  it("cancels an order through the reason dialog", async () => {
    listByClientMock.mockResolvedValue([fakeOrder()]);
    cancelOrderMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MyOrdersPageContent clientId="client-1" />);

    await user.click(await screen.findByRole("button", { name: "Annuler" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmer l'annulation" })
    );

    await waitFor(() =>
      expect(cancelOrderMock).toHaveBeenCalledWith("o1", "Changement d'avis")
    );
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(await screen.findByText("Annulée")).toBeInTheDocument();
  });
});
