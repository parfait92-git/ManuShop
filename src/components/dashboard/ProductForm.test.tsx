jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));
// jsdom n'a pas `PointerEvent`, qu'utilise l'interrupteur de Base UI.
if (typeof window !== "undefined" && !("PointerEvent" in window)) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class extends MouseEvent {};
}

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/firebase", () => ({ db: {} }));

const recordInitialStockMock: jest.Mock = jest.fn(async () => undefined);
const restockMock: jest.Mock = jest.fn();
const listProductHistoryMock: jest.Mock = jest.fn(async () => []);
jest.mock("../../services/StockService", () => ({
  stockService: {
    recordInitialStock: (...args: unknown[]) => recordInitialStockMock(...args),
    restock: (...args: unknown[]) => restockMock(...args),
    adjust: jest.fn(),
    listProductHistory: (...args: unknown[]) => listProductHistoryMock(...args),
    saveVariants: (...args: unknown[]) => saveVariantsMock(...args),
  },
}));
const saveVariantsMock: jest.Mock = jest.fn(async () => undefined);

// Rôle configurable par test : le prix d'achat est réservé au gérant.
let mockRole = "admin";
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ profile: { id: "u1", role: mockRole } }),
}));

const savePurchasePriceMock: jest.Mock = jest.fn(async () => undefined);
const getPurchasePriceMock: jest.Mock = jest.fn(async () => undefined);
jest.mock("../../services/CostService", () => ({
  costService: {
    savePurchasePrice: (...args: unknown[]) => savePurchasePriceMock(...args),
    getPurchasePrice: (...args: unknown[]) => getPurchasePriceMock(...args),
  },
}));

const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastErrorMock(...args) } }));

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
    await user.type(screen.getByLabelText("Stock initial"), "5");
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

  it("creates a product with versions, its stock being their total", async () => {
    mockedProductService.createProduct.mockResolvedValue({ id: "new-id" } as never);
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);
    await user.type(screen.getByLabelText("Nom du produit"), "Huile de coco");
    await user.type(screen.getByLabelText("Description"), "Vierge.");
    await user.type(screen.getByLabelText("Prix (FCFA)"), "3000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "Mode");
    await user.type(screen.getByLabelText("Seuil d'alerte"), "1");
    await user.click(screen.getByRole("button", { name: "fake-add-photo" }));

    await user.click(screen.getByRole("switch", { name: /plusieurs versions/ }));
    await user.type(screen.getByRole("combobox", { name: /Les versions diffèrent par/ }), "Contenance");
    await user.type(screen.getByLabelText("Nom de la version 1"), "250 ml");
    await user.type(screen.getByLabelText("Stock de la version 1"), "4");
    await user.type(screen.getByLabelText("Nom de la version 2"), "500 ml");
    await user.type(screen.getByLabelText("Prix de la version 2"), "5500");
    await user.type(screen.getByLabelText("Stock de la version 2"), "2");
    expect((screen.getByRole("textbox", { name: /Stock total/ }) as HTMLInputElement).value).toBe("6");

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    await waitFor(() => expect(mockedProductService.createProduct).toHaveBeenCalled());
    const created = mockedProductService.createProduct.mock.calls[0][0];
    expect(created).toEqual(expect.objectContaining({ stock: 6, variantName: "Contenance" }));
    expect(Object.values(created.variants!)).toEqual([
      { label: "250 ml", stock: 4, position: 0 },
      { label: "500 ml", stock: 2, price: 5500, position: 1 },
    ]);
    expect(recordInitialStockMock).toHaveBeenCalledWith("new-id");
  });

  it("refuses versions with the same name", async () => {
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "fake-add-photo" }));
    await user.click(screen.getByRole("switch", { name: /plusieurs versions/ }));
    await user.type(screen.getByRole("combobox", { name: /Les versions diffèrent par/ }), "Taille");
    await user.type(screen.getByLabelText("Nom de la version 1"), "M");
    await user.type(screen.getByLabelText("Nom de la version 2"), "m");

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Deux versions portent le même nom.");
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

