import { render, screen } from "@testing-library/react";
import type { LucideIcon } from "lucide-react";

import Home from "./page";
import { HeroSection } from "@/components/sections/HeroSection";
import { Badge } from "@/components/ui/Badge";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { GlassButton } from "@/components/ui/GlassButton";

const TestIcon: LucideIcon = (props) => <svg data-testid="test-icon" {...props} />;

describe("Home page", () => {
  it("renders without crashing", () => {
    render(<Home />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders hero section without optional eyebrow and ctas", () => {
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
    expect(screen.getByRole("link", { name: "Découvrir" })).toHaveAttribute("href", "#");
  });
});
