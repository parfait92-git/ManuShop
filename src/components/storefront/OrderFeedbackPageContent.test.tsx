const getOrderMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: { getOrder: (...args: unknown[]) => getOrderMock(...args) },
}));

const getForOrderMock = jest.fn();
const submitDeliveryFeedbackMock = jest.fn();
jest.mock("../../services/FeedbackService", () => ({
  feedbackService: {
    getForOrder: (...args: unknown[]) => getForOrderMock(...args),
    submitDeliveryFeedback: (...args: unknown[]) => submitDeliveryFeedbackMock(...args),
  },
}));

const submitReviewMock = jest.fn();
jest.mock("../../services/ReviewService", () => ({
  reviewService: { submitReview: (...args: unknown[]) => submitReviewMock(...args) },
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderFeedbackPageContent } from "@/components/storefront/OrderFeedbackPageContent";
import type { Order } from "@/models/order/Order";

const date = new Date("2026-10-01T10:00:00Z");
const ts = { toMillis: () => date.getTime(), toDate: () => date } as never;

function fakeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    shopId: "shop-1",
    clientId: "client-1",
    clientName: "Fatou Ba",
    clientPhone: "+237600000000",
    clientAddress: "Douala",
    items: [
      { productId: "p1", name: "Robe wax", quantity: 1, unitPrice: 5000 },
      { productId: "p2", name: "Sac en raphia", quantity: 1, unitPrice: 3000 },
    ],
    subtotal: 8000,
    discount: 0,
    total: 8000,
    status: "delivered",
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

describe("OrderFeedbackPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("walks the client through the delivery, then each article, saving each step", async () => {
    getOrderMock.mockResolvedValue(fakeOrder());
    getForOrderMock.mockResolvedValue({ delivery: null, reviews: [] });
    submitDeliveryFeedbackMock.mockResolvedValue(undefined);
    submitReviewMock.mockResolvedValue({ reviewId: "r1" });
    const user = userEvent.setup();
    render(<OrderFeedbackPageContent orderId="o1" clientId="client-1" />);

    expect(await screen.findByRole("heading", { name: "La livraison" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "4 étoiles" }));
    await user.type(screen.getByRole("textbox", { name: /Comment s'est passée la livraison/ }), "Livreur ponctuel");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(submitDeliveryFeedbackMock).toHaveBeenCalledWith({
        orderId: "o1",
        rating: 4,
        comment: "Livreur ponctuel",
      })
    );

    expect(await screen.findByRole("heading", { name: "Robe wax" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /Que pensez-vous de cet article/ }), "Belle robe");
    await user.click(screen.getByLabelText("Signaler un article défectueux"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(submitReviewMock).toHaveBeenCalledWith({
        orderId: "o1",
        productId: "p1",
        rating: undefined,
        comment: "Belle robe",
        reason: "defective",
      })
    );

    // Dernier article passé : fin du parcours.
    expect(await screen.findByRole("heading", { name: "Sac en raphia" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Passer" }));
    expect(await screen.findByText("Merci ! 2 avis envoyé(s) sur 3.")).toBeInTheDocument();
  });

  it("resumes at the first open step and shows a given feedback read-only, with the shop's reply", async () => {
    getOrderMock.mockResolvedValue(fakeOrder());
    getForOrderMock.mockResolvedValue({
      delivery: {
        orderId: "o1",
        shopId: "shop-1",
        clientId: "client-1",
        clientName: "Fatou Ba",
        comment: "Rapide",
        reply: { text: "Merci Fatou !", authorName: "Awa", repliedAt: ts },
        createdAt: ts,
      },
      reviews: [],
    });
    const user = userEvent.setup();
    render(<OrderFeedbackPageContent orderId="o1" clientId="client-1" />);

    expect(await screen.findByRole("heading", { name: "Robe wax" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Livraison/ }));
    expect(screen.getByText("Rapide")).toBeInTheDocument();
    expect(screen.getByText("Réponse du vendeur")).toBeInTheDocument();
    expect(screen.getByText("Merci Fatou !")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Envoyer" })).not.toBeInTheDocument();
  });

  it("refuses an order that isn't delivered yet", async () => {
    getOrderMock.mockResolvedValue(fakeOrder({ status: "delivering" }));
    getForOrderMock.mockResolvedValue({ delivery: null, reviews: [] });
    render(<OrderFeedbackPageContent orderId="o1" clientId="client-1" />);

    expect(
      await screen.findByText("Vous pourrez donner votre avis dès que cette commande sera livrée.")
    ).toBeInTheDocument();
  });

  it("hides someone else's order", async () => {
    getOrderMock.mockResolvedValue(fakeOrder({ clientId: "other" }));
    getForOrderMock.mockResolvedValue({ delivery: null, reviews: [] });
    render(<OrderFeedbackPageContent orderId="o1" clientId="client-1" />);

    expect(await screen.findByText("Commande introuvable.")).toBeInTheDocument();
  });
});
