import { render, screen } from "@testing-library/react";

import { ShopSummaryCard } from "./ShopSummaryCard";
import type { Shop } from "@/models/shop/Shop";

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Boutique Test",
    logo: "",
    address: "Douala",
    phone: "",
    whatsapp: "",
    currency: "XAF",
    ownerId: "u1",
    createdAt: { toDate: () => new Date("2020-01-01") } as never,
    ...overrides,
  };
}

describe("ShopSummaryCard", () => {
  it("links to the shop's dedicated page", () => {
    render(<ShopSummaryCard shop={fakeShop()} />);

    expect(screen.getByRole("link", { name: /Boutique Test/ })).toHaveAttribute(
      "href",
      "/boutique/shop-1"
    );
  });

  it("shows a fallback icon (no <img>) when the shop has no logo yet", () => {
    render(<ShopSummaryCard shop={fakeShop({ logo: "" })} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the real logo when provided", () => {
    render(
      <ShopSummaryCard
        shop={fakeShop({ logo: "https://res.cloudinary.com/logo.png" })}
      />
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows sector and address when available", () => {
    render(<ShopSummaryCard shop={fakeShop({ sector: "Mode", address: "Douala" })} />);
    expect(screen.getByText("Mode · Douala")).toBeInTheDocument();
  });

  it("omits the sector/address line when both are absent", () => {
    render(<ShopSummaryCard shop={fakeShop({ sector: undefined, address: "" })} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("uses a custom href when provided (demo catalogue, BF-125)", () => {
    render(<ShopSummaryCard shop={fakeShop()} href="/demo-catalogue/boutique/shop-1" />);

    expect(screen.getByRole("link", { name: /Boutique Test/ })).toHaveAttribute(
      "href",
      "/demo-catalogue/boutique/shop-1"
    );
  });
});
