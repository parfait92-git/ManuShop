jest.mock("../../services/ProductService", () => ({
  productService: {
    getProduct: jest.fn(),
    getBadge: jest.fn(() => null),
    getStockStatus: jest.fn(
      (product: { stock: number; stockThreshold: number }) =>
        product.stock <= 0
          ? "out-of-stock"
          : product.stock <= product.stockThreshold
            ? "low-stock"
            : "in-stock"
    ),
  },
}));

jest.mock("../../services/ReviewService", () => ({
  reviewService: {
    listByProduct: jest.fn(),
    getAverageRating: jest.fn(() => null),
  },
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductDetailPageContent } from "@/components/storefront/ProductDetailPageContent";
import type { Product } from "@/models/product/Product";
import type { Review } from "@/models/review/Review";
import { productService } from "@/services/ProductService";
import { reviewService } from "@/services/ReviewService";

const productServiceMock = productService as jest.Mocked<typeof productService>;
const reviewServiceMock = reviewService as jest.Mocked<typeof reviewService>;

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    shopId: "shop-1",
    name: "Sac à main artisanal",
    description: "Un sac fait main.",
    price: 12500,
    category: "Accessoires",
    images: ["https://picsum.photos/seed/p1/400/400"],
    stock: 10,
    stockThreshold: 2,
    isPromo: false,
    createdAt: {} as never,
    updatedAt: {} as never,
    ...overrides,
  };
}

function fakeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "r1",
    productId: "p1",
    shopId: "shop-1",
    orderId: "o1",
    authorId: "u1",
    comment: "Très bon produit.",
    createdAt: {} as never,
    ...overrides,
  };
}

describe("ProductDetailPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewServiceMock.listByProduct.mockResolvedValue([]);
  });

  it("shows a not-found state when the product doesn't exist", async () => {
    productServiceMock.getProduct.mockResolvedValue(null);
    render(<ProductDetailPageContent productId="missing" />);

    expect(await screen.findByText("Produit introuvable.")).toBeInTheDocument();
  });

  it("renders the product and allows adding it to the cart", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    render(<ProductDetailPageContent productId="p1" />);

    expect(await screen.findByText("Sac à main artisanal")).toBeInTheDocument();
    // toLocaleString("fr-FR") sépare les milliers par une espace fine
    // insécable (U+202F), pas une espace normale — regex plutôt que littéral.
    expect(screen.getByText(/12\s*500\s*FCFA/)).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: "Ajouter au panier" });
    expect(addButton).toBeEnabled();
  });

  it("disables adding to cart when the product is out of stock", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct({ stock: 0 }));
    render(<ProductDetailPageContent productId="p1" />);

    expect(await screen.findByText("Rupture de stock")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ajouter au panier" })
    ).toBeDisabled();
  });

  it("shows an honest empty state when there are no reviews", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    render(<ProductDetailPageContent productId="p1" />);

    expect(
      await screen.findByText("Aucun avis pour le moment.")
    ).toBeInTheDocument();
  });

  it("lists real reviews and their average rating when present", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    reviewServiceMock.listByProduct.mockResolvedValue([fakeReview()]);
    reviewServiceMock.getAverageRating.mockReturnValue(4.5);
    render(<ProductDetailPageContent productId="p1" />);

    expect(await screen.findByText("« Très bon produit. »")).toBeInTheDocument();
    expect(screen.getByText("4.5 (1 avis)")).toBeInTheDocument();
  });

  it("still renders the product when the reviews fetch fails (rules not deployed, network...)", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    reviewServiceMock.listByProduct.mockRejectedValue(
      new Error("Missing or insufficient permissions.")
    );
    render(<ProductDetailPageContent productId="p1" />);

    expect(await screen.findByText("Sac à main artisanal")).toBeInTheDocument();
    expect(screen.getByText("Aucun avis pour le moment.")).toBeInTheDocument();
  });

  it("toggles the favorite button", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    const user = userEvent.setup();
    render(<ProductDetailPageContent productId="p1" />);

    await user.click(
      await screen.findByRole("button", { name: "Ajouter aux favoris" })
    );
    expect(
      screen.getByRole("button", { name: "Retirer des favoris" })
    ).toBeInTheDocument();
  });
});
