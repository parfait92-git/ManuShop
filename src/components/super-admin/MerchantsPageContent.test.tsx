import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom n'implémente pas PointerEvent, dont Base UI (Switch) a besoin pour
// son gestionnaire de clic — voir CategoryManager.test.tsx pour le détail.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId = 1;
    width = 1;
    height = 1;
    pressure = 0.5;
    tangentialPressure = 0;
    tiltX = 0;
    tiltY = 0;
    twist = 0;
    pointerType = "mouse";
    isPrimary = true;
    constructor(type: string, params: MouseEventInit = {}) {
      super(type, params);
    }
  }
  // @ts-expect-error -- polyfill réservé à l'environnement de test
  window.PointerEvent = PointerEventPolyfill;
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
}));

const listMerchantsMock = jest.fn();
const setShopPremiumFeatureMock = jest.fn();
jest.mock("../../services/PlatformAdminService", () => ({
  platformAdminService: {
    listMerchants: (...args: unknown[]) => listMerchantsMock(...args),
    setShopPremiumFeature: (...args: unknown[]) =>
      setShopPremiumFeatureMock(...args),
  },
}));

import { MerchantsPageContent } from "@/components/super-admin/MerchantsPageContent";
import type { MerchantDto } from "@/server/actions/platformAdminActions";

function fakeMerchant(overrides: Partial<MerchantDto> = {}): MerchantDto {
  return {
    ownerId: "u1",
    displayName: "Ada Diallo",
    email: "ada@example.com",
    shops: [
      {
        id: "shop1",
        name: "Boutique Ada",
        isPublished: true,
        premiumFeatures: [],
      },
    ],
    ...overrides,
  };
}

describe("MerchantsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state, then the list of merchants", async () => {
    listMerchantsMock.mockResolvedValue([fakeMerchant()]);
    render(<MerchantsPageContent />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();

    expect(await screen.findByText("Ada Diallo")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("shows an empty state when there are no merchants", async () => {
    listMerchantsMock.mockResolvedValue([]);
    render(<MerchantsPageContent />);

    expect(
      await screen.findByText("Aucun commerçant pour le moment.")
    ).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    listMerchantsMock.mockRejectedValue(new Error("boom"));
    render(<MerchantsPageContent />);

    expect(
      await screen.findByText("Échec du chargement des commerçants. Réessayez.")
    ).toBeInTheDocument();
  });

  it("expands a merchant row to reveal per-shop premium feature toggles", async () => {
    listMerchantsMock.mockResolvedValue([fakeMerchant()]);
    const user = userEvent.setup();
    render(<MerchantsPageContent />);

    const row = await screen.findByText("Ada Diallo");
    await user.click(row);

    expect(screen.getByText("Boutique Ada")).toBeInTheDocument();
    expect(screen.getByText("Publiée")).toBeInTheDocument();
  });

  it("toggles a premium feature optimistically and persists it", async () => {
    listMerchantsMock.mockResolvedValue([fakeMerchant()]);
    setShopPremiumFeatureMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MerchantsPageContent />);

    await user.click(await screen.findByText("Ada Diallo"));
    const toggle = screen.getByRole("switch", {
      name: /Activer.*Statistiques de consultation.*Boutique Ada/,
    });

    await user.click(toggle);

    await waitFor(() =>
      expect(setShopPremiumFeatureMock).toHaveBeenCalledWith(
        "shop1",
        "visitStats",
        true
      )
    );
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("reverts the optimistic toggle and shows a toast on failure", async () => {
    listMerchantsMock.mockResolvedValue([fakeMerchant()]);
    setShopPremiumFeatureMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<MerchantsPageContent />);

    await user.click(await screen.findByText("Ada Diallo"));
    const toggle = screen.getByRole("switch", {
      name: /Activer.*Statistiques de consultation.*Boutique Ada/,
    });

    await user.click(toggle);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
