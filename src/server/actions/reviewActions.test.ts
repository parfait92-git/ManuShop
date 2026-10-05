// Notifications push : vérifiées dans push/events.test.ts.
jest.mock("../push/events", () => ({
  pushSupportMessage: jest.fn(async () => 0),
  pushSupportReply: jest.fn(async () => 0),
  pushNewReview: jest.fn(async () => 0),
  pushReviewReply: jest.fn(async () => 0),
  pushPremiumRequest: jest.fn(async () => 0),
  pushPremiumDecision: jest.fn(async () => 0),
}));

jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));

const serverTimestampMock = jest.fn(() => ({ __op: "serverTimestamp" }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => serverTimestampMock(),
  },
}));

const orderGetMock = jest.fn();
const orderDocMock = jest.fn(() => ({ get: orderGetMock }));

const reviewSetMock = jest.fn();
const newReviewDocMock = jest.fn(() => ({ id: "review-new", set: reviewSetMock }));

const reviewsQueryGetMock = jest.fn();
const reviewsLimitMock = jest.fn(() => ({ get: reviewsQueryGetMock }));
const reviewsWhere2Mock = jest.fn(() => ({ limit: reviewsLimitMock }));
const reviewsWhere1Mock = jest.fn(() => ({ where: reviewsWhere2Mock }));

const collectionMock = jest.fn((name: string) => {
  if (name === "orders") return { doc: orderDocMock };
  if (name === "reviews") {
    return { doc: newReviewDocMock, where: reviewsWhere1Mock };
  }
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { submitReviewAction } from "@/server/actions/reviewActions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;

function mockOrder(overrides: Record<string, unknown> = {}) {
  orderGetMock.mockResolvedValue({
    exists: true,
    data: () => ({
      shopId: "shop-1",
      clientId: "client-1",
      status: "delivered",
      items: [{ productId: "p1" }],
      ...overrides,
    }),
  });
}

describe("submitReviewAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    reviewsQueryGetMock.mockResolvedValue({ empty: true });
  });

  it("throws NotFoundError when the order doesn't exist", async () => {
    orderGetMock.mockResolvedValue({ exists: false });

    await expect(
      submitReviewAction("token", {
        orderId: "missing",
        productId: "p1",
        comment: "Top",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a caller who isn't the order's own client", async () => {
    mockOrder({ clientId: "someone-else" });

    await expect(
      submitReviewAction("token", {
        orderId: "order-1",
        productId: "p1",
        comment: "Top",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects an order that isn't delivered yet", async () => {
    mockOrder({ status: "delivering" });

    await expect(
      submitReviewAction("token", {
        orderId: "order-1",
        productId: "p1",
        comment: "Top",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a product that isn't part of the order", async () => {
    mockOrder();

    await expect(
      submitReviewAction("token", {
        orderId: "order-1",
        productId: "not-in-order",
        comment: "Top",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an empty comment", async () => {
    mockOrder();

    await expect(
      submitReviewAction("token", {
        orderId: "order-1",
        productId: "p1",
        comment: "   ",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a second review for the same order/product", async () => {
    mockOrder();
    reviewsQueryGetMock.mockResolvedValue({ empty: false });

    await expect(
      submitReviewAction("token", {
        orderId: "order-1",
        productId: "p1",
        comment: "Encore un avis",
      })
    ).rejects.toThrow(ValidationError);
    expect(reviewSetMock).not.toHaveBeenCalled();
  });

  it("writes the review with the shopId denormalized from the order", async () => {
    mockOrder();

    const result = await submitReviewAction("token", {
      orderId: "order-1",
      productId: "p1",
      rating: 5,
      comment: "  Très satisfait  ",
    });

    expect(reviewSetMock).toHaveBeenCalledWith({
      productId: "p1",
      shopId: "shop-1",
      orderId: "order-1",
      authorId: "client-1",
      rating: 5,
      comment: "Très satisfait",
      createdAt: { __op: "serverTimestamp" },
    });
    expect(result).toEqual({ reviewId: "review-new" });
  });

  it("omits rating entirely when none is given, rather than writing undefined", async () => {
    mockOrder();

    await submitReviewAction("token", {
      orderId: "order-1",
      productId: "p1",
      comment: "Correct",
    });

    const [data] = reviewSetMock.mock.calls[0];
    expect(data).not.toHaveProperty("rating");
  });

  it("records the defective reason when flagged", async () => {
    mockOrder();

    await submitReviewAction("token", {
      orderId: "order-1",
      productId: "p1",
      comment: "Cassé à la réception",
      reason: "defective",
    });

    expect(reviewSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "defective" })
    );
  });
});
