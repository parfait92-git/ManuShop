const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
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

import { SuperAdminTopbar } from "./SuperAdminTopbar";

describe("SuperAdminTopbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({
      profile: { displayName: "Parfait", photoURL: null },
    });
  });

  it("shows the platform/Super Admin label", () => {
    render(<SuperAdminTopbar onMenuClick={jest.fn()} />);
    expect(screen.getByText("Espace plateforme")).toBeInTheDocument();
    expect(screen.getAllByText("Super Admin").length).toBeGreaterThan(0);
  });

  it("opens the mobile menu", () => {
    const onMenuClick = jest.fn();
    render(<SuperAdminTopbar onMenuClick={onMenuClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(onMenuClick).toHaveBeenCalled();
  });

  it("logs out and redirects to /login", async () => {
    render(<SuperAdminTopbar onMenuClick={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Parfait/ }));
    fireEvent.click(screen.getByRole("button", { name: "Déconnexion" }));

    expect(logoutMock).toHaveBeenCalled();
  });
});
