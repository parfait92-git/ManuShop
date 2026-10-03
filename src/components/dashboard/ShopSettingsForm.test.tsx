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

jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({
    profile: { id: "uid-1", displayName: "Awa Diallo", role: "admin" },
  }),
}));

// ShopLogoStep (réutilisé ici pour modifier le logo, voir 04-besoins-
// techniques.md) importe ImageCropDialog/uploadShopLogo — inutiles pour ces
// tests, qui ne déclenchent jamais un vrai envoi de fichier.
jest.mock("./ImageCropDialog", () => ({
  ImageCropDialog: () => null,
}));
jest.mock("../../lib/upload", () => ({ uploadShopLogo: jest.fn() }));

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
      (screen.getByLabelText(/^Langue de la boutique/) as HTMLSelectElement)
        .value
    ).toBe("fr");
    expect(
      (screen.getByLabelText(/^Devise/) as HTMLSelectElement).value
    ).toBe("XAF");
    expect(
      screen.getByLabelText("Recevoir les commandes par e-mail")
    ).toHaveAttribute("data-checked");
    expect(
      screen.getByLabelText("Son à la réception d'une nouvelle commande")
    ).toHaveAttribute("data-checked");
  });

  // BF-133 : sons de notification dans le dashboard, chacun désactivable
  // indépendamment (demande explicite de l'utilisateur, 2026-09-28).
  it("saves a disabled notification sound preference", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop());
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    await waitFor(() =>
      expect(
        screen.getByLabelText("Son à la réception d'une nouvelle commande")
      ).toHaveAttribute("data-checked")
    );

    await user.click(
      screen.getByLabelText("Son à la réception d'une nouvelle commande")
    );
    await user.click(
      screen.getByLabelText("Son au changement de statut d'une commande")
    );
    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    await waitFor(() =>
      expect(shopService.updateProfile).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({
          soundOnNewOrder: false,
          soundOnOrderStatusChange: false,
          soundOnNewMessage: true,
        })
      )
    );
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

  it("still confirms the save when logging the activity fails — the main write already succeeded", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop());
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    jest
      .mocked(activityLogService.logShopSettingsUpdated)
      .mockRejectedValueOnce(new Error("Missing or insufficient permissions."));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Nom de la boutique") as HTMLInputElement).value
      ).toBe("Awa Boutique")
    );
    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    expect(
      await screen.findByText("Paramètres enregistrés.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Échec de l'enregistrement/)
    ).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("shows an error message when saving the shop itself fails", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop());
    mockedShopService.updateProfile.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Nom de la boutique") as HTMLInputElement).value
      ).toBe("Awa Boutique")
    );
    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    expect(
      await screen.findByText("Échec de l'enregistrement des paramètres. Réessayez.")
    ).toBeInTheDocument();
    expect(activityLogService.logShopSettingsUpdated).not.toHaveBeenCalled();
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

  it("pre-fills the description and saves changes to it", async () => {
    mockedShopService.getShop.mockResolvedValue(
      fakeShop({ description: "Mode et accessoires artisanaux." })
    );
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    const descriptionField = await screen.findByLabelText("Description");
    expect(descriptionField).toHaveValue("Mode et accessoires artisanaux.");

    await user.type(descriptionField, " Livraison rapide.");
    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    await waitFor(() =>
      expect(shopService.updateProfile).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({
          description: "Mode et accessoires artisanaux. Livraison rapide.",
        })
      )
    );
  });

  // Facturation (2026-10-03) : couleur, TVA, NIU et RCCM.
  it("defaults to the blue colour and no VAT, then saves the invoice settings", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop());
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    expect(await screen.findByRole("radio", { name: "Bleu" })).toHaveAttribute("aria-checked", "true");
    const vat = screen.getByRole("spinbutton", { name: /Taux de TVA/ });
    expect(vat).toHaveValue(0);

    await user.click(screen.getByRole("radio", { name: "Vert" }));
    await user.clear(vat);
    await user.type(vat, "19.25");
    await user.type(screen.getByRole("textbox", { name: /NIU/ }), "M0123");
    await user.type(screen.getByRole("textbox", { name: /RCCM/ }), "RC/DLA/2024");
    await user.click(screen.getByRole("button", { name: /Enregistrer les paramètres/ }));

    await waitFor(() =>
      expect(shopService.updateProfile).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({
          themeColor: "#047857",
          vatRate: 19.25,
          taxId: "M0123",
          tradeRegister: "RC/DLA/2024",
        })
      )
    );
  });

  it("refuses a VAT rate above 100 %", async () => {
    mockedShopService.getShop.mockResolvedValue(fakeShop({ vatRate: 19.25 }));
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    const vat = await screen.findByRole("spinbutton", { name: /Taux de TVA/ });
    expect(vat).toHaveValue(19.25);
    await user.clear(vat);
    await user.type(vat, "120");
    await user.click(screen.getByRole("button", { name: /Enregistrer les paramètres/ }));

    expect(await screen.findByText("Le taux ne peut pas dépasser 100 %.")).toBeInTheDocument();
    expect(shopService.updateProfile).not.toHaveBeenCalled();
  });

  it("rebinds the social network link field to the chosen primary network (BF-128)", async () => {
    mockedShopService.getShop.mockResolvedValue(
      fakeShop({
        primarySocialNetwork: "whatsapp",
        instagramUrl: "https://instagram.com/awaboutique",
      })
    );
    mockedShopService.updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShopSettingsForm shopId="shop-1" />);

    await screen.findByLabelText(/^Lien de votre page WhatsApp/);

    await user.selectOptions(
      screen.getByLabelText("Réseau social principal"),
      "instagram"
    );

    const linkField = await screen.findByLabelText(/^Lien de votre page Instagram/);
    expect(linkField).toHaveValue("https://instagram.com/awaboutique");

    await user.click(
      screen.getByRole("button", { name: /Enregistrer les paramètres/ })
    );

    await waitFor(() =>
      expect(shopService.updateProfile).toHaveBeenCalledWith(
        "shop-1",
        expect.objectContaining({
          primarySocialNetwork: "instagram",
          instagramUrl: "https://instagram.com/awaboutique",
        })
      )
    );
  });

  describe("Moyens de contact client (BF-105)", () => {
    it("shows a locked message when the shop doesn't have the advancedContact privilege", async () => {
      mockedShopService.getShop.mockResolvedValue(fakeShop());
      render(<ShopSettingsForm shopId="shop-1" />);

      expect(
        await screen.findByText(
          "Réservé aux boutiques disposant du privilège premium correspondant."
        )
      ).toBeInTheDocument();
    });

    it("disables a channel's switch until its underlying value is set", async () => {
      mockedShopService.getShop.mockResolvedValue(
        fakeShop({ premiumFeatures: ["advancedContact"], whatsapp: "" })
      );
      render(<ShopSettingsForm shopId="shop-1" />);

      const whatsappSwitch = await screen.findByLabelText(
        "Activer le contact par WhatsApp"
      );
      expect(whatsappSwitch).toHaveAttribute("aria-disabled", "true");
    });

    it("enables a channel once its value is set, and saves the choice", async () => {
      mockedShopService.getShop.mockResolvedValue(
        fakeShop({
          premiumFeatures: ["advancedContact"],
          whatsapp: "+221700000000",
        })
      );
      mockedShopService.updateProfile.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<ShopSettingsForm shopId="shop-1" />);

      const whatsappSwitch = await screen.findByLabelText(
        "Activer le contact par WhatsApp"
      );
      expect(whatsappSwitch).not.toHaveAttribute("aria-disabled", "true");

      await user.click(whatsappSwitch);
      await user.click(
        screen.getByRole("button", { name: /Enregistrer les paramètres/ })
      );

      await waitFor(() =>
        expect(shopService.updateProfile).toHaveBeenCalledWith(
          "shop-1",
          expect.objectContaining({ clientContactMethods: ["whatsapp"] })
        )
      );
    });

    it("saves the public contact e-mail", async () => {
      mockedShopService.getShop.mockResolvedValue(
        fakeShop({ premiumFeatures: ["advancedContact"] })
      );
      mockedShopService.updateProfile.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<ShopSettingsForm shopId="shop-1" />);

      await user.type(
        await screen.findByLabelText("E-mail affiché aux clients"),
        "contact@awaboutique.com"
      );
      await user.click(
        screen.getByRole("button", { name: /Enregistrer les paramètres/ })
      );

      await waitFor(() =>
        expect(shopService.updateProfile).toHaveBeenCalledWith(
          "shop-1",
          expect.objectContaining({
            publicContactEmail: "contact@awaboutique.com",
          })
        )
      );
    });
  });

  describe("logo de la boutique (galerie ou lien)", () => {
    it("opens in gallery mode by default, previewing the current logo", async () => {
      mockedShopService.getShop.mockResolvedValue(
        fakeShop({ logo: "https://example.com/logo.png" })
      );
      render(<ShopSettingsForm shopId="shop-1" />);

      await screen.findByRole("button", { name: "Galerie" });
      expect(screen.getByRole("button", { name: "Galerie" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("switches to link mode and sets the logo as a URL", async () => {
      mockedShopService.getShop.mockResolvedValue(fakeShop({ logo: "" }));
      mockedShopService.updateProfile.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<ShopSettingsForm shopId="shop-1" />);

      await user.click(await screen.findByRole("button", { name: "Lien" }));
      await user.type(
        screen.getByLabelText("Lien du logo"),
        "https://example.com/nouveau-logo.png"
      );
      await user.click(
        screen.getByRole("button", { name: /Enregistrer les paramètres/ })
      );

      await waitFor(() =>
        expect(shopService.updateProfile).toHaveBeenCalledWith(
          "shop-1",
          expect.objectContaining({
            logo: "https://example.com/nouveau-logo.png",
          })
        )
      );
      // `logoMode` reste purement local à ce formulaire, jamais envoyé.
      const [, payload] = mockedShopService.updateProfile.mock.calls[0];
      expect(payload).not.toHaveProperty("logoMode");
    }, 15000); // saisie caractère par caractère dans un grand formulaire : lent sous la suite complète en parallèle
  });
});
