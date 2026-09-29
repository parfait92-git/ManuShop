import { render, screen } from "@testing-library/react";
import { Store } from "lucide-react";

import { AboutSection } from "./AboutSection";

// BF-131bis : "À propos" pointait par erreur vers le bloc "Offre de
// lancement" (LaunchPromo) — jamais de vrai contenu à propos de ManuShop.
describe("AboutSection", () => {
  it("renders the mission copy", () => {
    render(
      <AboutSection
        title="ManuShop, la boutique en ligne pensée pour les commerçants camerounais."
        description="Une description."
      />
    );

    expect(screen.getByText("À propos")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "ManuShop, la boutique en ligne pensée pour les commerçants camerounais.",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Une description.")).toBeInTheDocument();
  });

  it("renders the value highlights when provided", () => {
    render(
      <AboutSection
        title="Titre"
        description="Description."
        values={[{ icon: Store, text: "Chaque boutique reste indépendante." }]}
      />
    );

    expect(
      screen.getByText("Chaque boutique reste indépendante.")
    ).toBeInTheDocument();
  });

  it("renders without values", () => {
    render(<AboutSection title="Titre" description="Description." />);

    expect(screen.getByRole("heading", { name: "Titre" })).toBeInTheDocument();
  });

  it("forwards the id used by the header's anchor link", () => {
    render(
      <AboutSection id="apropos" title="Titre" description="Description." />
    );

    expect(document.getElementById("apropos")).toBeInTheDocument();
  });
});
