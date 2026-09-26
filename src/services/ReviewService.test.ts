jest.mock("../lib/firebase", () => ({ db: {} }));

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
