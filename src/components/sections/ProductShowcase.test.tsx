import { render, screen } from "@testing-library/react";

import { ProductShowcase } from "./ProductShowcase";

describe("ProductShowcase", () => {
  it("renders products and hides optional labels when omitted", () => {
    render(
      <ProductShowcase
        title="Vendez plus simplement."
        products={[
          {
            category: "Mode",
            name: "Ensemble Wax Moderne",
            priceLabel: "24 800 FCFA",
            gradient: "linear-gradient(#000, #fff)",
          },
        ]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Vendez plus simplement." })
    ).toBeInTheDocument();
    expect(screen.getByText("Ensemble Wax Moderne")).toBeInTheDocument();
    expect(screen.queryByText("La sélection du moment")).not.toBeInTheDocument();
  });
});
