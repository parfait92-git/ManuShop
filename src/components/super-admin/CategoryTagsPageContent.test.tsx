import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listTagsMock = jest.fn();
const createTagMock = jest.fn();
const deleteTagMock = jest.fn();
jest.mock("../../services/CategoryTagService", () => ({
  categoryTagService: {
    listTags: (...args: unknown[]) => listTagsMock(...args),
    createTag: (...args: unknown[]) => createTagMock(...args),
    deleteTag: (...args: unknown[]) => deleteTagMock(...args),
  },
}));

import { CategoryTagsPageContent } from "@/components/super-admin/CategoryTagsPageContent";
import type { CategoryTag } from "@/models/category/CategoryTag";

function fakeTag(overrides: Partial<CategoryTag> = {}): CategoryTag {
  return {
    id: "tag1",
    name: "Alimentation",
    color: "#2563eb",
    createdAt: { toDate: () => new Date("2026-01-01") } as never,
    ...overrides,
  };
}

describe("CategoryTagsPageContent", () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("shows a loading state, then the list of tags", async () => {
    listTagsMock.mockResolvedValue([fakeTag()]);
    render(<CategoryTagsPageContent />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(await screen.findByText("Alimentation")).toBeInTheDocument();
  });

  it("shows an empty state when there are no tags", async () => {
    listTagsMock.mockResolvedValue([]);
    render(<CategoryTagsPageContent />);

    expect(
      await screen.findByText("Aucun tag pour le moment — créez-en un ci-dessus.")
    ).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    listTagsMock.mockRejectedValue(new Error("boom"));
    render(<CategoryTagsPageContent />);

    expect(
      await screen.findByText("Échec du chargement des tags. Réessayez.")
    ).toBeInTheDocument();
  });

  it("creates a tag and appends it to the list", async () => {
    listTagsMock.mockResolvedValue([]);
    createTagMock.mockResolvedValue({ id: "tag2" });
    const user = userEvent.setup();
    render(<CategoryTagsPageContent />);

    await screen.findByText("Aucun tag pour le moment — créez-en un ci-dessus.");

    await user.type(screen.getByLabelText("Nom du tag"), "Électronique");
    await user.click(screen.getByRole("button", { name: /Créer/ }));

    await waitFor(() =>
      expect(createTagMock).toHaveBeenCalledWith("Électronique", "#2563eb")
    );
    expect(await screen.findByText("Électronique")).toBeInTheDocument();
  });

  it("shows an error and keeps the form when creation fails", async () => {
    listTagsMock.mockResolvedValue([]);
    createTagMock.mockRejectedValue(new Error("Le nom du tag est requis."));
    const user = userEvent.setup();
    render(<CategoryTagsPageContent />);

    await screen.findByText("Aucun tag pour le moment — créez-en un ci-dessus.");

    await user.type(screen.getByLabelText("Nom du tag"), "Électronique");
    await user.click(screen.getByRole("button", { name: /Créer/ }));

    expect(
      await screen.findByText("Le nom du tag est requis.")
    ).toBeInTheDocument();
  });

  it("deletes a tag after confirmation", async () => {
    listTagsMock.mockResolvedValue([fakeTag()]);
    deleteTagMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CategoryTagsPageContent />);

    await user.click(
      await screen.findByRole("button", { name: "Supprimer Alimentation" })
    );

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(deleteTagMock).toHaveBeenCalledWith("tag1"));
    await waitFor(() =>
      expect(screen.queryByText("Alimentation")).not.toBeInTheDocument()
    );
  });

  it("does not delete when the confirmation is dismissed", async () => {
    listTagsMock.mockResolvedValue([fakeTag()]);
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    render(<CategoryTagsPageContent />);

    await user.click(
      await screen.findByRole("button", { name: "Supprimer Alimentation" })
    );

    expect(deleteTagMock).not.toHaveBeenCalled();
    expect(screen.getByText("Alimentation")).toBeInTheDocument();
  });

  it("shows an error message when deletion fails", async () => {
    listTagsMock.mockResolvedValue([fakeTag()]);
    deleteTagMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<CategoryTagsPageContent />);

    await user.click(
      await screen.findByRole("button", { name: "Supprimer Alimentation" })
    );

    expect(
      await screen.findByText("Échec de la suppression du tag. Réessayez.")
    ).toBeInTheDocument();
  });
});
