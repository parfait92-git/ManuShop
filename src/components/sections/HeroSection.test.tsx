import { render, screen } from "@testing-library/react";

import { HeroSection } from "@/components/sections/HeroSection";

describe("HeroSection", () => {
  it("renders an href-based CTA as a link", () => {
    render(
      <HeroSection
        heading="Titre"
        description="Description"
        ctas={[{ label: "Découvrir", href: "/catalogue", variant: "solid" }]}
      />
    );

    expect(screen.getByRole("link", { name: "Découvrir" })).toHaveAttribute(
      "href",
      "/catalogue"
    );
  });

  it("renders a custom CTA node as-is instead of a link", () => {
    render(
      <HeroSection
        heading="Titre"
        description="Description"
        ctas={[
          { label: "Découvrir", href: "/catalogue" },
          { render: <button type="button">Nous contacter</button> },
        ]}
      />
    );

    expect(
      screen.getByRole("button", { name: "Nous contacter" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nous contacter" })).not.toBeInTheDocument();
  });
});
