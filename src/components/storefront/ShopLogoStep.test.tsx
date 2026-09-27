jest.mock("../dashboard/ImageCropDialog", () => ({
  ImageCropDialog: () => <div data-testid="image-crop-dialog" />,
}));

// `@/lib/upload` importe `@/lib/firebase` (SDK Firebase réel), inutile ici.
jest.mock("../../lib/upload", () => ({ uploadShopLogo: jest.fn() }));

import { fireEvent, render, screen } from "@testing-library/react";

import { ShopLogoStep } from "./ShopLogoStep";

describe("ShopLogoStep", () => {
  it("triggers the hidden file input via an explicit click rather than relying on a <label> (BF-79, gallery picker inside a Dialog)", () => {
    render(
      <ShopLogoStep
        mode="gallery"
        onModeChange={jest.fn()}
        logoUrl={undefined}
        onLogoChange={jest.fn()}
      />
    );

    const clickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
    fireEvent.click(screen.getByRole("button", { name: "Déposez votre logo ici" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("switches between gallery and link modes", () => {
    const onModeChange = jest.fn();
    render(
      <ShopLogoStep
        mode="gallery"
        onModeChange={onModeChange}
        logoUrl={undefined}
        onLogoChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Lien" }));
    expect(onModeChange).toHaveBeenCalledWith("link");
  });

  it("lets the logo be set as a plain URL in link mode", () => {
    const onLogoChange = jest.fn();
    render(
      <ShopLogoStep
        mode="link"
        onModeChange={jest.fn()}
        logoUrl={undefined}
        onLogoChange={onLogoChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Lien du logo"), {
      target: { value: "https://exemple.com/logo.png" },
    });
    expect(onLogoChange).toHaveBeenCalledWith("https://exemple.com/logo.png");
  });

  it("shows the current logo preview when one is already set", () => {
    const { container } = render(
      <ShopLogoStep
        mode="gallery"
        onModeChange={jest.fn()}
        logoUrl="https://res.cloudinary.com/logo.png"
        onLogoChange={jest.fn()}
      />
    );

    // `next/image` rend un `alt=""` (décoratif) — exclu du rôle "img" par
    // l'arbre d'accessibilité, d'où une recherche directe par balise ici.
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});
