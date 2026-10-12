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
let mockCodes: unknown[] = [];
const saveCodeMock = jest.fn(async () => "s1_NOEL");
const endCodeMock = jest.fn(async () => undefined);
jest.mock("../../../services/PromoCodeService", () => ({
  promoCodeService: {
    watchByShop: (_: string, onChange: (c: unknown[]) => void) => {
      onChange(mockCodes);
      return () => {};
    },
    save: (...a: unknown[]) => saveCodeMock(...(a as [])),
    end: (...a: unknown[]) => endCodeMock(...(a as [])),
    remove: jest.fn(),
  },
}));
// Bilan (BF-34) : deux commandes à la campagne « Rentrée », dont une avec
// le code NOEL ; une commande annulée, qui ne compte pas.
jest.mock("../../../services/OrderService", () => ({
  orderService: {
    listByShop: async () => [
      { status: "delivered", total: 4500, discount: 500, promoCodeId: "s1_NOEL", items: [{ quantity: 2, unitPrice: 2500, promotionId: "a", priceBeforeCampaign: 3000 }] },
      { status: "under_review", total: 2500, discount: 0, items: [{ quantity: 1, unitPrice: 2500, promotionId: "a", priceBeforeCampaign: 3000 }] },
      { status: "cancelled", total: 2500, discount: 0, items: [{ quantity: 1, unitPrice: 2500, promotionId: "a", priceBeforeCampaign: 3000 }] },
    ],
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

/** Paragraphe dont le texte entier (morceaux en gras compris) correspond. */
const paragraph = (pattern: RegExp) => (_: string, el: Element | null) => el?.tagName === "P" && pattern.test(el.textContent ?? "");

beforeEach(() => {
  jest.clearAllMocks();
  mockPromotions = [
    { id: "a", title: "Rentrée", kind: "percent", value: 20, target: { type: "shop" }, flash: false, startsAt: ts(-2), endsAt: ts(24) },
    { id: "b", title: "Week-end flash", kind: "amount", value: 500, target: { type: "categories", categories: ["Savons"] }, flash: true, startsAt: ts(48), endsAt: ts(72) },
    { id: "c", title: "Fêtes", kind: "percent", value: 10, target: { type: "products", productIds: ["p1", "p2"] }, flash: false, startsAt: ts(-100), endsAt: ts(-50) },
  ];
});

beforeEach(() => {
  mockCodes = [
    {
      id: "s1_NOEL",
      code: "NOEL",
      kind: "amount",
      value: 500,
      minSubtotal: 3000,
      maxUses: 50,
      perClient: 1,
      usedCount: 1,
      startsAt: ts(-2),
      endsAt: ts(24),
    },
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

  it("shows each campaign's impact, leaving out cancelled orders", async () => {
    render(<PromotionsPageContent shopId="s1" />);
    const live = screen.getByRole("region", { name: /En cours/ });
    expect(await within(live).findByText(paragraph(/2 commandes · 3 articles · 7\s500\sFCFA de ventes · 1\s500\sFCFA de réductions/))).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /Terminées/ })).getByText("Aucune commande pour l'instant.")).toBeInTheDocument();
  });

  it("lists the promo codes with their conditions and impact, and ends one already used", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<PromotionsPageContent shopId="s1" />);
    await user.click(screen.getByRole("tab", { name: "Codes promo" }));
    const codes = screen.getByRole("region", { name: "Codes promo" });
    expect(within(codes).getByText("NOEL")).toBeInTheDocument();
    expect(within(codes).getByText(/−500\sFCFA sur la commande/)).toBeInTheDocument();
    expect(within(codes).getByText(/dès 3\s000\sFCFA d'achats · 1\/50 utilisations · 1 par client/)).toBeInTheDocument();
    expect(await within(codes).findByText(paragraph(/^1 commande · 2 articles · 4\s500\sFCFA de ventes · 500\sFCFA de réductions/))).toBeInTheDocument();
    await user.click(within(codes).getByRole("button", { name: "Arrêter" }));
    expect(endCodeMock).toHaveBeenCalledWith("s1_NOEL");
  });

  it("creates a promo code, in capitals, once per client by default", async () => {
    const user = userEvent.setup();
    render(<PromotionsPageContent shopId="s1" />);
    await user.click(screen.getByRole("tab", { name: "Codes promo" }));
    await user.click(screen.getByRole("button", { name: /Nouveau code/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: /^Code/ }), "rentrée10");
    await user.type(within(dialog).getByRole("textbox", { name: /Réduction \(%\)/ }), "10");
    await user.type(within(dialog).getByRole("textbox", { name: /Achat minimum/ }), "20000");
    expect(within(dialog).getByText(/Exemple/)).toHaveTextContent(/20\s000 FCFA passe à 18\s000 FCFA/);
    await user.click(within(dialog).getByRole("button", { name: "Créer le code" }));

    await waitFor(() => expect(saveCodeMock).toHaveBeenCalled());
    expect(saveCodeMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "RENTREE10", kind: "percent", value: 10, minSubtotal: 20000, maxUses: null, perClient: 1 })
    );
    expect(toastSuccess).toHaveBeenCalledWith("Code créé.");
  });
});
