const useShopThemeMock = jest.fn();
jest.mock("../../../hooks/useShopTheme", () => ({
  useShopTheme: (...args: unknown[]) => useShopThemeMock(...args),
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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemesPageContent } from "./ThemesPageContent";
import { THEMES } from "@/themes/registry";

describe("ThemesPageContent", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists the default theme, checked as applied", () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false });
    render(<ThemesPageContent shopId="shop-1" />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "ManuShop Nuit" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Appliqué")).toBeInTheDocument();
    expect(useShopThemeMock).toHaveBeenCalledWith("shop-1");
  });

  it("previews the dashboard in the theme, and doesn't re-apply the current one", async () => {
    useShopThemeMock.mockReturnValue({ theme: THEMES[0], loading: false });
    const user = userEvent.setup();
    render(<ThemesPageContent shopId="shop-1" />);

    await user.click(screen.getByRole("button", { name: "Voir l'aperçu" }));
    expect(screen.getByTestId("preview")).toHaveTextContent("aperçu default");
    expect(screen.getByRole("button", { name: "Thème actuel" })).toBeDisabled();
  });

  it("applies another theme from its preview", async () => {
    // Un autre thème appliqué : le thème par défaut redevient proposable.
    useShopThemeMock.mockReturnValue({ theme: { ...THEMES[0], id: "autre" }, loading: false });
    applyThemeMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ThemesPageContent shopId="shop-1" />);

    expect(screen.getByRole("radio", { name: "ManuShop Nuit" })).toHaveAttribute("aria-checked", "false");
    await user.click(screen.getByRole("button", { name: "Aperçu et appliquer" }));
    await user.click(screen.getByRole("button", { name: "Appliquer ce thème" }));

    expect(applyThemeMock).toHaveBeenCalledWith("default");
    expect(toastSuccess).toHaveBeenCalledWith("Thème « ManuShop Nuit » appliqué à votre boutique.");
  });
});
