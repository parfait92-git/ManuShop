jest.mock("../../ui/CoachMark", () => ({ CoachMark: () => null }));

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GUIDES } from "@/content/guides";

import { UserGuidePageContent } from "./UserGuidePageContent";

// jsdom ne calcule aucune hauteur : chaque chapitre tient sur une page.
const totalFor = (index: number) => 2 + GUIDES[index].chapters.length;

describe("UserGuidePageContent", () => {
  it("opens the first guide on its cover, then lays it out with a table of contents", async () => {
    render(<UserGuidePageContent />);
    expect(await screen.findByLabelText("Numéro de page")).toHaveAttribute("max", String(totalFor(0)));
    expect(screen.getByRole("tab", { name: GUIDES[0].label })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText(GUIDES[0].title).length).toBeGreaterThan(0);
  });

  it("turns pages with the buttons and the keyboard, and jumps to a chapter from the table of contents", async () => {
    const user = userEvent.setup();
    render(<UserGuidePageContent />);
    const input = (await screen.findByLabelText("Numéro de page")) as HTMLInputElement;

    await user.click(screen.getByRole("button", { name: /Suivante/ }));
    expect(input.value).toBe("2");
    expect(screen.getAllByText("Sommaire").length).toBeGreaterThan(1);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(input.value).toBe("3");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(input.value).toBe("2");

    const toc = screen.getByRole("navigation", { name: "Sommaire du guide" });
    const last = GUIDES[0].chapters.length;
    await user.click(within(toc).getByRole("button", { name: new RegExp(`^${last}\\. `) }));
    expect(input.value).toBe(String(totalFor(0)));
    expect(screen.getByRole("button", { name: /Suivante/ })).toBeDisabled();
  });

  it("switches to another role's guide", async () => {
    const user = userEvent.setup();
    render(<UserGuidePageContent />);
    await screen.findByLabelText("Numéro de page");

    await user.click(screen.getByRole("tab", { name: GUIDES[2].label }));
    await waitFor(() => expect(screen.getByLabelText("Numéro de page")).toHaveAttribute("max", String(totalFor(2))));
    expect(screen.getAllByText(GUIDES[2].title).length).toBeGreaterThan(0);
  });

  it("prints every page of the guide for the PDF export, under a clear file name", async () => {
    const user = userEvent.setup();
    const print = jest.spyOn(window, "print").mockImplementation(() => {});
    render(<UserGuidePageContent />);
    await screen.findByLabelText("Numéro de page");

    await user.click(screen.getByRole("button", { name: "Exporter en PDF" }));

    await waitFor(() => expect(print).toHaveBeenCalled());
    expect(document.querySelectorAll(".guide-print-root .guide-a4")).toHaveLength(totalFor(0));
    expect(print).toHaveBeenCalled();
    expect(document.title).toBe(`ManuShop - ${GUIDES[0].title}`);

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(await screen.findByRole("button", { name: "Exporter en PDF" })).toBeEnabled();
    expect(document.querySelector(".guide-print-root")).toBeNull();
    print.mockRestore();
  });
});
