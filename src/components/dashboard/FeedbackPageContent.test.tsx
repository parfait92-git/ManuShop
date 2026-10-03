jest.mock("../../server/actions/feedbackActions", () => ({}));

const listForShopMock = jest.fn();
const replyMock = jest.fn();
jest.mock("../../services/FeedbackService", () => ({
  ...jest.requireActual("../../services/FeedbackService"),
  feedbackService: {
    listForShop: (...args: unknown[]) => listForShopMock(...args),
    reply: (...args: unknown[]) => replyMock(...args),
  },
}));

const listByShopMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: { listByShop: (...args: unknown[]) => listByShopMock(...args) },
}));

jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args), error: jest.fn() },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FeedbackPageContent } from "@/components/dashboard/FeedbackPageContent";
import type { ShopOrderFeedback } from "@/services/FeedbackService";

const date = new Date("2026-10-01T10:00:00Z");
const ts = { toMillis: () => date.getTime(), toDate: () => date } as never;
const reply = { text: "Merci beaucoup", authorName: "Awa", repliedAt: ts };

function group(overrides: Partial<ShopOrderFeedback> = {}): ShopOrderFeedback {
  return {
    orderId: "order-1",
    clientName: "Fatou Ba",
    latestAt: date.getTime(),
    delivery: {
      orderId: "order-1",
      shopId: "shop-1",
      clientId: "c1",
      clientName: "Fatou Ba",
      rating: 5,
      comment: "Livreur très aimable",
      createdAt: ts,
    },
    reviews: [
      {
        id: "r1",
        productId: "p1",
        shopId: "shop-1",
        orderId: "order-1",
        authorId: "c1",
        comment: "Couleurs fidèles",
        reason: "defective",
        createdAt: ts,
      },
    ],
    ...overrides,
  };
}

describe("FeedbackPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listByShopMock.mockResolvedValue([
      { id: "order-1", items: [{ productId: "p1", name: "Robe wax", quantity: 1, unitPrice: 1 }] },
    ]);
  });

  it("lists the delivery feedback and article reviews of an order, with the article's name", async () => {
    listForShopMock.mockResolvedValue([group()]);
    render(<FeedbackPageContent shopId="shop-1" />);

    expect(await screen.findByText("Livreur très aimable")).toBeInTheDocument();
    expect(screen.getByText("Couleurs fidèles")).toBeInTheDocument();
    expect(screen.getByText("Robe wax")).toBeInTheDocument();
    expect(screen.getByText("Défectueux")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sans réponse (2)" })).toBeInTheDocument();
    expect(listForShopMock).toHaveBeenCalledWith("shop-1");
  });

  it("sends a public reply to an article review and reloads", async () => {
    listForShopMock.mockResolvedValue([group()]);
    replyMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<FeedbackPageContent shopId="shop-1" />);

    await user.type(
      await screen.findByRole("textbox", { name: /Votre réponse \(publique\)/ }),
      "Désolés, nous vous l'échangeons."
    );
    await user.click(screen.getAllByRole("button", { name: "Répondre" })[1]);

    await waitFor(() =>
      expect(replyMock).toHaveBeenCalledWith({
        target: "review",
        id: "r1",
        text: "Désolés, nous vous l'échangeons.",
      })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Réponse envoyée. Le client est notifié.");
    expect(listForShopMock).toHaveBeenCalledTimes(2);
  });

  it("hides fully answered orders unless « Tous les avis » is chosen", async () => {
    listForShopMock.mockResolvedValue([
      group({
        delivery: { ...group().delivery!, reply },
        reviews: [{ ...group().reviews[0], reply }],
      }),
    ]);
    const user = userEvent.setup();
    render(<FeedbackPageContent shopId="shop-1" />);

    expect(await screen.findByText("Vous avez répondu à tous les avis.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Afficher"), "all");
    expect(screen.getAllByText("Merci beaucoup")).toHaveLength(2);
  });

  it("explains when there is no feedback yet", async () => {
    listForShopMock.mockResolvedValue([]);
    render(<FeedbackPageContent shopId="shop-1" />);
    expect(await screen.findByText(/Aucun avis pour l'instant/)).toBeInTheDocument();
  });
});
