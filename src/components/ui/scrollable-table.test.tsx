import { act, fireEvent, render, screen } from "@testing-library/react";

import { ScrollableTable } from "./scrollable-table";

/** jsdom ne calcule aucune mise en page : on fixe les dimensions à la main. */
function setScrollGeometry(
  element: HTMLElement,
  { scrollWidth, clientWidth, scrollLeft = 0 }: { scrollWidth: number; clientWidth: number; scrollLeft?: number }
) {
  Object.defineProperty(element, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(element, "clientWidth", { configurable: true, value: clientWidth });
  element.scrollLeft = scrollLeft;
}

function renderTable() {
  render(
    <ScrollableTable label="Liste des produits">
      <table>
        <tbody>
          <tr>
            <td>Savon</td>
          </tr>
        </tbody>
      </table>
    </ScrollableTable>
  );
  return screen.getByRole("region", { name: "Liste des produits" });
}

describe("ScrollableTable", () => {
  it("exposes a named region, without hint nor tab stop when everything fits", async () => {
    const region = renderTable();
    setScrollGeometry(region, { scrollWidth: 600, clientWidth: 600 });
    await act(async () => {
      fireEvent.scroll(region);
    });

    expect(region).not.toHaveAttribute("tabindex");
    expect(screen.queryByText(/Faites glisser le tableau/)).not.toBeInTheDocument();
  });

  it("becomes keyboard-reachable and explains how to scroll when columns overflow", async () => {
    const region = renderTable();
    setScrollGeometry(region, { scrollWidth: 640, clientWidth: 320 });
    await act(async () => {
      fireEvent.scroll(region);
    });

    expect(region).toHaveAttribute("tabindex", "0");
    expect(screen.getByText(/Faites glisser le tableau/)).toBeInTheDocument();
    expect(region).not.toHaveAttribute("data-scrolled");
  });

  it("keeps the hint once scrolled to the end (no layout shift mid-gesture) and flags the scrolled state for the sticky column shadow", async () => {
    const region = renderTable();
    setScrollGeometry(region, { scrollWidth: 640, clientWidth: 320, scrollLeft: 320 });
    await act(async () => {
      fireEvent.scroll(region);
    });

    expect(screen.getByText(/Faites glisser le tableau/)).toBeInTheDocument();
    expect(region).toHaveAttribute("data-scrolled");
  });
});
