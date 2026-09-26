const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

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

import { render, screen, waitFor } from "@testing-library/react";

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
  });

  it("redirects to the demo catalogue when the shop has zero products", async () => {
    productServiceMock.listProducts.mockResolvedValue([]);
    render(<CataloguePageContent shopId="shop-1" />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/demo-catalogue")
    );
  });

  it("renders products and does not redirect when the shop has some", async () => {
    productServiceMock.listProducts.mockResolvedValue([fakeProduct()]);
    render(<CataloguePageContent shopId="shop-1" />);

    expect(await screen.findByTestId("product-card")).toHaveTextContent("p1");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not redirect just because a search/filter matches nothing", async () => {
    productServiceMock.listProducts.mockResolvedValue([fakeProduct()]);
    productServiceMock.search.mockReturnValue([]);
    render(<CataloguePageContent shopId="shop-1" />);

    await screen.findByText(/Aucun produit ne correspond/);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to the demo catalogue when every product is unpublished or trashed (BF-90)", async () => {
    productServiceMock.listProducts.mockResolvedValue([fakeProduct()]);
    productServiceMock.isVisibleToCustomers.mockReturnValue(false);
    render(<CataloguePageContent shopId="shop-1" />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/demo-catalogue")
    );
  });
});
