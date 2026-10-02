// Visite guidée de la fenêtre (BF-134/135, testée dans onboarding/) : elle
// charge le SDK Firebase via useAuth et se lancerait sur le profil de test.
jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));

import { render, screen, waitFor, within } from "@testing-library/react";
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

jest.mock("../../services/CategoryTagService", () => ({
  categoryTagService: {
    listTags: jest.fn(),
  },
}));

import { deleteField } from "firebase/firestore";

import { categoryService } from "@/services/CategoryService";
import { categoryTagService } from "@/services/CategoryTagService";
import { categoryTrashService } from "@/services/TrashService";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import type { Category } from "@/models/category/Category";
import type { CategoryTag } from "@/models/category/CategoryTag";

jest.mock("../../services/CategoryService", () => ({
  categoryService: {
    createCategory: jest.fn(),
    setCategoryActive: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
}));

const mockedCategoryService = jest.mocked(categoryService);
const mockedCategoryTagService = jest.mocked(categoryTagService);
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

function fakeTag(overrides: Partial<CategoryTag> = {}): CategoryTag {
  return {
    id: "tag1",
    name: "Alimentation",
    color: "#2563eb",
    createdAt: {} as never,
    ...overrides,
  };
}

describe("CategoryManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCategoryTagService.listTags.mockResolvedValue([]);
  });

  it("submits isActive: false by default, without touching the toggle", async () => {
    mockedCategoryService.createCategory.mockResolvedValue(
      fakeCategory({ id: "new-id", isActive: false })
    );
    const user = userEvent.setup();
    render(<CategoryManager shopId="shop-1" initialCategories={[]} />);

    await user.type(screen.getByLabelText(/^Nom de la catégorie/), "Test");
    await user.type(screen.getByLabelText(/^Description/), "Desc");
    await user.click(screen.getByRole("button", { name: /Créer la catégorie/ }));

    await waitFor(() =>
      expect(categoryService.createCategory).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({ isActive: false })
      )
    );
  });

  it("submits isActive: true when the display toggle is switched on before creating", async () => {
    mockedCategoryService.createCategory.mockResolvedValue(
      fakeCategory({ id: "new-id", isActive: true })
    );
    const user = userEvent.setup();
    render(<CategoryManager shopId="shop-1" initialCategories={[]} />);

    await user.type(screen.getByLabelText(/^Nom de la catégorie/), "Test");
    await user.type(screen.getByLabelText(/^Description/), "Desc");
    await user.click(screen.getByLabelText("Afficher la catégorie"));
    await user.click(screen.getByRole("button", { name: /Créer la catégorie/ }));

    await waitFor(() =>
      expect(categoryService.createCategory).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({ isActive: true })
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

  describe("modifier une catégorie (double-clic ou icône)", () => {
    it("opens the edit dialog via the edit icon, pre-filled, and saves changes", async () => {
      mockedCategoryService.updateCategory.mockResolvedValue(undefined);
      const user = userEvent.setup();
      const category = fakeCategory();
      render(
        <CategoryManager shopId="shop-1" initialCategories={[category]} />
      );

      await user.click(screen.getByLabelText(`Modifier ${category.name}`));

      const nameField = await screen.findByLabelText("Nom de la catégorie");
      expect(nameField).toHaveValue("Mode");
      expect(screen.getByLabelText("Description")).toHaveValue("Vêtements");

      await user.clear(nameField);
      await user.type(nameField, "Mode & Accessoires");
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() =>
        expect(categoryService.updateCategory).toHaveBeenCalledWith(
          category.id,
          { name: "Mode & Accessoires", description: "Vêtements" }
        )
      );
      expect(await screen.findByText("Mode & Accessoires")).toBeInTheDocument();
    });

    it("also opens the edit dialog on a double-click on the row", async () => {
      const user = userEvent.setup();
      const category = fakeCategory();
      render(
        <CategoryManager shopId="shop-1" initialCategories={[category]} />
      );

      await user.dblClick(screen.getByText(category.name));

      expect(await screen.findByText("Modifier la catégorie")).toBeInTheDocument();
    });

    it("closes without saving when cancelled", async () => {
      const user = userEvent.setup();
      const category = fakeCategory();
      render(
        <CategoryManager shopId="shop-1" initialCategories={[category]} />
      );

      await user.click(screen.getByLabelText(`Modifier ${category.name}`));
      await screen.findByText("Modifier la catégorie");
      await user.click(screen.getByRole("button", { name: "Annuler" }));

      expect(screen.queryByText("Modifier la catégorie")).not.toBeInTheDocument();
      expect(categoryService.updateCategory).not.toHaveBeenCalled();
    });
  });

  describe("association à un tag de catégorie système (BF-109→111)", () => {
    it("lists the available tags in the create form", async () => {
      mockedCategoryTagService.listTags.mockResolvedValue([
        fakeTag(),
        fakeTag({ id: "tag2", name: "Mode" }),
      ]);
      render(<CategoryManager shopId="shop-1" initialCategories={[]} />);

      await screen.findByText("Alimentation");
      const select = screen.getByLabelText(
        "Tag de catégorie système"
      ) as HTMLSelectElement;
      expect(
        Array.from(select.options).map((option) => option.textContent)
      ).toEqual(["Aucun tag", "Alimentation", "Mode"]);
    });

    it("creates a category with the selected tag", async () => {
      mockedCategoryTagService.listTags.mockResolvedValue([fakeTag()]);
      mockedCategoryService.createCategory.mockResolvedValue(
        fakeCategory({ id: "new-id", tagId: "tag1" })
      );
      const user = userEvent.setup();
      render(<CategoryManager shopId="shop-1" initialCategories={[]} />);

      await user.type(screen.getByLabelText(/^Nom de la catégorie/), "Test");
      await user.type(screen.getByLabelText(/^Description/), "Desc");
      await user.selectOptions(
        await screen.findByLabelText("Tag de catégorie système"),
        "tag1"
      );
      await user.click(screen.getByRole("button", { name: /Créer la catégorie/ }));

      await waitFor(() =>
        expect(categoryService.createCategory).toHaveBeenCalledWith(
          "shop-1",
          expect.objectContaining({ tagId: "tag1" })
        )
      );
    });

    it("submits an empty tagId when none is selected — CategoryService is responsible for omitting it before writing", async () => {
      mockedCategoryService.createCategory.mockResolvedValue(
        fakeCategory({ id: "new-id" })
      );
      const user = userEvent.setup();
      render(<CategoryManager shopId="shop-1" initialCategories={[]} />);

      await user.type(screen.getByLabelText(/^Nom de la catégorie/), "Test");
      await user.type(screen.getByLabelText(/^Description/), "Desc");
      await user.click(screen.getByRole("button", { name: /Créer la catégorie/ }));

      await waitFor(() =>
        expect(categoryService.createCategory).toHaveBeenCalledWith(
          "shop-1",
          expect.objectContaining({ tagId: "" })
        )
      );
    });

    it("shows the associated tag's name and color on the row", async () => {
      mockedCategoryTagService.listTags.mockResolvedValue([fakeTag()]);
      const category = fakeCategory({ tagId: "tag1" });
      render(
        <CategoryManager shopId="shop-1" initialCategories={[category]} />
      );

      expect(await screen.findByTitle("Tag système : Alimentation")).toHaveTextContent(
        "Alimentation"
      );
    });

    it("updates a category's tag via the edit dialog", async () => {
      mockedCategoryTagService.listTags.mockResolvedValue([fakeTag()]);
      mockedCategoryService.updateCategory.mockResolvedValue(undefined);
      const user = userEvent.setup();
      const category = fakeCategory();
      render(
        <CategoryManager shopId="shop-1" initialCategories={[category]} />
      );

      await user.click(screen.getByLabelText(`Modifier ${category.name}`));
      const dialog = within(await screen.findByRole("dialog"));
      await user.selectOptions(
        dialog.getByLabelText("Tag de catégorie système"),
        "tag1"
      );
      await user.click(dialog.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() =>
        expect(categoryService.updateCategory).toHaveBeenCalledWith(
          category.id,
          { name: "Mode", description: "Vêtements", tagId: "tag1" }
        )
      );
    });

    it("removes a category's tag via the edit dialog", async () => {
      mockedCategoryTagService.listTags.mockResolvedValue([fakeTag()]);
      mockedCategoryService.updateCategory.mockResolvedValue(undefined);
      const user = userEvent.setup();
      const category = fakeCategory({ tagId: "tag1" });
      render(
        <CategoryManager shopId="shop-1" initialCategories={[category]} />
      );

      await user.click(screen.getByLabelText(`Modifier ${category.name}`));
      const dialog = within(await screen.findByRole("dialog"));
      await user.selectOptions(
        dialog.getByLabelText("Tag de catégorie système"),
        ""
      );
      await user.click(dialog.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() =>
        expect(categoryService.updateCategory).toHaveBeenCalledWith(
          category.id,
          { name: "Mode", description: "Vêtements", tagId: deleteField() }
        )
      );
    });
  });
});
