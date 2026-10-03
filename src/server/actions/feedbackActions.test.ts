jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => ({ __op: "serverTimestamp" }) },
}));

const orderGetMock = jest.fn();
const feedbackCreateMock = jest.fn();
const feedbackGetMock = jest.fn();
const reviewGetMock = jest.fn();
const userGetMock = jest.fn();
const shopGetMock = jest.fn();

const batchUpdateMock = jest.fn();
const batchSetMock = jest.fn();
const batchCommitMock = jest.fn();

const collectionMock = jest.fn((name: string) => {
  if (name === "orders") return { doc: () => ({ get: orderGetMock }) };
  if (name === "orderFeedback") {
    return {
      doc: (id: string) => ({ __ref: `orderFeedback/${id}`, create: feedbackCreateMock, get: feedbackGetMock }),
    };
  }
  if (name === "reviews") return { doc: (id: string) => ({ __ref: `reviews/${id}`, get: reviewGetMock }) };
  if (name === "users") return { doc: () => ({ get: userGetMock }) };
  if (name === "shops") return { doc: () => ({ get: shopGetMock }) };
  if (name === "notifications") return { doc: () => ({ __ref: "notifications/new" }) };
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: collectionMock,
    batch: () => ({ update: batchUpdateMock, set: batchSetMock, commit: batchCommitMock }),
  }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import {
  replyToFeedbackAction,
  submitDeliveryFeedbackAction,
} from "@/server/actions/feedbackActions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;

function mockOrder(overrides: Record<string, unknown> = {}) {
  orderGetMock.mockResolvedValue({
    exists: true,
    data: () => ({
      shopId: "shop-1",
      clientId: "client-1",
      clientName: "Fatou Ba",
      status: "delivered",
      ...overrides,
    }),
  });
}

describe("submitDeliveryFeedbackAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "client-1" });
  });

  it("stores the client's private delivery feedback, keyed by the order", async () => {
    mockOrder();

    await submitDeliveryFeedbackAction("token", {
      orderId: "order-1",
      rating: 4,
      comment: "  Livreur ponctuel  ",
    });

    expect(feedbackCreateMock).toHaveBeenCalledWith({
      orderId: "order-1",
      shopId: "shop-1",
      clientId: "client-1",
      clientName: "Fatou Ba",
      rating: 4,
      comment: "Livreur ponctuel",
      createdAt: { __op: "serverTimestamp" },
    });
  });

  it("throws NotFoundError for an unknown order", async () => {
    orderGetMock.mockResolvedValue({ exists: false });
    await expect(
      submitDeliveryFeedbackAction("token", { orderId: "x", comment: "Top" })
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects someone else's order", async () => {
    mockOrder({ clientId: "someone-else" });
    await expect(
      submitDeliveryFeedbackAction("token", { orderId: "order-1", comment: "Top" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects an order that isn't delivered yet", async () => {
    mockOrder({ status: "delivering" });
    await expect(
      submitDeliveryFeedbackAction("token", { orderId: "order-1", comment: "Top" })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an empty comment or an out-of-range rating", async () => {
    mockOrder();
    await expect(
      submitDeliveryFeedbackAction("token", { orderId: "order-1", comment: "   " })
    ).rejects.toThrow(ValidationError);
    await expect(
      submitDeliveryFeedbackAction("token", { orderId: "order-1", rating: 6, comment: "Top" })
    ).rejects.toThrow(ValidationError);
    expect(feedbackCreateMock).not.toHaveBeenCalled();
  });

  it("refuses a second delivery feedback for the same order", async () => {
    mockOrder();
    feedbackCreateMock.mockRejectedValue(Object.assign(new Error("exists"), { code: 6 }));
    await expect(
      submitDeliveryFeedbackAction("token", { orderId: "order-1", comment: "Top" })
    ).rejects.toThrow("Vous avez déjà donné votre avis sur cette livraison.");
  });
});

describe("replyToFeedbackAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "merchant-1" });
    userGetMock.mockResolvedValue({
      data: () => ({ role: "seller", shopId: "shop-1", displayName: "Awa" }),
    });
    shopGetMock.mockResolvedValue({ data: () => ({ name: "Chez Awa" }) });
  });

  it("replies to a delivery feedback and notifies the client in the same batch", async () => {
    feedbackGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopId: "shop-1", orderId: "order-1", clientId: "client-1" }),
    });

    await replyToFeedbackAction("token", { target: "delivery", id: "order-1", text: " Merci ! " });

    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ __ref: "orderFeedback/order-1" }),
      { reply: { text: "Merci !", authorName: "Awa", repliedAt: { __op: "serverTimestamp" } } }
    );
    expect(batchSetMock).toHaveBeenCalledWith(
      { __ref: "notifications/new" },
      expect.objectContaining({
        userId: "client-1",
        type: "review_reply",
        orderId: "order-1",
        link: "/mes-commandes/order-1/avis",
        message: "Chez Awa a répondu à votre avis sur la livraison.",
      })
    );
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("replies to an article review, notifying its author", async () => {
    reviewGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopId: "shop-1", orderId: "order-1", authorId: "client-1" }),
    });

    await replyToFeedbackAction("token", { target: "review", id: "r1", text: "Merci" });

    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ __ref: "reviews/r1" }),
      expect.anything()
    );
    expect(batchSetMock).toHaveBeenCalledWith(
      { __ref: "notifications/new" },
      expect.objectContaining({
        userId: "client-1",
        message: "Chez Awa a répondu à votre avis sur un article.",
      })
    );
  });

  it("rejects a merchant from another shop", async () => {
    reviewGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopId: "shop-2", orderId: "order-1", authorId: "client-1" }),
    });
    await expect(
      replyToFeedbackAction("token", { target: "review", id: "r1", text: "Merci" })
    ).rejects.toThrow(ForbiddenError);
    expect(batchCommitMock).not.toHaveBeenCalled();
  });

  it("rejects a client replying to their own review", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });
    reviewGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopId: "shop-1", orderId: "order-1", authorId: "client-1" }),
    });
    await expect(
      replyToFeedbackAction("token", { target: "review", id: "r1", text: "Merci" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects an empty reply and an unknown review", async () => {
    await expect(
      replyToFeedbackAction("token", { target: "review", id: "r1", text: "  " })
    ).rejects.toThrow(ValidationError);
    reviewGetMock.mockResolvedValue({ exists: false });
    await expect(
      replyToFeedbackAction("token", { target: "review", id: "r1", text: "Merci" })
    ).rejects.toThrow(NotFoundError);
  });
});
