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

jest.mock("../../lib/firebase", () => ({ db: {} }));

jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({
    profile: { id: "uid-1", displayName: "Awa Diallo", role: "admin" },
  }),
}));

import { shopService } from "@/services/ShopService";
import { activityLogService } from "@/services/ActivityLogService";
import { ShopSettingsForm } from "@/components/dashboard/ShopSettingsForm";
import type { Shop } from "@/models/shop/Shop";

jest.mock("../../services/ShopService", () => ({
  shopService: {
    getShop: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock("../../services/ActivityLogService", () => ({
  activityLogService: {
    logShopSettingsUpdated: jest.fn(),
  },
}));

const mockedShopService = jest.mocked(shopService);

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Awa Boutique",
    logo: "",
    address: "Dakar",
    phone: "+221700000000",
    whatsapp: "+221700000000",
    currency: "XAF",
    ownerId: "uid-1",
    createdAt: {} as never,
    ...overrides,
  };
}

describe("ShopSettingsForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fills sensible defaults for a shop with no advanced settings saved yet", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop());
    render(<ShopSettingsForm shopId="shop-1" />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Nom de la boutique") as HTMLInputElement).value
      ).toBe("Awa Boutique")
    );

    expect(
      (screen.getByLabelText(/Langue de la boutique/) as HTMLSelectElement)
        .value
    ).toBe("fr");
    expect(
      (screen.getByLabelText(/Devise/) as HTMLSelectElement).value
    ).toBe("XAF");
    expect(
      screen.getByLabelText("Recevoir les commandes par e-mail")
    ).toHaveAttribute("data-checked");
  });

  it("submits the updated settings, including a toggled notification preference", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop());
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Nom de la boutique") as HTMLInputElement).value
      ).toBe("Awa Boutique")
    );

    await user.click(
      screen.getByLabelText("Recevoir les commandes par e-mail")
    );
    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    await waitFor(() =>
      expect(shopService.updateProfile).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({ notifyOrdersByEmail: false })
      )
    );
    expect(
      await screen.findByText("Paramètres enregistrés.")
    ).toBeInTheDocument();
    expect(activityLogService.logShopSettingsUpdated).toHaveBeenCalledWith({
      shopId: "shop-1",
      actorId: "uid-1",
      actorName: "Awa Diallo",
    });
  });

  it("shows the shop as unpublished by default and lets the merchant publish it (BF-88)", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop({ isPublished: false }));
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    await waitFor(() =>
      expect(screen.getByText("Boutique non publiée")).toBeInTheDocument()
    );

    await user.click(screen.getByLabelText("Publier la boutique"));
    expect(screen.getByText("Boutique publiée")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    await waitFor(() =>
      expect(shopService.updateProfile).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({ isPublished: true })
      )
    );
  });
});
