import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LucideIcon } from "lucide-react";

import Home from "./page";
import { HeroSection } from "@/components/sections/HeroSection";
import { Badge } from "@/components/ui/Badge";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { GlassButton } from "@/components/ui/GlassButton";

const TestIcon = React.forwardRef(function TestIconComponent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any
) {
  return <svg data-testid="test-icon" {...props} ref={ref} />;
}) as unknown as LucideIcon;

TestIcon.displayName = "TestIcon";

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe("Home page", () => {
  it("renders the landing layout from the mockup", () => {
    render(<Home />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Votre boutique, sans limites/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir la boutique" })).toHaveAttribute(
      "href",
      "#boutique"
    );
    expect(screen.getByText("Ensemble Wax Moderne")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Votre première vitrine digitale commence ici.",
      })
    ).toBeInTheDocument();
  });

  it("opens and closes the mobile navigation", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    expect(screen.getByLabelText("Navigation mobile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("navigation", { name: "Navigation mobile" }).querySelector(
        'a[href="#boutique"]'
      ) as HTMLAnchorElement
    );

    expect(screen.queryByLabelText("Navigation mobile")).not.toBeInTheDocument();
  });

  it("scrolls to the boutique from the header search", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("Rechercher un produit"), "wax");
    await user.keyboard("{Enter}");

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("renders hero section without optional eyebrow, watermark and ctas", () => {
    render(
      <HeroSection
        title="ManuShop"
        description="Digitalisez votre boutique."
      />
    );

    const heading = screen.getByRole("heading", { name: "ManuShop" });
    const section = heading.closest("section");

    expect(heading).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(section?.querySelector('[class*="hero__actions"]')).toBeNull();
    expect(section?.querySelector('[class*="hero__watermark"]')).toBeNull();
  });

  it("renders optional component branches", () => {
    render(
      <>
        <Badge icon={<span data-testid="badge-icon" />}>Nouveau</Badge>
        <FeatureCard
          icon={TestIcon}
          title="Catalogue"
          description="Description"
        />
        <GlassButton>Découvrir</GlassButton>
      </>
    );

    expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir" })).toHaveAttribute(
      "href",
      "#"
    );
  });
});