describe("ProductForm — prix d'achat (gérant uniquement)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockRole = "admin";
    savePurchasePriceMock.mockResolvedValue(undefined);
    getPurchasePriceMock.mockResolvedValue(undefined);
    Element.prototype.scrollIntoView = jest.fn();
  });

  async function fillAndAddPhoto(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nom du produit"), "Ensemble Wax");
    await user.type(screen.getByLabelText("Description"), "Deux pièces.");
    await user.type(screen.getByLabelText("Prix (FCFA)"), "10000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "Mode");
    await user.type(screen.getByLabelText("Stock initial"), "5");
    await user.type(screen.getByLabelText("Seuil d'alerte"), "1");
    await user.click(screen.getByRole("button", { name: "fake-add-photo" }));
  }

  it("lets the owner enter a purchase price, previews the margin, and saves it privately for the new product", async () => {
    mockedProductService.createProduct.mockResolvedValue({ id: "new-id" } as never);
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);
    await fillAndAddPhoto(user);

    await user.type(screen.getByLabelText("Prix d'achat (FCFA)"), "7000");
    expect(screen.getByText(/Marge par unité : 3\s?000 FCFA \(30 %/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    await waitFor(() =>
      expect(savePurchasePriceMock).toHaveBeenCalledWith("new-id", "shop-1", 7000)
    );
    // Premier maillon de l'historique du stock du nouveau produit.
    expect(recordInitialStockMock).toHaveBeenCalledWith("new-id");
    // Jamais sur le produit lui-même, lisible par tout le monde.
    expect(mockedProductService.createProduct).toHaveBeenCalledWith(
      expect.not.objectContaining({ purchasePrice: expect.anything() })
    );
  });

  it("warns about selling at a loss", async () => {
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);
    await user.type(screen.getByLabelText("Prix (FCFA)"), "5000");
    await user.type(screen.getByLabelText("Prix d'achat (FCFA)"), "6000");

    expect(screen.getByText(/vente à perte/)).toBeInTheDocument();
  });

  it("hides the purchase price from sellers and never writes one for them", async () => {
    mockRole = "seller";
    mockedProductService.createProduct.mockResolvedValue({ id: "new-id" } as never);
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);

    expect(screen.queryByLabelText("Prix d'achat (FCFA)")).not.toBeInTheDocument();
    await fillAndAddPhoto(user);
    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/products"));
    expect(savePurchasePriceMock).not.toHaveBeenCalled();
  });

  it("still leaves the page when only the purchase price fails to save — retrying would duplicate the product", async () => {
    mockedProductService.createProduct.mockResolvedValue({ id: "new-id" } as never);
    savePurchasePriceMock.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} />);
    await fillAndAddPhoto(user);
    await user.type(screen.getByLabelText("Prix d'achat (FCFA)"), "7000");

    await user.click(screen.getByRole("button", { name: "Créer le produit" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/products"));
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("pas son prix d'achat"));
  });

  it("loads the existing purchase price when the owner edits a product", async () => {
    getPurchasePriceMock.mockResolvedValue(4500);
    render(
      <ProductForm
        shopId="shop-1"
        categories={[activeCategory]}
        product={{
          id: "p1",
          shopId: "shop-1",
          name: "Ensemble Wax",
          description: "Deux pièces.",
          price: 10000,
          category: "Mode",
          stock: 5,
          stockThreshold: 1,
          isPromo: false,
          images: ["https://res.cloudinary.com/demo/old.jpg"],
          createdAt: {} as never,
          updatedAt: {} as never,
        }}
      />
    );

    await waitFor(() =>
      expect((screen.getByLabelText("Prix d'achat (FCFA)") as HTMLInputElement).value).toBe("4500")
    );
    expect(getPurchasePriceMock).toHaveBeenCalledWith("p1");
  });
});

describe("ProductForm — stock tracé (BF-15)", () => {
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
    images: ["https://res.cloudinary.com/demo/old.jpg"],
    createdAt: {} as never,
    updatedAt: {} as never,
  };

  it("shows the stock read-only on an existing product and never sends it with the other changes", async () => {
    jest.clearAllMocks();
    mockRole = "seller";
    mockedProductService.updateProduct.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} product={existing} />);

    const stock = screen.getByLabelText("Stock") as HTMLInputElement;
    expect(stock.value).toBe("5");
    expect(stock).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Gérer le stock" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(() => expect(mockedProductService.updateProduct).toHaveBeenCalled());
    expect(mockedProductService.updateProduct.mock.calls[0][1]).not.toHaveProperty("stock");
  });
});

