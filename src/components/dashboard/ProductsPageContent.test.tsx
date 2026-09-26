jest.mock("../../services/ProductService", () => ({
  productService: { listActive: jest.fn() },
}));

jest.mock("../../services/CategoryService", () => ({
  categoryService: { listCategories: jest.fn() },
}));

jest.mock("./ProductList", () => ({
  ProductList: ({ initialProducts }: { initialProducts: unknown[] }) => (
    <div data-testid="product-list">{initialProducts.length} produit(s)</div>
  ),
}));

import { render, screen } from "@testing-library/react";

import { ProductsPageContent } from "@/components/dashboard/ProductsPageContent";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";

const productServiceMock = productService as jest.Mocked<typeof productService>;
const categoryServiceMock = categoryService as jest.Mocked<typeof categoryService>;

describe("ProductsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    categoryServiceMock.listCategories.mockResolvedValue([]);
  });

  it("shows a read-only demo preview when the shop has no real products yet", async () => {
    productServiceMock.listActive.mockResolvedValue([]);
    render(<ProductsPageContent shopId="shop-1" />);

    expect(
      await screen.findByText("Exemple — à quoi ressemblera votre catalogue")
    ).toBeInTheDocument();
    // Real (empty) product list still rendered, not replaced.
    expect(screen.getByTestId("product-list")).toHaveTextContent("0 produit");
  });

  it("does not show the demo preview once the shop has real products", async () => {
    productServiceMock.listActive.mockResolvedValue([
      { id: "p1" } as never,
    ]);
    render(<ProductsPageContent shopId="shop-1" />);

    await screen.findByTestId("product-list");
    expect(
      screen.queryByText("Exemple — à quoi ressemblera votre catalogue")
    ).not.toBeInTheDocument();
  });
});
