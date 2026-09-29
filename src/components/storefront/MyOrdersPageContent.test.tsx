const listByClientMock = jest.fn();
const cancelOrderMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: {
    listByClient: (...args: unknown[]) => listByClientMock(...args),
    cancelOrder: (...args: unknown[]) => cancelOrderMock(...args),
  },
}));

const submitReviewMock = jest.fn();
jest.mock("../../services/ReviewService", () => ({
  reviewService: {
    submitReview: (...args: unknown[]) => submitReviewMock(...args),
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

jest.mock("./ReviewDialog", () => ({
  ReviewDialog: ({
    target,
    onSubmit,
  }: {
    target: { orderId: string } | null;
    onSubmit: (submission: {
      productId: string;
      comment: string;
    }) => void;
  }) =>
    target ? (
      <button
        type="button"
        onClick={() => onSubmit({ productId: "p1", comment: "Top" })}
      >
        Confirmer l&apos;avis
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

  // BF-76 : un client peut laisser un avis sur une commande livrée —
  // demande explicite de l'utilisateur, 2026-09-29.
  describe("avis sur une commande livrée (BF-76)", () => {
    it("shows a review button only once the order is delivered", async () => {
      listByClientMock.mockResolvedValue([fakeOrder({ status: "delivering" })]);
      render(<MyOrdersPageContent clientId="client-1" />);

      await screen.findByText("Wax ×2");
      expect(
        screen.queryByRole("button", { name: "Laisser un avis" })
      ).not.toBeInTheDocument();
    });

    it("submits a review and replaces the button with a thank-you message", async () => {
      listByClientMock.mockResolvedValue([fakeOrder({ status: "delivered" })]);
      submitReviewMock.mockResolvedValue({ reviewId: "r1" });
      const user = userEvent.setup();
      render(<MyOrdersPageContent clientId="client-1" />);

      await user.click(
        await screen.findByRole("button", { name: "Laisser un avis" })
      );
      await user.click(screen.getByRole("button", { name: "Confirmer l'avis" }));

      await waitFor(() =>
        expect(submitReviewMock).toHaveBeenCalledWith({
          orderId: "o1",
          productId: "p1",
          comment: "Top",
        })
      );
      expect(toastSuccessMock).toHaveBeenCalledWith("Merci pour votre avis !");
      expect(
        await screen.findByText("Merci pour votre avis !")
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Laisser un avis" })
      ).not.toBeInTheDocument();
    });

    it("shows the server's error message when submission fails", async () => {
      listByClientMock.mockResolvedValue([fakeOrder({ status: "delivered" })]);
      submitReviewMock.mockRejectedValue(
        new Error("Vous avez déjà laissé un avis pour cet article.")
      );
      const user = userEvent.setup();
      render(<MyOrdersPageContent clientId="client-1" />);

      await user.click(
        await screen.findByRole("button", { name: "Laisser un avis" })
      );
      await user.click(screen.getByRole("button", { name: "Confirmer l'avis" }));

      await waitFor(() =>
        expect(toastErrorMock).toHaveBeenCalledWith(
          "Vous avez déjà laissé un avis pour cet article."
        )
      );
      // Le bouton reste proposé — l'envoi a échoué, pas de faux "merci".
      expect(
        screen.getByRole("button", { name: "Laisser un avis" })
      ).toBeInTheDocument();
    });
  });
});
