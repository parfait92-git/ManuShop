import { render, screen } from "@testing-library/react";

import { LaunchPromo } from "./LaunchPromo";

describe("LaunchPromo", () => {
  it("renders the offer copy and countdown units", () => {
    render(
      <LaunchPromo
        eyebrow="Promotion de lancement"
        title="Votre première vitrine digitale commence ici."
        description="Offre spéciale."
        targetDate="2026-09-16T06:00:00+01:00"
      />
    );

    expect(screen.getByText("Promotion de lancement")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Votre première vitrine digitale commence ici.",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Jours")).toBeInTheDocument();
    expect(screen.getByText("Heures")).toBeInTheDocument();
  });

  it("renders without an eyebrow", () => {
    render(
      <LaunchPromo
        title="Offre"
        description="Détail."
        targetDate="2020-01-01T00:00:00Z"
      />
    );

    expect(screen.getByRole("heading", { name: "Offre" })).toBeInTheDocument();
    expect(screen.queryByText("Promotion de lancement")).not.toBeInTheDocument();
  });
});
