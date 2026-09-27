jest.mock("../../services/ProductService", () => ({
  productService: {
    listProducts: jest.fn(),
    search: jest.fn((products: unknown[]) => products),
    getBadge: jest.fn(() => null),
    isVisibleToCustomers: jest.fn(() => true),
  },
}));

jest.mock("../../services/CategoryService", () => ({
  categoryService: { listCategories: jest.fn() },
}));

jest.mock("./StorefrontProductCard", () => ({
  StorefrontProductCard: ({ product }: { product: { id: string } }) => (
    <div data-testid="product-card">{product.id}</div>
  ),
}));

import { render, screen } from "@testing-library/react";

import { CataloguePageContent } from "@/components/storefront/CataloguePageContent";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";

const productServiceMock = productService as jest.Mocked<typeof productService>;
const categoryServiceMock = categoryService as jest.Mocked<typeof categoryService>;

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    shopId: "shop-1",
    name: "Produit",
    description: "",
    price: 1000,
    category: "Cat",
    images: [],
    stock: 10,
    stockThreshold: 2,
    isPromo: false,
    createdAt: { toDate: () => new Date() } as never,
    updatedAt: { toDate: () => new Date() } as never,
    ...overrides,
  };
}

describe("CataloguePageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    categoryServiceMock.listCategories.mockResolvedValue([]);
    productServiceMock.search.mockImplementation((products) => products);
    productServiceMock.isVisibleToCustomers.mockReturnValue(true);
  });

  // BF-91-ish : cette page est atteinte en visitant une boutique précise,
  // déjà confirmée publiée par ShopStorefrontPage — jamais de repli vers
  // /demo-catalogue ici, contrairement à /catalogue (le marché agrégé).
  it("shows an honest empty state instead of redirecting when the shop has zero products", async () => {
    productServiceMock.listProducts.mockResolvedValue([]);
    render(<CataloguePageContent shopId="shop-1" />);

    expect(
      await screen.findByText("Cette boutique n'a pas encore de produit à afficher.")
    ).toBeInTheDocument();
  });

  it("shows an honest empty state when every product is unpublished or trashed (BF-90)", async () => {
    productServiceMock.listProducts.mockResolvedValue([fakeProduct()]);
    productServiceMock.isVisibleToCustomers.mockReturnValue(false);
    render(<CataloguePageContent shopId="shop-1" />);

    expect(
      await screen.findByText("Cette boutique n'a pas encore de produit à afficher.")
    ).toBeInTheDocument();
  });

  it("renders products when the shop has some", async () => {
    productServiceMock.listProducts.mockResolvedValue([fakeProduct()]);
    render(<CataloguePageContent shopId="shop-1" />);

    expect(await screen.findByTestId("product-card")).toHaveTextContent("p1");
  });

  it("does not show the empty state just because a search/filter matches nothing", async () => {
    productServiceMock.listProducts.mockResolvedValue([fakeProduct()]);
    productServiceMock.search.mockReturnValue([]);
    render(<CataloguePageContent shopId="shop-1" />);

    await screen.findByText(/Aucun produit ne correspond/);
    expect(
      screen.queryByText("Cette boutique n'a pas encore de produit à afficher.")
    ).not.toBeInTheDocument();
  });
});
