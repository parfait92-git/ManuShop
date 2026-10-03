jest.mock("../lib/firebase", () => ({
  db: {},
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const replyToFeedbackAction = jest.fn();
const submitDeliveryFeedbackAction = jest.fn();
jest.mock("../server/actions/feedbackActions", () => ({
  replyToFeedbackAction: (...args: unknown[]) => replyToFeedbackAction(...args),
  submitDeliveryFeedbackAction: (...args: unknown[]) => submitDeliveryFeedbackAction(...args),
}));

import type { OrderFeedback } from "@/models/review/OrderFeedback";
import type { Review } from "@/models/review/Review";
import type { IOrderFeedbackRepository } from "@/repositories/interfaces/IOrderFeedbackRepository";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";
import { countUnreplied, FeedbackService } from "@/services/FeedbackService";

const at = (iso: string) => ({ toMillis: () => Date.parse(iso) }) as never;

function review(overrides: Partial<Review>): Review {
  return {
    id: "r1",
    productId: "p1",
    shopId: "shop-1",
    orderId: "o1",
    authorId: "c1",
    comment: "Bien",
    createdAt: at("2026-10-01"),
    ...overrides,
  };
}

function delivery(overrides: Partial<OrderFeedback>): OrderFeedback {
  return {
    orderId: "o1",
    shopId: "shop-1",
    clientId: "c1",
    clientName: "Fatou",
    comment: "Rapide",
    createdAt: at("2026-10-01"),
    ...overrides,
  };
}

describe("FeedbackService", () => {
  let feedback: jest.Mocked<IOrderFeedbackRepository>;
  let reviews: jest.Mocked<IReviewRepository>;
  let service: FeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    feedback = { getForClient: jest.fn(), listByShop: jest.fn() };
    reviews = { listByProduct: jest.fn(), listByOrder: jest.fn(), listByShop: jest.fn() };
    service = new FeedbackService(feedback, reviews);
  });

  it("groups a shop's delivery feedback and reviews by order, most recent first", async () => {
    feedback.listByShop.mockResolvedValue([delivery({ orderId: "o1" })]);
    reviews.listByShop.mockResolvedValue([
      review({ id: "r1", orderId: "o1" }),
      review({ id: "r2", orderId: "o2", createdAt: at("2026-10-02") }),
    ]);

    const groups = await service.listForShop("shop-1");

    expect(groups.map((group) => group.orderId)).toEqual(["o2", "o1"]);
    expect(groups[1].delivery?.comment).toBe("Rapide");
    expect(groups[1].clientName).toBe("Fatou");
    expect(groups[1].reviews.map((r) => r.id)).toEqual(["r1"]);
    expect(groups[0].delivery).toBeNull();
  });

  it("counts the feedback still awaiting a reply", () => {
    const reply = { text: "Merci", authorName: "Awa", repliedAt: at("2026-10-02") };
    expect(
      countUnreplied({
        orderId: "o1",
        clientName: "Fatou",
        latestAt: 0,
        delivery: delivery({}),
        reviews: [review({ reply }), review({ id: "r2" })],
      })
    ).toBe(2);
  });

  it("loads an order's feedback for its client", async () => {
    feedback.getForClient.mockResolvedValue(null);
    reviews.listByOrder.mockResolvedValue([review({})]);

    const bundle = await service.getForOrder("o1", "c1");

    expect(feedback.getForClient).toHaveBeenCalledWith("o1", "c1");
    expect(bundle.delivery).toBeNull();
    expect(bundle.reviews).toHaveLength(1);
  });

  it("sends the delivery feedback and the reply through the Server Actions", async () => {
    await service.submitDeliveryFeedback({ orderId: "o1", comment: "Top" });
    await service.reply({ target: "review", id: "r1", text: "Merci" });

    expect(submitDeliveryFeedbackAction).toHaveBeenCalledWith("token-1", { orderId: "o1", comment: "Top" });
    expect(replyToFeedbackAction).toHaveBeenCalledWith("token-1", { target: "review", id: "r1", text: "Merci" });
  });
});
