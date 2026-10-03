jest.mock("../providers/ShopBrandingSetter", () => ({ ShopBrandingSetter: () => null }));
jest.mock("../../hooks/usePremiumCatalog");
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

jest.mock("../../services/ShopService", () => ({
  shopService: {
    getShop: jest.fn(),
  },
}));

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastErrorMock(...args) } }));

import { fireEvent, render, screen, within } from "@testing-library/react";

import { ProductDetailPageContent } from "@/components/storefront/ProductDetailPageContent";
import type { Product } from "@/models/product/Product";
import type { Review } from "@/models/review/Review";
import type { Shop } from "@/models/shop/Shop";
import { productService } from "@/services/ProductService";
import { reviewService } from "@/services/ReviewService";
import { shopService } from "@/services/ShopService";

const productServiceMock = productService as jest.Mocked<typeof productService>;
const reviewServiceMock = reviewService as jest.Mocked<typeof reviewService>;
const shopServiceMock = shopService as jest.Mocked<typeof shopService>;
const toggleFavoriteMock = jest.fn();

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

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Boutique Awa",
    logo: "",
    address: "Douala",
    phone: "",
    whatsapp: "",
    currency: "XAF",
    ownerId: "u1",
    createdAt: { toDate: () => new Date("2024-01-15T00:00:00Z") } as never,
    ...overrides,
  };
}

describe("ProductDetailPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewServiceMock.listByProduct.mockResolvedValue([]);
    shopServiceMock.getShop.mockResolvedValue(null);
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: [] },
      toggleFavorite: toggleFavoriteMock,
    });
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

  it("shows the shop's public reply under a review", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    reviewServiceMock.listByProduct.mockResolvedValue([
      fakeReview({
        reply: {
          text: "Merci pour votre confiance !",
          authorName: "Awa",
          repliedAt: { toDate: () => new Date("2026-10-02T00:00:00Z") } as never,
        },
      }),
    ]);
    render(<ProductDetailPageContent productId="p1" />);

    expect(await screen.findByText("Merci pour votre confiance !")).toBeInTheDocument();
    expect(screen.getByText("Réponse du vendeur")).toBeInTheDocument();
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

  it("does not show a seller block when the shop can't be resolved", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    render(<ProductDetailPageContent productId="p1" />);

    await screen.findByText("Sac à main artisanal");
    expect(screen.queryByText("Vendu par")).not.toBeInTheDocument();
  });

  it("shows the seller's name, age, description and social link (BF-128)", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    shopServiceMock.getShop.mockResolvedValue(
      fakeShop({
        description: "Mode et accessoires artisanaux à Douala.",
        primarySocialNetwork: "instagram",
        instagramUrl: "https://instagram.com/boutiqueawa",
        createdAt: {
          toDate: () => new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        } as never,
      })
    );
    render(<ProductDetailPageContent productId="p1" />);

    expect(await screen.findByText("Vendu par")).toBeInTheDocument();
    const shopLink = screen.getByRole("link", { name: /Boutique Awa/ });
    expect(shopLink).toHaveAttribute("href", "/boutique/shop-1");
    expect(
      screen.getByText("Mode et accessoires artisanaux à Douala.")
    ).toBeInTheDocument();

    const socialLink = screen.getByRole("link", { name: /Voir sur Instagram/ });
    expect(socialLink).toHaveAttribute(
      "href",
      "https://instagram.com/boutiqueawa"
    );
    expect(socialLink).toHaveAttribute("target", "_blank");
  });

  it("shows the configured contact channels instead of the single social link when advancedContact is enabled (BF-105)", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    shopServiceMock.getShop.mockResolvedValue(
      fakeShop({
        primarySocialNetwork: "instagram",
        instagramUrl: "https://instagram.com/boutiqueawa",
        whatsapp: "+237600000000",
        publicContactEmail: "contact@boutiqueawa.com",
        premiumFeatures: ["advancedContact"],
        clientContactMethods: ["whatsapp", "email"],
      })
    );
    render(<ProductDetailPageContent productId="p1" />);

    await screen.findByText("Vendu par");

    const whatsappLink = screen.getByRole("link", { name: /WhatsApp/ });
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("wa.me"));

    const emailLink = screen.getByRole("link", { name: /E-mail/ });
    expect(emailLink).toHaveAttribute(
      "href",
      "mailto:contact@boutiqueawa.com"
    );

    // Le lien "Voir sur Instagram" de BF-128 est remplacé, pas cumulé.
    expect(
      screen.queryByRole("link", { name: /Voir sur Instagram/ })
    ).not.toBeInTheDocument();
  });

  it("falls back to the single social link when advancedContact is enabled but no channel has a usable value", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    shopServiceMock.getShop.mockResolvedValue(
      fakeShop({
        primarySocialNetwork: "instagram",
        instagramUrl: "https://instagram.com/boutiqueawa",
        premiumFeatures: ["advancedContact"],
        clientContactMethods: ["whatsapp"],
      })
    );
    render(<ProductDetailPageContent productId="p1" />);

    expect(
      await screen.findByRole("link", { name: /Voir sur Instagram/ })
    ).toBeInTheDocument();
  });

  it("falls back to a default icon and hides optional sections when unset", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    shopServiceMock.getShop.mockResolvedValue(fakeShop());
    render(<ProductDetailPageContent productId="p1" />);

    const sellerHeading = await screen.findByText("Vendu par");
    const sellerBlock = sellerHeading.closest("div")!;
    expect(within(sellerBlock).queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Voir sur/ })).not.toBeInTheDocument();
  });

  it("toggles a signed-in visitor's favorite (BF-129)", async () => {
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    render(<ProductDetailPageContent productId="p1" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter aux favoris" })
    );
    expect(toggleFavoriteMock).toHaveBeenCalledWith("p1");
  });

  it("reflects the profile's real favorites", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: ["p1"] },
      toggleFavorite: toggleFavoriteMock,
    });
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    render(<ProductDetailPageContent productId="p1" />);

    expect(
      await screen.findByRole("button", { name: "Retirer des favoris" })
    ).toBeInTheDocument();
  });

  it("prompts a guest to sign in instead of toggling anything", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      profile: null,
      toggleFavorite: toggleFavoriteMock,
    });
    productServiceMock.getProduct.mockResolvedValue(fakeProduct());
    render(<ProductDetailPageContent productId="p1" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter aux favoris" })
    );

    expect(toggleFavoriteMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });
});
