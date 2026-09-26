import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/catalogue",
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { firebaseUser: unknown; profile: unknown } = {
  firebaseUser: null,
  profile: null,
};
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

const logoutMock = jest.fn().mockResolvedValue(undefined);
jest.mock("../../services/AuthService", () => ({
  authService: { logout: () => logoutMock() },
}));

jest.mock("./CreateShopWizard", () => ({
  CreateShopWizard: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-shop-wizard" /> : null,
}));

import { StorefrontHeader } from "./StorefrontHeader";

describe("StorefrontHeader account menu", () => {
  beforeEach(() => {
    mockAuth = { firebaseUser: null, profile: null };
    logoutMock.mockClear();
    pushMock.mockClear();
  });

  it("links to /login when signed out", () => {
    render(<StorefrontHeader />);

    expect(screen.getByRole("link", { name: "Mon compte" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("shows account info and logs out instead of linking to /login when signed in", async () => {
    mockAuth = {
      firebaseUser: { uid: "u1", email: "ada@example.com" },
      profile: { displayName: "Ada Diallo", role: "client" },
    };
    const user = userEvent.setup();
    render(<StorefrontHeader />);

    expect(screen.queryByRole("link", { name: "Mon compte" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(screen.getByText("Ada Diallo")).toBeInTheDocument();
    // Un client (pas admin/vendeur) ne voit pas de lien vers le dashboard.
    expect(screen.queryByRole("link", { name: "Tableau de bord" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(logoutMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows a dashboard link for an admin", async () => {
    mockAuth = {
      firebaseUser: { uid: "u2", email: "admin@example.com" },
      profile: { displayName: "Boss", role: "admin" },
    };
    const user = userEvent.setup();
    render(<StorefrontHeader />);

    await user.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(screen.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  it("offers 'Créer ma boutique' to a client, and opens the wizard on click (BF-79)", async () => {
    mockAuth = {
      firebaseUser: { uid: "u1", email: "ada@example.com" },
      profile: { displayName: "Ada Diallo", role: "client" },
    };
    const user = userEvent.setup();
    render(<StorefrontHeader />);

    await user.click(screen.getByRole("button", { name: "Mon compte" }));
    expect(screen.queryByTestId("create-shop-wizard")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer ma boutique" }));
    expect(screen.getByTestId("create-shop-wizard")).toBeInTheDocument();
  });

  it("does not offer 'Créer ma boutique' to an admin (already has a shop)", async () => {
    mockAuth = {
      firebaseUser: { uid: "u2", email: "admin@example.com" },
      profile: { displayName: "Boss", role: "admin" },
    };
    const user = userEvent.setup();
    render(<StorefrontHeader />);

    await user.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(
      screen.queryByRole("button", { name: "Créer ma boutique" })
    ).not.toBeInTheDocument();
  });
});
