jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const listPublishedShopsMock = jest.fn();
jest.mock("../../services/ShopService", () => ({
  shopService: {
    listPublishedShops: (...args: unknown[]) => listPublishedShopsMock(...args),
  },
}));

import { render, screen } from "@testing-library/react";

import { AllShopsPageContent } from "./AllShopsPageContent";

describe("AllShopsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while shops resolve", () => {
    listPublishedShopsMock.mockReturnValue(new Promise(() => {}));
    render(<AllShopsPageContent />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows an honest empty state when no shop is published", async () => {
    listPublishedShopsMock.mockResolvedValue([]);
    render(<AllShopsPageContent />);
    expect(
      await screen.findByText("Aucune boutique disponible pour le moment.")
    ).toBeInTheDocument();
  });

  it("lists every published shop, each linking to its own page", async () => {
    listPublishedShopsMock.mockResolvedValue([
      { id: "shop-1", name: "Boutique A", logo: "" },
      { id: "shop-2", name: "Boutique B", logo: "" },
    ]);
    render(<AllShopsPageContent />);

    expect(await screen.findByText("2 boutiques sur ManuShop")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Boutique A/ })).toHaveAttribute(
      "href",
      "/boutique/shop-1"
    );
    expect(screen.getByRole("link", { name: /Boutique B/ })).toHaveAttribute(
      "href",
      "/boutique/shop-2"
    );
  });

  it("falls back to the empty state rather than hanging when the read fails", async () => {
    listPublishedShopsMock.mockRejectedValue(new Error("network"));
    render(<AllShopsPageContent />);

    expect(
      await screen.findByText("Aucune boutique disponible pour le moment.")
    ).toBeInTheDocument();
  });
});
