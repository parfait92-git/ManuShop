jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const getLaunchPromoMock = jest.fn();
const setLaunchPromoMock = jest.fn();
jest.mock("../../services/ConfigurationService", () => ({
  configurationService: {
    getLaunchPromo: (...args: unknown[]) => getLaunchPromoMock(...args),
    setLaunchPromo: (...args: unknown[]) => setLaunchPromoMock(...args),
  },
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LaunchPromoSettingsCard } from "./LaunchPromoSettingsCard";

const saved = {
  enabled: true,
  eyebrow: "Promotion de lancement",
  title: "Votre première vitrine digitale commence ici.",
  description: "Profitez de l'offre spéciale réservée aux commerçants.",
  endsAt: "2099-10-30T23:59:59+01:00",
};

describe("LaunchPromoSettingsCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLaunchPromoMock.mockResolvedValue(saved);
    setLaunchPromoMock.mockResolvedValue(undefined);
  });

  it("loads the current promotion, shows the end date in the device time zone, and saves edits", async () => {
    const user = userEvent.setup();
    render(<LaunchPromoSettingsCard />);

    const title = await screen.findByLabelText("Titre");
    expect((screen.getByLabelText("Fin de l'offre (votre heure locale)") as HTMLInputElement).value).toBe(
      "2099-10-30T23:59"
    );
    expect(screen.getByRole("status")).toHaveTextContent("En cours jusqu'au");

    await user.clear(title);
    await user.type(title, "Ouvrez votre boutique à moitié prix");
    await user.click(screen.getByRole("button", { name: "Enregistrer la promotion" }));

    await waitFor(() =>
      expect(setLaunchPromoMock).toHaveBeenCalledWith({
        ...saved,
        // Même instant, réécrit en UTC depuis l'heure de l'appareil.
        endsAt: "2099-10-30T22:59:59.000Z",
        title: "Ouvrez votre boutique à moitié prix",
      })
    );
  });

  it("refuses a past end date while the offer is enabled, and tells why", async () => {
    const user = userEvent.setup();
    render(<LaunchPromoSettingsCard />);
    const endsAt = await screen.findByLabelText("Fin de l'offre (votre heure locale)");

    fireEvent.change(endsAt, { target: { value: "2020-01-01T10:00" } });
    await user.click(screen.getByRole("button", { name: "Enregistrer la promotion" }));

    expect(screen.getByText(/déjà passée/)).toBeInTheDocument();
    expect(setLaunchPromoMock).not.toHaveBeenCalled();
  });

  it("gives the visible switch an accessible name", async () => {
    render(<LaunchPromoSettingsCard />);
    expect(await screen.findByRole("switch", { name: "Afficher la promotion" })).toBeInTheDocument();
  });
});
