jest.mock("../../services/CategoryService", () => ({
  categoryService: { listCategories: jest.fn() },
}));

jest.mock("./CategoryManager", () => ({
  CategoryManager: ({ initialCategories }: { initialCategories: unknown[] }) => (
    <div data-testid="category-manager">
      {initialCategories.length} catégorie(s)
    </div>
  ),
}));

import { render, screen } from "@testing-library/react";

import { CategoriesPageContent } from "@/components/dashboard/CategoriesPageContent";
import { categoryService } from "@/services/CategoryService";

const categoryServiceMock = categoryService as jest.Mocked<typeof categoryService>;

describe("CategoriesPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a read-only demo preview when the shop has no real categories yet", async () => {
    categoryServiceMock.listCategories.mockResolvedValue([]);
    render(<CategoriesPageContent shopId="shop-1" />);

    expect(
      await screen.findByText(
        "Exemple — à quoi ressembleront vos catégories"
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("category-manager")).toHaveTextContent(
      "0 catégorie"
    );
  });

  it("does not show the demo preview once the shop has real categories", async () => {
    categoryServiceMock.listCategories.mockResolvedValue([{ id: "c1" } as never]);
    render(<CategoriesPageContent shopId="shop-1" />);

    await screen.findByTestId("category-manager");
    expect(
      screen.queryByText("Exemple — à quoi ressembleront vos catégories")
    ).not.toBeInTheDocument();
  });
});
