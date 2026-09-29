import { fireEvent, render, screen } from "@testing-library/react";

import { CategoryFilterPills } from "./CategoryFilterPills";

describe("CategoryFilterPills", () => {
  it("always renders an 'Tous les produits' option that clears the selection", () => {
    const onSelect = jest.fn();
    render(
      <CategoryFilterPills categories={[]} selected="tag-mode" onSelect={onSelect} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Tous les produits" }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("selects by value, displays by label — the two can differ (BF-110)", () => {
    const onSelect = jest.fn();
    render(
      <CategoryFilterPills
        categories={[{ value: "tag-mode", label: "Mode" }]}
        selected={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mode" }));

    expect(onSelect).toHaveBeenCalledWith("tag-mode");
  });

  it("shows a color swatch when the option has one", () => {
    render(
      <CategoryFilterPills
        categories={[{ value: "tag-mode", label: "Mode", color: "#db2777" }]}
        selected={null}
        onSelect={jest.fn()}
      />
    );

    const swatch = screen.getByRole("button", { name: "Mode" }).querySelector("span");
    expect(swatch).toHaveStyle({ backgroundColor: "#db2777" });
  });

  it("renders no color swatch when the option has none", () => {
    render(
      <CategoryFilterPills
        categories={[{ value: "Mode", label: "Mode" }]}
        selected={null}
        onSelect={jest.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Mode" }).querySelector("span")
    ).not.toBeInTheDocument();
  });
});
