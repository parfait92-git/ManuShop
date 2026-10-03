jest.mock("../../../hooks/usePremiumCatalog");
const useShopThemeMock = jest.fn();
jest.mock("../../../hooks/useShopTheme", () => ({
  useShopTheme: (...args: unknown[]) => useShopThemeMock(...args),
}));
const requestItemMock = jest.fn();
let pushRequests: (r: unknown[]) => void = () => {};
jest.mock("../../../services/PremiumService", () => ({
  premiumService: {
    requestItem: (...args: unknown[]) => requestItemMock(...args),
    watchShopRequests: (_shopId: string, cb: (r: unknown[]) => void) => {
      pushRequests = cb;
      return () => {};
    },
  },
}));
const applyThemeMock = jest.fn();
jest.mock("../../../services/ThemeService", () => ({
  themeService: { applyTheme: (...args: unknown[]) => applyThemeMock(...args) },
}));
jest.mock("./ThemePreviewFrame", () => ({
  ThemePreviewFrame: ({ dashboardTheme }: { dashboardTheme: string }) => (
    <div data-testid="preview">aperçu {dashboardTheme}</div>
  ),
}));
jest.mock("../../onboarding/DialogTour", () => ({ DialogTour: () => null }));
jest.mock("../../ui/CoachMark", () => ({ CoachMark: () => null }));
const toastSuccess = jest.fn();
jest.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: jest.fn() } }));

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemesPageContent } from "./ThemesPageContent";
import { THEMES } from "@/themes/registry";

describe("ThemesPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists every theme, the applied one checked", () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false, revokedTheme: null, premiumState: { premiumFeatures: [] } });
    render(<ThemesPageContent shopId="shop-1" />);

    expect(screen.getAllByRole("radio")).toHaveLength(THEMES.length);
    expect(screen.getByRole("radio", { name: "ManuShop Nuit" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Wax Soleil" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByText("Appliqué")).toHaveLength(1);
    expect(useShopThemeMock).toHaveBeenCalledWith("shop-1");
  });

  it("previews the dashboard in the theme, and doesn't re-apply the current one", async () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false, revokedTheme: null, premiumState: { premiumFeatures: [] } });
    const user = userEvent.setup();
    render(<ThemesPageContent shopId="shop-1" />);

    await user.click(screen.getByRole("button", { name: "Voir l'aperçu" }));
    expect(screen.getByTestId("preview")).toHaveTextContent("aperçu manushop");
    expect(screen.getByRole("button", { name: "Thème actuel" })).toBeDisabled();
  });

  it("applies another theme from its preview", async () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false, revokedTheme: null, premiumState: { premiumFeatures: [] } });
    applyThemeMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ThemesPageContent shopId="shop-1" />);

    const wax = screen.getByRole("radio", { name: "Wax Soleil" });
    await user.click(within(wax).getByRole("button", { name: "Aperçu et appliquer" }));
    expect(screen.getByTestId("preview")).toHaveTextContent("aperçu wax-soleil");
    await user.click(screen.getByRole("button", { name: "Appliquer ce thème" }));

    expect(applyThemeMock).toHaveBeenCalledWith("wax-soleil");
    expect(toastSuccess).toHaveBeenCalledWith("Thème « Wax Soleil » appliqué à votre boutique.");
  });

  // Thèmes premium (2026-10-03).
  it("marks the new theme premium and offers to buy it instead of applying it", async () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false, revokedTheme: null, premiumState: { premiumFeatures: [] } });
    const user = userEvent.setup();
    render(<ThemesPageContent shopId="shop-1" />);

    const ocean = screen.getByRole("radio", { name: "Néon Océan" });
    expect(within(ocean).getByText("Premium")).toBeInTheDocument();
    expect(within(screen.getByRole("radio", { name: "Wax Soleil" })).queryByText("Premium")).toBeNull();
    // Pas encore de prix fixé par le Super Admin : achat impossible.
    expect(within(ocean).getByRole("button", { name: "Bientôt disponible" })).toBeDisabled();

    await user.click(within(ocean).getByRole("button", { name: "Aperçu" }));
    expect(screen.queryByRole("button", { name: "Appliquer ce thème" })).toBeNull();
  });

  it("shows a pending purchase request", async () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false, revokedTheme: null, premiumState: { premiumFeatures: [] } });
    render(<ThemesPageContent shopId="shop-1" />);
    act(() => pushRequests([{ itemKey: "theme:ocean-neon", status: "pending" }]));

    const ocean = screen.getByRole("radio", { name: "Néon Océan" });
    expect(within(ocean).getByText("Demande d'achat en attente de validation")).toBeInTheDocument();
    expect(within(ocean).getByRole("button", { name: "Demande envoyée" })).toBeDisabled();
  });

  it("unlocks a premium theme the shop owns", () => {
    useShopThemeMock.mockReturnValue({
      theme: THEMES[0],
      loading: false,
      revokedTheme: null,
      premiumState: { premiumFeatures: ["theme:ocean-neon"] },
    });
    render(<ThemesPageContent shopId="shop-1" />);

    const ocean = screen.getByRole("radio", { name: "Néon Océan" });
    expect(within(ocean).getByText("Acquis")).toBeInTheDocument();
    expect(within(ocean).getByRole("button", { name: "Aperçu et appliquer" })).toBeInTheDocument();
  });

  it("explains when a premium theme was removed", () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false, revokedTheme: THEMES[2], premiumState: { premiumFeatures: [] } });
    render(<ThemesPageContent shopId="shop-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("n'a plus accès au thème premium « Néon Océan »");
  });
});
