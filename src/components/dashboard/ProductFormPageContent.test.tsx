import { render, screen, waitFor } from "@testing-library/react";

jest.mock("../../lib/firebase", () => ({ db: {} }));

jest.mock("./ProductForm", () => ({
  ProductForm: () => <div data-testid="product-form" />,
}));

import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";
import { ProductFormPageContent } from "@/components/dashboard/ProductFormPageContent";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";

jest.mock("../../services/CategoryService", () => ({
  categoryService: { listCategories: jest.fn() },
}));

jest.mock("../../services/ProductService", () => ({
  productService: { getProduct: jest.fn() },
}));

const mockedCategoryService = jest.mocked(categoryService);
const mockedProductService = jest.mocked(productService);

const category: Category = {
  id: "c1",
  shopId: "shop-1",
  name: "Mode",
  isActive: true,
  createdAt: {} as never,
};

const product: Product = {
  id: "p1",
  shopId: "shop-1",
  name: "T-shirt",
  description: "",
  category: "Mode",
  price: 5000,
  stock: 3,
  stockThreshold: 2,
  images: [],
  isPromo: false,
  isPublished: true,
  createdAt: {} as never,
  updatedAt: {} as never,
};

// BF-131 : chaque page de création/édition doit offrir un moyen explicite
// de revenir à la liste des produits, pas seulement le bouton retour du
// navigateur (demande utilisateur du 2026-09-28).
describe("ProductFormPageContent — lien retour", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCategoryService.listCategories.mockResolvedValue([category]);
  });

  it("shows a link back to the product list once the creation form loads", async () => {
    render(<ProductFormPageContent shopId="shop-1" />);

    await waitFor(() =>
      expect(screen.getByTestId("product-form")).toBeInTheDocument()
    );

    expect(
      screen.getByRole("link", { name: /retour aux produits/i })
    ).toHaveAttribute("href", "/dashboard/products");
  });

  it("shows a link back to the product list once the edit form loads", async () => {
    mockedProductService.getProduct.mockResolvedValue(product);

    render(<ProductFormPageContent shopId="shop-1" productId="p1" />);

    await waitFor(() =>
      expect(screen.getByTestId("product-form")).toBeInTheDocument()
    );

    expect(
      screen.getByRole("link", { name: /retour aux produits/i })
    ).toHaveAttribute("href", "/dashboard/products");
  });

  it("still offers a way back to the product list when the product isn't found", async () => {
    mockedProductService.getProduct.mockResolvedValue(null);

    render(<ProductFormPageContent shopId="shop-1" productId="missing" />);

    await waitFor(() =>
      expect(screen.getByText("Produit introuvable.")).toBeInTheDocument()
    );

    expect(
      screen.getByRole("link", { name: /retour aux produits/i })
    ).toHaveAttribute("href", "/dashboard/products");
  });
});
