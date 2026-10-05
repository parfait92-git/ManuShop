jest.mock("../../components/push/PushNudge", () => ({ PushNudge: () => null }));
const useMediaQueryMock = jest.fn();
jest.mock("../../hooks/useMediaQuery", () => ({
  TABLET_UP: "(min-width: 768px)",
  useMediaQuery: (...args: unknown[]) => useMediaQueryMock(...args),
}));
jest.mock("../../components/providers/AuthProvider", () => ({
  useAuth: () => ({ profile: { shopId: "shop-1" } }),
}));
jest.mock("../../components/onboarding/PageTour", () => ({ PageTour: () => null }));
jest.mock("../../hooks/useShopTheme", () => ({
  useShopTheme: () => ({ theme: { dashboardTheme: "default", siteTheme: "default" }, loading: false }),
}));
jest.mock("../../components/dashboard/DashboardHomeContent", () => ({
  DashboardHomeContent: () => <p>vue mobile</p>,
}));
var dynamicLoaders: unknown[];  // eslint-disable-line no-var -- lu par la fabrique hissée de jest.mock
jest.mock("next/dynamic", () => (loader: unknown, options: { ssr: boolean }) => {
  (dynamicLoaders ??= []).push({ loader, options });
  return function ChartView() {
    return <p>vue graphique</p>;
  };
});

import { render, screen } from "@testing-library/react";

import DashboardPage from "./page";

describe("dashboard home", () => {
  it("loads the chart view without server rendering", () => {
    expect(dynamicLoaders).toEqual([expect.objectContaining({ options: expect.objectContaining({ ssr: false }) })]);
  });

  it("keeps the current view on mobile, without the chart view", () => {
    useMediaQueryMock.mockReturnValue(false);
    render(<DashboardPage />);
    expect(screen.getByText("vue mobile")).toBeInTheDocument();
    expect(screen.queryByText("vue graphique")).not.toBeInTheDocument();
    expect(useMediaQueryMock).toHaveBeenCalledWith("(min-width: 768px)");
  });

  it("shows the chart view on tablet and desktop", () => {
    useMediaQueryMock.mockReturnValue(true);
    render(<DashboardPage />);
    expect(screen.getByText("vue graphique")).toBeInTheDocument();
    expect(screen.queryByText("vue mobile")).not.toBeInTheDocument();
  });

  it("waits until the screen size is known", () => {
    useMediaQueryMock.mockReturnValue(undefined);
    render(<DashboardPage />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(screen.queryByText("vue mobile")).not.toBeInTheDocument();
    expect(screen.queryByText("vue graphique")).not.toBeInTheDocument();
  });
});
