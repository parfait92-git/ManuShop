jest.mock("../lib/firebase", () => ({
  db: {},
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const submitReviewAction = jest.fn();
jest.mock("../server/actions/reviewActions", () => ({
  submitReviewAction: (...args: unknown[]) => submitReviewAction(...args),
}));

import { ReviewService } from "@/services/ReviewService";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";
import type { Review } from "@/models/review/Review";

function fakeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "r1",
    productId: "p1",
    shopId: "shop-1",
    orderId: "o1",
    authorId: "u1",
    comment: "Très bien",
    createdAt: {} as never,
    ...overrides,
  };
}

describe("ReviewService", () => {
  let reviews: jest.Mocked<IReviewRepository>;
  let service: ReviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    reviews = { listByProduct: jest.fn() };
    service = new ReviewService(reviews);
  });

  describe("listByProduct", () => {
    it("delegates to the repository", async () => {
      const list = [fakeReview()];
      reviews.listByProduct.mockResolvedValue(list);

      expect(await service.listByProduct("p1")).toBe(list);
      expect(reviews.listByProduct).toHaveBeenCalledWith("p1");
    });
  });

  describe("submitReview", () => {
    it("delegates to the Server Action with the caller's id token", async () => {
      submitReviewAction.mockResolvedValue({ reviewId: "r1" });

      const result = await service.submitReview({
        orderId: "o1",
        productId: "p1",
        comment: "Nickel",
      });

      expect(submitReviewAction).toHaveBeenCalledWith("token-1", {
        orderId: "o1",
        productId: "p1",
        comment: "Nickel",
      });
      expect(result).toEqual({ reviewId: "r1" });
    });
  });

  describe("getAverageRating", () => {
    it("returns null when there are no reviews", () => {
      expect(service.getAverageRating([])).toBeNull();
    });

    it("returns null when no review has a rating", () => {
      expect(service.getAverageRating([fakeReview(), fakeReview()])).toBeNull();
    });

    it("averages only the reviews that carry a rating", () => {
      const result = service.getAverageRating([
        fakeReview({ rating: 5 }),
        fakeReview({ rating: 3 }),
        fakeReview(), // pas de note, ignoré
      ]);
      expect(result).toBe(4);
    });
  });
});
