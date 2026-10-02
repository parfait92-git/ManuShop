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
  ProductImageUploader: ({
    images,
    onChange,
  }: {
    images: string[];
    onChange: (images: string[]) => void;
  }) => (
    <div>
      <div data-testid="images">{JSON.stringify(images)}</div>
      <button
        type="button"
        onClick={() =>
          onChange([...images, "https://res.cloudinary.com/demo/new.webp"])
        }
      >
        fake-add-photo
      </button>
      <button type="button" onClick={() => onChange([])}>
        fake-remove-all-photos
      </button>
    </div>
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
      images: ["https://res.cloudinary.com/demo/image/upload/x.jpg"],
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
    // Non publié par défaut : le commerçant le publie lui-même une fois prêt
    // (voir ProductList), pas immédiatement visible aux clients dès la
    // création.
    expect(mockedProductService.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: false })
    );
  });
});

describe("ProductForm — photo obligatoire", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    // jsdom n'implémente pas scrollIntoView.
    Element.prototype.scrollIntoView = jest.fn();
  });

  async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nom du produit"), "Ensemble Wax");
    await user.type(screen.getByLabelText("Description"), "Deux pièces.");
    await user.type(screen.getByLabelText("Prix (FCFA)"), "10000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "Mode");
    await user.type(screen.getByLabelText("Stock"), "5");
    await user.type(screen.getByLabelText("Seuil d'alerte"), "1");
  }

  it("refuses to create a product without any photo, and lets it through once one is added", async () => {
    mockedProductService.createProduct.mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    expect(
      await screen.findByText("Ajoutez au moins une photo du produit.")
    ).toBeInTheDocument();
    expect(mockedProductService.createProduct).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "fake-add-photo" }));
    // L'erreur disparaît dès qu'une photo est ajoutée.
    expect(
      screen.queryByText("Ajoutez au moins une photo du produit.")
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));
    await waitFor(() =>
      expect(mockedProductService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ["https://res.cloudinary.com/demo/new.webp"],
        })
      )
    );
  });

  it("shows the missing-photo error alongside the other field errors on an empty submit", async () => {
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    expect(
      await screen.findByText("Ajoutez au moins une photo du produit.")
    ).toBeInTheDocument();
    expect(mockedProductService.createProduct).not.toHaveBeenCalled();
  });

  const existing = {
    id: "p1",
    shopId: "shop-1",
    name: "Ensemble Wax",
    description: "Deux pièces.",
    price: 10000,
    category: "Mode",
    stock: 5,
    stockThreshold: 1,
    isPromo: false,
    createdAt: {} as never,
    updatedAt: {} as never,
  };

  it("keeps an older product without photo editable, with a warning nudging to add one", async () => {
    mockedProductService.updateProduct.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ProductForm
        shopId="shop-1"
        categories={[activeCategory]}
        product={{ ...existing, images: [] }}
      />
    );

    expect(
      screen.getByText(/Ce produit n.a pas encore de photo/)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Enregistrer les modifications" })
    );
    await waitFor(() =>
      expect(mockedProductService.updateProduct).toHaveBeenCalled()
    );
  });

  it("refuses to remove the last photo of a product that has one", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        shopId="shop-1"
        categories={[activeCategory]}
        product={{
          ...existing,
          images: ["https://res.cloudinary.com/demo/old.jpg"],
        }}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "fake-remove-all-photos" })
    );
    await user.click(
      screen.getByRole("button", { name: "Enregistrer les modifications" })
    );

    expect(
      await screen.findByText("Ajoutez au moins une photo du produit.")
    ).toBeInTheDocument();
    expect(mockedProductService.updateProduct).not.toHaveBeenCalled();
  });
});
