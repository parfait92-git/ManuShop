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

const isDemoCatalogueEnabledMock = jest.fn();
const setDemoCatalogueEnabledMock = jest.fn();
jest.mock("../../services/ConfigurationService", () => ({
  configurationService: {
    isDemoCatalogueEnabled: (...args: unknown[]) =>
      isDemoCatalogueEnabledMock(...args),
    setDemoCatalogueEnabled: (...args: unknown[]) =>
      setDemoCatalogueEnabledMock(...args),
  },
}));

import { PlatformSettingsPageContent } from "@/components/super-admin/PlatformSettingsPageContent";

describe("PlatformSettingsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state, then the toggle reflecting the current setting", async () => {
    isDemoCatalogueEnabledMock.mockResolvedValue(true);
    render(<PlatformSettingsPageContent />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();

    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("shows the toggle off when the demo is force-disabled", async () => {
    isDemoCatalogueEnabledMock.mockResolvedValue(false);
    render(<PlatformSettingsPageContent />);

    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("shows an error message when loading fails", async () => {
    isDemoCatalogueEnabledMock.mockRejectedValue(new Error("boom"));
    render(<PlatformSettingsPageContent />);

    expect(
      await screen.findByText("Échec du chargement des réglages. Réessayez.")
    ).toBeInTheDocument();
  });

  it("toggles the setting optimistically and persists it", async () => {
    isDemoCatalogueEnabledMock.mockResolvedValue(true);
    setDemoCatalogueEnabledMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PlatformSettingsPageContent />);

    const toggle = await screen.findByRole("switch");
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    await waitFor(() =>
      expect(setDemoCatalogueEnabledMock).toHaveBeenCalledWith(false)
    );
  });

  it("reverts the optimistic toggle and shows a toast on failure", async () => {
    isDemoCatalogueEnabledMock.mockResolvedValue(true);
    setDemoCatalogueEnabledMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<PlatformSettingsPageContent />);

    const toggle = await screen.findByRole("switch");
    await user.click(toggle);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
