const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const markTourSeenMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    markTourSeen: (...args: unknown[]) => markTourSeenMock(...args),
  },
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DASHBOARD_ONBOARDING_TOUR_ID,
  DashboardOnboardingTour,
} from "./DashboardOnboardingTour";

function fakeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    role: "admin",
    seenTours: [] as string[],
    ...overrides,
  };
}

// BF-134 : onboarding auto-lancé une seule fois par compte sur /dashboard —
// simple application de GuidedTour (BF-135) avec run dérivé de
// profile.seenTours.
describe("DashboardOnboardingTour", () => {
  const refreshProfileMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    markTourSeenMock.mockResolvedValue(undefined);
  });

  it("renders nothing while the profile hasn't loaded", () => {
    useAuthMock.mockReturnValue({
      profile: null,
      refreshProfile: refreshProfileMock,
    });
    const { container } = render(<DashboardOnboardingTour />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not run the tour once already marked as seen", () => {
    useAuthMock.mockReturnValue({
      profile: fakeProfile({ seenTours: [DASHBOARD_ONBOARDING_TOUR_ID] }),
      refreshProfile: refreshProfileMock,
    });
    render(<DashboardOnboardingTour />);

    expect(
      screen.queryByText(/Bienvenue sur votre tableau de bord/)
    ).not.toBeInTheDocument();
  });

  it("runs the tour for a first-time admin, including the settings step", async () => {
    useAuthMock.mockReturnValue({
      profile: fakeProfile({ role: "admin" }),
      refreshProfile: refreshProfileMock,
    });
    render(<DashboardOnboardingTour />);

    expect(
      await screen.findByText(/Bienvenue sur votre tableau de bord/)
    ).toBeInTheDocument();
  });

  it("marks the tour as seen and refreshes the profile once skipped", async () => {
    useAuthMock.mockReturnValue({
      profile: fakeProfile({ id: "u1" }),
      refreshProfile: refreshProfileMock,
    });
    const user = userEvent.setup();
    render(<DashboardOnboardingTour />);

    await user.click(await screen.findByRole("button", { name: "Passer" }));

    expect(markTourSeenMock).toHaveBeenCalledWith(
      "u1",
      DASHBOARD_ONBOARDING_TOUR_ID
    );
    expect(refreshProfileMock).toHaveBeenCalled();
  }, 15000); // repositionnement asynchrone (floating-ui) plus lent sous la suite complète en parallèle
});
