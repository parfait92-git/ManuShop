import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/firebase", () => ({ db: {} }));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const guardMock = jest.fn();
jest.mock("../providers/NavigationBlockerProvider", () => ({
  useNavigationBlocker: () => ({
    isDirty: false,
    guard: guardMock,
    blockNavigation: jest.fn(),
  }),
}));

jest.mock("./ProductImageUploader", () => ({
  ProductImageUploader: ({ images }: { images: string[] }) => (
    <div data-testid="images">{JSON.stringify(images)}</div>
  ),
}));

import { productService } from "@/services/ProductService";
import {
  loadProductDraft,
  saveProductDraft,
} from "@/lib/productDraft";
import { ProductForm } from "@/components/dashboard/ProductForm";
import type { Category } from "@/models/category/Category";

jest.mock("../../services/ProductService", () => {
  const actual = jest.requireActual("../../services/ProductService");
  return {
    ...actual,
    productService: {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
    },
  };
});

const mockedProductService = jest.mocked(productService);

const activeCategory: Category = {
  id: "c1",
  shopId: "shop-1",
  name: "Mode",
  isActive: true,
  createdAt: {} as never,
};

describe("ProductForm — brouillon local (création uniquement)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it("restores a saved draft into the visible inputs on mount", async () => {
    saveProductDraft({
      values: {
        name: "Ensemble Wax Restauré",
        description: "Une description de test.",
        price: "12345",
        category: "Mode",
        stock: "7",
        stockThreshold: "1",
        isPromo: false,
      },
      images: ["https://res.cloudinary.com/demo/image/upload/x.jpg"],
    });

    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);

    const nameInput = screen.getByLabelText("Nom du produit") as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe("Ensemble Wax Restauré"));
    expect(screen.getByTestId("images").textContent).toContain(
      "res.cloudinary.com"
    );
    expect(screen.getByText(/Brouillon restauré/)).toBeInTheDocument();
  });

  it("excludes categories with isActive: false from the select, keeping active ones", () => {
    const categories: Category[] = [
      activeCategory,
      { ...activeCategory, id: "c2", name: "Masquée", isActive: false },
    ];

    render(<ProductForm shopId="shop-1" categories={categories} />);

    const select = screen.getByLabelText("Catégorie") as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent);

    expect(optionLabels).toContain("Mode");
    expect(optionLabels).not.toContain("Masquée");
  });

  it("writes the current field values to localStorage when 'Enregistrer le brouillon' is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);

    await user.type(screen.getByLabelText("Nom du produit"), "Sac à main");
    await user.click(
      screen.getByRole("button", { name: /Enregistrer le brouillon/ })
    );

    expect(loadProductDraft()?.values.name).toBe("Sac à main");
    expect(
      await screen.findByText(/Brouillon sauvegardé/)
    ).toBeInTheDocument();
  });

  it("clears any saved draft once the product is successfully created", async () => {
    mockedProductService.createProduct.mockResolvedValue({} as never);
    saveProductDraft({
      values: {
        name: "Brouillon existant",
        description: "d",
        price: "100",
        category: "Mode",
        stock: "1",
        stockThreshold: "0",
        isPromo: false,
      },
      images: [],
    });

    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Nom du produit") as HTMLInputElement).value
      ).toBe("Brouillon existant")
    );

    await user.click(
      screen.getByRole("button", { name: /Créer le produit/ })
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/products"));
    expect(loadProductDraft()).toBeNull();
  });
});
