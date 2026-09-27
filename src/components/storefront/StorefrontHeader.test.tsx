const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const useShopBrandingMock = jest.fn();
jest.mock("../providers/ShopBrandingProvider", () => ({
  useShopBranding: (...args: unknown[]) => useShopBrandingMock(...args),
}));

const useCartItemCountMock = jest.fn();
jest.mock("../../store/cartStore", () => ({
  useCartItemCount: (...args: unknown[]) => useCartItemCountMock(...args),
}));

jest.mock("./CartPanel", () => ({
  CartPanel: () => <div data-testid="cart-panel" />,
}));

jest.mock("./CreateShopWizard", () => ({
  CreateShopWizard: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-shop-wizard" /> : null,
}));

const logoutMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: { logout: (...args: unknown[]) => logoutMock(...args) },
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock }),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { StorefrontHeader } from "./StorefrontHeader";

describe("StorefrontHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCartItemCountMock.mockReturnValue(0);
    useShopBrandingMock.mockReturnValue({ branding: null, setBranding: jest.fn() });
  });

  it("shows the generic ManuShop branding when no shop branding is set", () => {
    useAuthMock.mockReturnValue({ firebaseUser: null, profile: null });
    render(<StorefrontHeader />);

    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /boutique/i })).not.toBeInTheDocument();
  });

  it("shows the shop's logo and name instead of ManuShop when branding is set", () => {
    useAuthMock.mockReturnValue({ firebaseUser: null, profile: null });
    useShopBrandingMock.mockReturnValue({
      branding: { shopId: "shop-1", name: "Épicerie du coin", logo: "https://res.cloudinary.com/logo.png" },
      setBranding: jest.fn(),
    });
    render(<StorefrontHeader />);

    expect(screen.getByText("Épicerie du coin")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /épicerie du coin/i });
    expect(link).toHaveAttribute("href", "/boutique/shop-1");
    expect(screen.queryByText("Shop")).not.toBeInTheDocument();
  });

  it("falls back to a default icon when the shop has no logo yet", () => {
    useAuthMock.mockReturnValue({ firebaseUser: null, profile: null });
    useShopBrandingMock.mockReturnValue({
      branding: { shopId: "shop-1", name: "Épicerie du coin" },
      setBranding: jest.fn(),
    });
    render(<StorefrontHeader />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a plain account icon and login link when signed out", () => {
    useAuthMock.mockReturnValue({ firebaseUser: null, profile: null });
    render(<StorefrontHeader />);

    const accountLink = screen.getByRole("link", { name: "Mon compte" });
    expect(accountLink).toHaveAttribute("href", "/login");
  });

  it("links to Mes favoris (BF-129) once the menu is open", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { displayName: "Jean Dupont", email: "jean@example.com", photoURL: null },
      profile: { displayName: "Jean Dupont", email: "jean@example.com", role: "client", photoURL: null },
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(screen.getByRole("link", { name: "Mes favoris" })).toHaveAttribute(
      "href",
      "/mes-favoris"
    );
  });

  it("shows a Super Admin link for a super admin who also owns a shop (isSuperAdmin doesn't derive from role)", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { displayName: "Jean Dupont", email: "jean@example.com", photoURL: null },
      profile: { displayName: "Jean Dupont", email: "jean@example.com", role: "admin", photoURL: null },
      isSuperAdmin: true,
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(screen.getByRole("link", { name: "Super Admin" })).toHaveAttribute(
      "href",
      "/super-admin"
    );
  });

  it("hides the Super Admin link for a regular account", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { displayName: "Jean Dupont", email: "jean@example.com", photoURL: null },
      profile: { displayName: "Jean Dupont", email: "jean@example.com", role: "client", photoURL: null },
      isSuperAdmin: false,
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(screen.queryByRole("link", { name: "Super Admin" })).not.toBeInTheDocument();
  });

  it("shows the connected user's display name and photo once open", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { displayName: "Jean Dupont", email: "jean@example.com", photoURL: null },
      profile: {
        displayName: "Jean Dupont",
        email: "jean@example.com",
        role: "client",
        photoURL: "https://lh3.googleusercontent.com/photo.jpg",
      },
    });
    render(<StorefrontHeader />);

    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.queryByText("J")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));
    expect(screen.getByText("jean@example.com")).toBeInTheDocument();
  });

  it("falls back to an initial-letter avatar when no profile photo is set", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { displayName: "Awa Ndiaye", email: "awa@example.com", photoURL: null },
      profile: {
        displayName: "Awa Ndiaye",
        email: "awa@example.com",
        role: "client",
        photoURL: null,
      },
    });
    render(<StorefrontHeader />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows a dashboard link for an admin", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u2", email: "admin@example.com", photoURL: null },
      profile: { displayName: "Boss", email: "admin@example.com", role: "admin", photoURL: null },
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(screen.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  it("offers 'Créer ma boutique' to a client, and opens the wizard on click (BF-79)", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1", email: "ada@example.com", photoURL: null },
      profile: { displayName: "Ada Diallo", email: "ada@example.com", role: "client", photoURL: null },
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));
    expect(screen.queryByTestId("create-shop-wizard")).not.toBeInTheDocument();
    // Un client (pas admin/vendeur) ne voit pas de lien vers le dashboard.
    expect(screen.queryByRole("link", { name: "Tableau de bord" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Créer ma boutique" }));
    expect(screen.getByTestId("create-shop-wizard")).toBeInTheDocument();
  });

  it("does not offer 'Créer ma boutique' to an admin (already has a shop)", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u2", email: "admin@example.com", photoURL: null },
      profile: { displayName: "Boss", email: "admin@example.com", role: "admin", photoURL: null },
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));

    expect(
      screen.queryByRole("button", { name: "Créer ma boutique" })
    ).not.toBeInTheDocument();
  });

  it("logs out and redirects home", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1", email: "ada@example.com", photoURL: null },
      profile: { displayName: "Ada Diallo", email: "ada@example.com", role: "client", photoURL: null },
    });
    render(<StorefrontHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(logoutMock).toHaveBeenCalled();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });
});