describe("ProductForm — prix d'achat existant", () => {
  it("never erases an existing purchase price when it couldn't be loaded and the owner edits something else", async () => {
    jest.clearAllMocks();
    mockRole = "admin";
    getPurchasePriceMock.mockRejectedValue(new Error("offline"));
    mockedProductService.updateProduct.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ProductForm
        shopId="shop-1"
        categories={[activeCategory]}
        product={{
          id: "p1",
          shopId: "shop-1",
          name: "Ensemble Wax",
          description: "Deux pièces.",
          price: 10000,
          category: "Mode",
          stock: 5,
          stockThreshold: 1,
          isPromo: false,
          images: ["https://res.cloudinary.com/demo/old.jpg"],
          createdAt: {} as never,
          updatedAt: {} as never,
        }}
      />
    );

    await user.clear(screen.getByLabelText("Seuil d'alerte"));
    await user.type(screen.getByLabelText("Seuil d'alerte"), "2");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(() => expect(mockedProductService.updateProduct).toHaveBeenCalled());
    expect(savePurchasePriceMock).not.toHaveBeenCalled();
  });

  it("saves a purchase price the owner actually changed on an existing product", async () => {
    jest.clearAllMocks();
    mockRole = "admin";
    getPurchasePriceMock.mockResolvedValue(4500);
    mockedProductService.updateProduct.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ProductForm
        shopId="shop-1"
        categories={[activeCategory]}
        product={{
          id: "p1",
          shopId: "shop-1",
          name: "Ensemble Wax",
          description: "Deux pièces.",
          price: 10000,
          category: "Mode",
          stock: 5,
          stockThreshold: 1,
          isPromo: false,
          images: ["https://res.cloudinary.com/demo/old.jpg"],
          createdAt: {} as never,
          updatedAt: {} as never,
        }}
      />
    );
    const field = screen.getByLabelText("Prix d'achat (FCFA)") as HTMLInputElement;
    await waitFor(() => expect(field.value).toBe("4500"));

    await user.clear(field);
    await user.type(field, "5000");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(() =>
      expect(savePurchasePriceMock).toHaveBeenCalledWith("p1", "shop-1", 5000)
    );
  });
});

describe("ProductForm — versions d'un produit existant (BF-17)", () => {
  const withVariants = {
    id: "p1",
    shopId: "shop-1",
    name: "Huile de coco",
    description: "Vierge.",
    price: 3000,
    category: "Mode",
    stock: 6,
    stockThreshold: 1,
    isPromo: false,
    images: ["https://res.cloudinary.com/demo/old.jpg"],
    variantName: "Contenance",
    variants: {
      a: { label: "250 ml", stock: 4, position: 0 },
      b: { label: "500 ml", stock: 2, price: 5500, position: 1 },
    },
    createdAt: {} as never,
    updatedAt: {} as never,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = "admin";
    mockedProductService.updateProduct.mockResolvedValue(undefined);
  });

  it("keeps the stock of saved versions read-only and sends the changes to the server first", async () => {
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} product={withVariants} />);

    expect(screen.getByLabelText("Stock de la version 1")).toHaveAttribute("readonly");
    await user.click(screen.getByRole("button", { name: "Ajouter une version" }));
    await user.type(screen.getByLabelText("Nom de la version 3"), "1 l");
    await user.type(screen.getByLabelText("Stock de la version 3"), "3");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(() => expect(mockedProductService.updateProduct).toHaveBeenCalled());
    expect(saveVariantsMock).toHaveBeenCalledWith("p1", "Contenance", [
      { id: "a", label: "250 ml" },
      { id: "b", label: "500 ml", price: 5500 },
      { stock: 3, label: "1 l" },
    ]);
    expect(saveVariantsMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockedProductService.updateProduct.mock.invocationCallOrder[0]
    );
  });

  it("shows the server's refusal and keeps the form open", async () => {
    saveVariantsMock.mockRejectedValueOnce(new Error("« 500 ml » a encore 2 en stock : corrigez son stock à 0 avant de la retirer."));
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} product={withVariants} />);

    await user.click(screen.getByRole("button", { name: "Retirer la version 500 ml" }));
    await user.type(screen.getByLabelText("Nom de la version 1"), " ");
    await user.click(screen.getByRole("button", { name: "Ajouter une version" }));
    await user.type(screen.getByLabelText("Nom de la version 2"), "1 l");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("a encore 2 en stock");
    expect(mockedProductService.updateProduct).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("doesn't touch the versions when they weren't changed", async () => {
    const user = userEvent.setup();
    render(<ProductForm shopId="shop-1" categories={[activeCategory]} product={withVariants} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    await waitFor(() => expect(mockedProductService.updateProduct).toHaveBeenCalled());
    expect(saveVariantsMock).not.toHaveBeenCalled();
  });
});
