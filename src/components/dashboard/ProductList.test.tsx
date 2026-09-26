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
});
