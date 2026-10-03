import { render, screen } from "@testing-library/react";

import { Label } from "./label";

describe("Label", () => {
  it("renders a plain label when no help is given", () => {
    render(
      <>
        <Label htmlFor="price">Prix (FCFA)</Label>
        <input id="price" />
      </>
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Prix (FCFA)")).toBeInTheDocument();
  });

  it("adds a help button named after the field, placed next to the label — never inside it (invalid HTML, and a click would also activate the field)", () => {
    const { container } = render(
      <>
        <Label htmlFor="price" help="Le prix de vente affiché à vos clients.">
          Prix <span>(FCFA)</span>
        </Label>
        <input id="price" />
      </>
    );

    const button = screen.getByRole("button", { name: "Aide : Prix (FCFA)" });
    expect(container.querySelector("label")).not.toContainElement(button);
    // Le champ reste trouvable par son libellé exact.
    expect(screen.getByLabelText("Prix (FCFA)")).toBe(container.querySelector("input"));
  });
});
