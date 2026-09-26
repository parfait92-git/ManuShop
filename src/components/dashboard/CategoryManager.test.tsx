import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom n'implémente pas PointerEvent, dont Base UI (Switch/Button) a besoin
// pour son gestionnaire de clic — sans ce polyfill, un clic sur le switch
// lève une exception avant même d'atteindre `onCheckedChange`.
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
    logCategoryTrashed: jest.fn(),
  },
}));

jest.mock("../../services/TrashService", () => ({
  categoryTrashService: {
    softDelete: jest.fn(),
  },
}));

import { categoryService } from "@/services/CategoryService";
import { categoryTrashService } from "@/services/TrashService";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import type { Category } from "@/models/category/Category";

jest.mock("../../services/CategoryService", () => ({
  categoryService: {
    createCategory: jest.fn(),
    setCategoryActive: jest.fn(),
    deleteCategory: jest.fn(),
  },
}));

const mockedCategoryService = jest.mocked(categoryService);
const mockedCategoryTrashService = jest.mocked(categoryTrashService);

function fakeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "c1",
    shopId: "shop-1",
    name: "Mode",
    description: "Vêtements",
    isActive: true,
    createdAt: {} as never,
    ...overrides,
  };
}

describe("CategoryManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits isActive: false when the display toggle is switched off before creating", async () => {
    mockedCategoryService.createCategory.mockResolvedValue(
      fakeCategory({ id: "new-id", isActive: false })
    );
    const user = userEvent.setup();
    render(<CategoryManager shopId="shop-1" initialCategories={[]} />);

    await user.type(screen.getByLabelText(/Nom de la catégorie/), "Test");
    await user.type(screen.getByLabelText(/Description/), "Desc");
    await user.click(screen.getByLabelText("Afficher la catégorie"));
    await user.click(screen.getByRole("button", { name: /Créer la catégorie/ }));

    await waitFor(() =>
      expect(categoryService.createCategory).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({ isActive: false })
      )
    );
  });

  it("shows an error and leaves the category unchanged when the toggle update is rejected", async () => {
    mockedCategoryService.setCategoryActive.mockRejectedValue(
      new Error("permission-denied")
    );
    const user = userEvent.setup();
    const category = fakeCategory();
    render(
      <CategoryManager shopId="shop-1" initialCategories={[category]} />
    );

    await user.click(screen.getByLabelText(`Masquer ${category.name}`));

    expect(
      await screen.findByText(/Impossible de mettre à jour cette catégorie/)
    ).toBeInTheDocument();
    // Toujours "Affichée" : la mise à jour a échoué, l'état local n'a pas bougé.
    expect(screen.getByText("Affichée")).toBeInTheDocument();
  });

  it("toggles a category to masquée when the update succeeds", async () => {
    mockedCategoryService.setCategoryActive.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const category = fakeCategory();
    render(
      <CategoryManager shopId="shop-1" initialCategories={[category]} />
    );

    await user.click(screen.getByLabelText(`Masquer ${category.name}`));

    expect(await screen.findByText("Masquée")).toBeInTheDocument();
    expect(categoryService.setCategoryActive).toHaveBeenCalledWith(
      category.id,
      false
    );
  });

  it("moves a category to the trash instead of deleting it for good (BF-99)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    mockedCategoryTrashService.softDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const category = fakeCategory();
    render(
      <CategoryManager shopId="shop-1" initialCategories={[category]} />
    );

    await user.click(screen.getByLabelText(`Supprimer ${category.name}`));

    await waitFor(() =>
      expect(categoryTrashService.softDelete).toHaveBeenCalledWith(
        category.id
      )
    );
    expect(categoryService.deleteCategory).not.toHaveBeenCalled();
    expect(screen.queryByText(category.name)).not.toBeInTheDocument();
  });
});
