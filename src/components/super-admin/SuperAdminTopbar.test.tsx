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

  it("always shows a way back to the public catalogue", () => {
    render(<SuperAdminTopbar onMenuClick={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Parfait/ }));

    expect(screen.getByRole("link", { name: "Catalogue" })).toHaveAttribute(
      "href",
      "/catalogue"
    );
  });

  it("shows a link back to /dashboard for an account that also runs a shop", () => {
    useAuthMock.mockReturnValue({
      profile: { displayName: "Parfait", photoURL: null, role: "admin" },
    });
    render(<SuperAdminTopbar onMenuClick={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Parfait/ }));

    expect(screen.getByRole("link", { name: "Mes boutiques" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  it("hides the dashboard link for a Super Admin who isn't also a merchant", () => {
    useAuthMock.mockReturnValue({
      profile: { displayName: "Parfait", photoURL: null, role: "client" },
    });
    render(<SuperAdminTopbar onMenuClick={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Parfait/ }));

    expect(
      screen.queryByRole("link", { name: "Mes boutiques" })
    ).not.toBeInTheDocument();
  });
});
