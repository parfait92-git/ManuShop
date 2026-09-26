jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({
    profile: { id: "uid-1", displayName: "Ada Diallo", role: "admin" },
  }),
}));

const listByShopMock = jest.fn();
const advanceStatusMock = jest.fn();
const cancelOrderMock = jest.fn();
const markReturnedMock = jest.fn();
const createOrderMock = jest.fn();
const getOrderMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: {
    listByShop: (...args: unknown[]) => listByShopMock(...args),
    advanceStatus: (...args: unknown[]) => advanceStatusMock(...args),
    cancelOrder: (...args: unknown[]) => cancelOrderMock(...args),
    markReturned: (...args: unknown[]) => markReturnedMock(...args),
    createOrder: (...args: unknown[]) => createOrderMock(...args),
    getOrder: (...args: unknown[]) => getOrderMock(...args),
  },
}));

jest.mock("../../services/ProductService", () => ({
  productService: { listActive: jest.fn().mockResolvedValue([]) },
}));

const logOrderStatusChangedMock = jest.fn();
const logOrderCancelledMock = jest.fn();
const logOrderReturnedMock = jest.fn();
const logOrderCreatedMock = jest.fn();
jest.mock("../../services/ActivityLogService", () => ({
  activityLogService: {
    logOrderStatusChanged: (...args: unknown[]) => logOrderStatusChangedMock(...args),
    logOrderCancelled: (...args: unknown[]) => logOrderCancelledMock(...args),
    logOrderReturned: (...args: unknown[]) => logOrderReturnedMock(...args),
    logOrderCreated: (...args: unknown[]) => logOrderCreatedMock(...args),
  },
}));

jest.mock("./OrderReasonDialog", () => ({
  OrderReasonDialog: ({
    target,
    onConfirm,
  }: {
    target: { orderId: string; kind: string } | null;
    onConfirm: (reason: string) => void;
  }) =>
    target ? (
      <div data-testid="reason-dialog">
        <span>{target.kind}</span>
        <button type="button" onClick={() => onConfirm("Motif de test")}>
          Confirmer le motif
        </button>
      </div>
    ) : null,
}));

jest.mock("./ManualOrderDialog", () => ({
  ManualOrderDialog: ({
    open,
    onSubmit,
  }: {
    open: boolean;
    onSubmit: (input: {
      clientName: string;
      clientPhone: string;
      clientAddress: string;
      items: { productId: string; name: string; quantity: number; unitPrice: number }[];
    }) => void;
  }) =>
    open ? (
      <div data-testid="manual-order-dialog">
        <button
          type="button"
          onClick={() =>
            onSubmit({
              clientName: "Client de passage",
              clientPhone: "",
              clientAddress: "",
              items: [
                { productId: "p1", name: "Wax", quantity: 1, unitPrice: 5000 },
              ],
            })
          }
        >
          Soumettre la commande manuelle
        </button>
      </div>
    ) : null,
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

function table() {
  return within(screen.getByRole("table"));
}

import { OrdersPageContent } from "@/components/dashboard/OrdersPageContent";
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

describe("OrdersPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows an empty state when the shop has no order yet", async () => {
    listByShopMock.mockResolvedValue([]);
    render(<OrdersPageContent shopId="shop-1" />);
    expect(
      await screen.findByText("Aucune commande pour le moment.")
    ).toBeInTheDocument();
  });

  it("lists orders with their status badge", async () => {
    listByShopMock.mockResolvedValue([
      fakeOrder({ id: "o1", clientName: "Fatou Ba", status: "under_review" }),
    ]);
    render(<OrdersPageContent shopId="shop-1" />);

    expect(await screen.findByText("Fatou Ba")).toBeInTheDocument();
    expect(table().getByText("En cours d'analyse")).toBeInTheDocument();
  });

  it("advances an order to 'ready_for_delivery' and logs the change", async () => {
    listByShopMock.mockResolvedValue([fakeOrder({ status: "under_review" })]);
    advanceStatusMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OrdersPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("button", { name: "Prêt pour livraison" }));

    await waitFor(() =>
      expect(advanceStatusMock).toHaveBeenCalledWith("o1", "ready_for_delivery")
    );
    expect(logOrderStatusChangedMock).toHaveBeenCalledWith(
      { shopId: "shop-1", actorId: "uid-1", actorName: "Ada Diallo" },
      "o1",
      "ready_for_delivery"
    );
    await waitFor(() =>
      expect(table().getByText("Prêt pour la livraison")).toBeInTheDocument()
    );
  });

  it("cancels an order through the reason dialog and restocks", async () => {
    listByShopMock.mockResolvedValue([fakeOrder({ status: "under_review" })]);
    cancelOrderMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OrdersPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("button", { name: "Annuler" }));
    expect(screen.getByTestId("reason-dialog")).toHaveTextContent("cancel");
    await user.click(screen.getByRole("button", { name: "Confirmer le motif" }));

    await waitFor(() =>
      expect(cancelOrderMock).toHaveBeenCalledWith("o1", "Motif de test")
    );
    expect(logOrderCancelledMock).toHaveBeenCalled();
    await waitFor(() => expect(table().getByText("Annulée")).toBeInTheDocument());
  });

  it("marks a delivered order as defective through the reason dialog and restocks", async () => {
    listByShopMock.mockResolvedValue([fakeOrder({ status: "delivered" })]);
    markReturnedMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OrdersPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("button", { name: "Défectueux" }));
    await user.click(screen.getByRole("button", { name: "Confirmer le motif" }));

    await waitFor(() =>
      expect(markReturnedMock).toHaveBeenCalledWith("o1", "defective", "Motif de test")
    );
    expect(logOrderReturnedMock).toHaveBeenCalled();
    await waitFor(() => expect(table().getByText("Défectueux")).toBeInTheDocument());
  });

  it("creates a manual order and prepends it to the list", async () => {
    listByShopMock.mockResolvedValue([]);
    createOrderMock.mockResolvedValue({ orderId: "o-new" });
    getOrderMock.mockResolvedValue(
      fakeOrder({ id: "o-new", clientName: "Client de passage", clientId: undefined })
    );
    const user = userEvent.setup();
    render(<OrdersPageContent shopId="shop-1" />);

    await user.click(await screen.findByRole("button", { name: /Commande manuelle/ }));
    await user.click(screen.getByRole("button", { name: "Soumettre la commande manuelle" }));

    await waitFor(() =>
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({ shopId: "shop-1", manual: true })
      )
    );
    expect(logOrderCreatedMock).toHaveBeenCalled();
    expect(await screen.findByText("Client de passage")).toBeInTheDocument();
    expect(table().getByText("Commande manuelle")).toBeInTheDocument();
  });
});
