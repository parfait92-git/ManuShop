jest.mock("../../onboarding/DialogTour", () => ({ DialogTour: () => null }));
if (!("PointerEvent" in window)) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class extends MouseEvent {};
}
const toastSuccess = jest.fn();
jest.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: jest.fn() } }));

const HOUR = 3_600_000;
const ts = (offsetHours: number) => {
  const ms = Date.now() + offsetHours * HOUR;
  return { toMillis: () => ms, toDate: () => new Date(ms) };
};
let mockPromotions: unknown[] = [];
const saveMock = jest.fn(async () => "new");
const endMock = jest.fn(async () => undefined);
jest.mock("../../../services/PromotionService", () => ({
  promotionService: {
    watchByShop: (_: string, onChange: (p: unknown[]) => void) => {
      onChange(mockPromotions);
      return () => {};
    },
    save: (...a: unknown[]) => saveMock(...(a as [])),
    end: (...a: unknown[]) => endMock(...(a as [])),
    remove: jest.fn(),
  },
}));
jest.mock("../../../services/CategoryService", () => ({
  categoryService: { listVisible: async () => [{ id: "c1", name: "Savons" }] },
}));
jest.mock("../../../services/ProductService", () => ({
  productService: { listActive: async () => [{ id: "p1", name: "Savon noir", category: "Savons", price: 1500 }] },
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PromotionsPageContent } from "./PromotionsPageContent";

beforeEach(() => {
  jest.clearAllMocks();
  mockPromotions = [
    { id: "a", title: "Rentrée", kind: "percent", value: 20, target: { type: "shop" }, flash: false, startsAt: ts(-2), endsAt: ts(24) },
    { id: "b", title: "Week-end flash", kind: "amount", value: 500, target: { type: "categories", categories: ["Savons"] }, flash: true, startsAt: ts(48), endsAt: ts(72) },
    { id: "c", title: "Fêtes", kind: "percent", value: 10, target: { type: "products", productIds: ["p1", "p2"] }, flash: false, startsAt: ts(-100), endsAt: ts(-50) },
  ];
});

describe("PromotionsPageContent", () => {
  it("sorts the campaigns into running, upcoming and finished", () => {
    render(<PromotionsPageContent shopId="s1" />);
    const live = screen.getByRole("region", { name: /En cours/ });
    expect(within(live).getByText("Rentrée")).toBeInTheDocument();
    expect(within(live).getByText("−20 % sur toute la boutique")).toBeInTheDocument();
    const upcoming = screen.getByRole("region", { name: /À venir/ });
    expect(within(upcoming).getByText("−500 FCFA sur Savons")).toBeInTheDocument();
    expect(within(upcoming).getByText("Flash")).toBeInTheDocument();
    const ended = screen.getByRole("region", { name: /Terminées/ });
    expect(within(ended).getByText("−10 % sur 2 articles")).toBeInTheDocument();
    expect(within(ended).queryByRole("button")).not.toBeInTheDocument();
  });

  it("creates a campaign, previewing the new price on an item", async () => {
    const user = userEvent.setup();
    render(<PromotionsPageContent shopId="s1" />);
    await user.click(screen.getByRole("button", { name: /Nouvelle promotion/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: /Nom de la promotion/ }), "Soldes");
    await user.type(within(dialog).getByRole("textbox", { name: /Réduction \(%\)/ }), "25");
    await waitFor(() => expect(within(dialog).getByText(/Exemple/)).toHaveTextContent(/Savon noir passe de 1\s500 FCFA à 1\s125 FCFA/));
    await user.click(within(dialog).getByRole("button", { name: "Créer la promotion" }));

    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Soldes", kind: "percent", value: 25, target: { type: "shop" }, flash: false }));
    expect(toastSuccess).toHaveBeenCalledWith("Promotion créée.");
  });

  it("ends a running campaign after confirmation", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<PromotionsPageContent shopId="s1" />);
    await user.click(within(screen.getByRole("region", { name: /En cours/ })).getByRole("button", { name: "Terminer" }));
    expect(endMock).toHaveBeenCalledWith("a");
  });

  it("shortens the default week to 24 hours when the sale becomes a flash sale", async () => {
    const user = userEvent.setup();
    render(<PromotionsPageContent shopId="s1" />);
    await user.click(screen.getByRole("button", { name: /Nouvelle promotion/ }));
    const dialog = await screen.findByRole("dialog");
    const start = (within(dialog).getByLabelText("Début", { selector: "input" }) as HTMLInputElement).value;
    await user.click(within(dialog).getByRole("switch", { name: /Vente flash/ }));
    const end = (within(dialog).getByLabelText("Fin", { selector: "input" }) as HTMLInputElement).value;
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * HOUR);
  });
});
