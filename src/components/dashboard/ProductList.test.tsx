jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

// jsdom n'implémente pas PointerEvent, dont Base UI (Switch) a besoin pour
// son gestionnaire de clic — voir CategoryManager.test.tsx pour le détail.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId = 1;
    width = 1;
    height = 1;
    pressure = 0.5;
    tangentialPressure = 0;
    tiltX = 0;
    tiltY = 0;
    twist = 0;
    pointerType = "mouse";
    isPrimary = true;
    constructor(type: string, params: MouseEventInit = {}) {
      super(type, params);
    }
  }
  // @ts-expect-error -- polyfill réservé à l'environnement de test
  window.PointerEvent = PointerEventPolyfill;
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

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
  },
}));

jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({
    profile: { id: "uid-1", displayName: "Ada Diallo", role: "admin" },
  }),
}));

jest.mock("../../services/ActivityLogService", () => ({
  activityLogService: {
    logProductPublished: jest.fn(),
    logProductUnpublished: jest.fn(),
    logProductTrashed: jest.fn(),
  },
}));

jest.mock("../../services/TrashService", () => ({
  productTrashService: {
    softDelete: jest.fn(),
  },
}));

import { activityLogService } from "@/services/ActivityLogService";
import { productService } from "@/services/ProductService";
import { productTrashService } from "@/services/TrashService";
import { ProductList } from "@/components/dashboard/ProductList";
import type { Product } from "@/models/product/Product";

// `productService` n'est pas mocké en bloc : `ProductList` appelle aussi
// ses méthodes pures réelles (`search`, `getStockStatus`) pour filtrer/
// afficher la table — seule `setPublished` (I/O) est espionnée ci-dessous.
const mockedTrashService = jest.mocked(productTrashService);
const mockedActivityLog = jest.mocked(activityLogService);

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    shopId: "shop-1",
    name: "Ensemble Wax",
    description: "Ensemble deux pièces.",
    price: 10000,
    category: "Mode",
    images: [],
    stock: 5,
    stockThreshold: 2,
    isPromo: false,
    createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
    updatedAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
    ...overrides,
  };
}

describe("ProductList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a product as published by default (absent isPublished, BF-90)", () => {
    render(
      <ProductList initialProducts={[fakeProduct()]} categories={[]} />
    );

    expect(
      screen.getByLabelText("Publier Ensemble Wax")
    ).toHaveAttribute("data-checked");
  });

  it("unpublishes a product and logs the event", async () => {
    jest.spyOn(productService, "setPublished").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ProductList initialProducts={[fakeProduct()]} categories={[]} />
    );

    await user.click(screen.getByLabelText("Publier Ensemble Wax"));

    await waitFor(() =>
      expect(productService.setPublished).toHaveBeenCalledWith("p1", false)
    );
    expect(mockedActivityLog.logProductUnpublished).toHaveBeenCalledWith(
      { shopId: "shop-1", actorId: "uid-1", actorName: "Ada Diallo" },
      "p1",
      "Ensemble Wax"
    );
  });

  it("moves a product to the trash instead of deleting it for good (BF-99)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    mockedTrashService.softDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ProductList initialProducts={[fakeProduct()]} categories={[]} />
    );

    await user.click(screen.getByLabelText("Supprimer Ensemble Wax"));

    await waitFor(() =>
      expect(productTrashService.softDelete).toHaveBeenCalledWith("p1")
    );
    expect(mockedActivityLog.logProductTrashed).toHaveBeenCalledWith(
      { shopId: "shop-1", actorId: "uid-1", actorName: "Ada Diallo" },
      "p1",
      "Ensemble Wax"
    );
    expect(screen.queryByText("Ensemble Wax")).not.toBeInTheDocument();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <ProductList initialProducts={[fakeProduct()]} categories={[]} />
    );

    await user.click(screen.getByLabelText("Supprimer Ensemble Wax"));

    expect(productTrashService.softDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Ensemble Wax")).toBeInTheDocument();
  });

  describe("produits sans photo", () => {
    const withPhoto = (id: string, name: string) =>
      fakeProduct({
        id,
        name,
        images: ["https://res.cloudinary.com/demo/image/upload/x.jpg"],
      });

    it("warns about every product without a photo and flags each one in the table", () => {
      render(
        <ProductList
          initialProducts={[
            fakeProduct({ id: "p1", name: "Sans photo A" }),
            fakeProduct({ id: "p2", name: "Sans photo B" }),
            withPhoto("p3", "Avec photo"),
          ]}
          categories={[]}
        />
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "2 produits n'ont pas de photo."
      );
      const fixLinks = screen.getAllByRole("link", {
        name: "Sans photo — ajouter",
      });
      expect(fixLinks).toHaveLength(2);
      expect(fixLinks[0]).toHaveAttribute(
        "href",
        "/dashboard/products/p1/edit"
      );
    });

    it("shows no warning when every product has a photo", () => {
      render(
        <ProductList
          initialProducts={[withPhoto("p1", "Avec photo")]}
          categories={[]}
        />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Sans photo — ajouter" })
      ).not.toBeInTheDocument();
    });

    it("cannot be dismissed, but can narrow the table to the affected products", async () => {
      const user = userEvent.setup();
      render(
        <ProductList
          initialProducts={[
            fakeProduct({ id: "p1", name: "Sans photo A" }),
            withPhoto("p2", "Avec photo"),
          ]}
          categories={[]}
        />
      );

      expect(
        screen.queryByRole("button", { name: /fermer|ignorer/i })
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Voir les produits concernés" })
      );
      expect(screen.getByText("Sans photo A")).toBeInTheDocument();
      expect(screen.queryByText("Avec photo")).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Afficher tous les produits" })
      );
      expect(screen.getByText("Avec photo")).toBeInTheDocument();
    });
  });
});
