const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

jest.mock("../../hooks/useCurrentShop", () => ({
  useCurrentShop: () => ({ shop: { name: "Boutique Test" }, loading: false }),
}));

jest.mock("../../hooks/useNewOrdersCount", () => ({
  useNewOrdersCount: () => 0,
}));

const logoutMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: { logout: (...args: unknown[]) => logoutMock(...args) },
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import { DashboardTopbar } from "./DashboardTopbar";

function fakeProfile(overrides: Partial<{ role: string; displayName: string; photoURL: string | null }> = {}) {
  return {
    id: "u1",
    displayName: "Boss",
    role: "admin",
    photoURL: null,
    ...overrides,
  };
}

describe("DashboardTopbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a Super Admin link for a super admin who also owns a shop", () => {
    useAuthMock.mockReturnValue({ profile: fakeProfile(), isSuperAdmin: true });
    render(<DashboardTopbar onMenuClick={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Boss/ }));

    expect(screen.getByRole("link", { name: "Super Admin" })).toHaveAttribute(
      "href",
      "/super-admin"
    );
  });

  it("hides the Super Admin link for a regular merchant", () => {
    useAuthMock.mockReturnValue({ profile: fakeProfile(), isSuperAdmin: false });
    render(<DashboardTopbar onMenuClick={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Boss/ }));

    expect(screen.queryByRole("link", { name: "Super Admin" })).not.toBeInTheDocument();
  });
});
