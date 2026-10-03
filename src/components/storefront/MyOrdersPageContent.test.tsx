const downloadInvoiceMock = jest.fn();
jest.mock("../../services/InvoiceService", () => ({
  hasInvoice: (status: string) => ["delivered", "returned", "defective"].includes(status),
  invoiceService: { download: (...args: unknown[]) => downloadInvoiceMock(...args) },
}));

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
const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
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

  // BF-76 : un client donne son avis sur une commande livrée — sur sa
  // propre page, étape par étape (2026-10-02).
  describe("avis sur une commande livrée (BF-76)", () => {
    it("offers no review link before delivery", async () => {
      listByClientMock.mockResolvedValue([fakeOrder({ status: "delivering" })]);
      render(<MyOrdersPageContent clientId="client-1" />);

      await screen.findByText("Wax ×2");
      expect(
        screen.queryByRole("link", { name: "Donner mon avis" })
      ).not.toBeInTheDocument();
    });

    it("downloads the invoice of a delivered order, and only then", async () => {
      listByClientMock.mockResolvedValue([
        fakeOrder({ id: "o1", status: "delivered" }),
        fakeOrder({ id: "o2", status: "delivering" }),
      ]);
      downloadInvoiceMock.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<MyOrdersPageContent clientId="client-1" />);

      const buttons = await screen.findAllByRole("button", { name: "Télécharger la facture" });
      expect(buttons).toHaveLength(1);
      await user.click(buttons[0]);
      expect(downloadInvoiceMock).toHaveBeenCalledWith("o1");
    });

    it("tells the client when the invoice can't be downloaded", async () => {
      listByClientMock.mockResolvedValue([fakeOrder({ status: "returned" })]);
      downloadInvoiceMock.mockRejectedValue(new Error("Commande introuvable."));
      const user = userEvent.setup();
      render(<MyOrdersPageContent clientId="client-1" />);

      await user.click(await screen.findByRole("button", { name: "Télécharger la facture" }));
      await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Commande introuvable."));
    });

    it("links a delivered order to its feedback page", async () => {
      listByClientMock.mockResolvedValue([fakeOrder({ status: "delivered" })]);
      render(<MyOrdersPageContent clientId="client-1" />);

      expect(
        await screen.findByRole("link", { name: "Donner mon avis" })
      ).toHaveAttribute("href", "/mes-commandes/o1/avis");
    });
  });
});
