// Rafraîchissement des prix du panier (testé dans useCartPriceSync.test.ts) :
// il lit les produits via le SDK Firebase, hors sujet ici.
jest.mock("../../hooks/useCartPriceSync", () => ({ useCartPriceSync: () => [] }));

// Visite guidée de la fenêtre (BF-134/135, testée dans onboarding/) : elle
// charge le SDK Firebase via useAuth et se lancerait sur le profil de test.
jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));

import { fireEvent, render, screen } from "@testing-library/react";

import { CartPanel } from "@/components/storefront/CartPanel";
import { useCartStore } from "@/store/cartStore";

jest.mock("../../hooks/useShop", () => ({
  useShop: () => ({ shop: { id: "shop-1", whatsapp: "+237600000000", name: "Boutique" }, loading: false }),
}));

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("CartPanel", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    pushMock.mockClear();
    useAuthMock.mockReturnValue({ firebaseUser: { uid: "u1" } });
  });

  it("shows an empty message when the cart has nothing in it", () => {
    render(<CartPanel onClose={jest.fn()} />);
    expect(screen.getByText("Votre panier est vide.")).toBeInTheDocument();
  });

  it("increments the quantity via the + button", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 1);
    render(<CartPanel onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Augmenter la quantité" }));

    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("disables the + button and shows a hint once stock is fully in the cart", () => {
    useCartStore.getState().addItem(
      { productId: "p1", name: "Sac", price: 1000, image: "", stock: 3 },
      3
    );
    render(<CartPanel onClose={jest.fn()} />);

    const increaseButton = screen.getByRole("button", { name: "Augmenter la quantité" });
    expect(increaseButton).toBeDisabled();
    expect(
      screen.getByText("Stock maximum atteint (3 disponibles).")
    ).toBeInTheDocument();
  });

  it("does not show a stock hint when no stock is known for the item", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 5);
    render(<CartPanel onClose={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: "Augmenter la quantité" })
    ).toBeEnabled();
    expect(screen.queryByText(/Stock maximum atteint/)).not.toBeInTheDocument();
  });

  it("removes an item from the cart", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 1);
    render(<CartPanel onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Retirer Sac" }));

    expect(useCartStore.getState().items).toEqual([]);
  });

  // BF-143 : passer commande sans être connecté doit avertir plutôt que
  // rediriger silencieusement (ce que faisait ProtectedRoute jusqu'ici, vers
  // /catalogue, sans explication) — demande explicite de l'utilisateur,
  // 2026-09-29.
  describe("choisir un mode de paiement sans être connecté", () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue({ firebaseUser: null });
      useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 1);
    });

    it("shows a login-required warning instead of navigating", () => {
      render(<CartPanel onClose={jest.fn()} />);

      expect(
        screen.queryByRole("link", { name: "Choisir un mode de paiement" })
      ).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: "Choisir un mode de paiement" })
      );

      expect(
        screen.getByText("Connectez-vous pour continuer")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/les articles de votre panier resteront enregistrés/)
      ).toBeInTheDocument();
    });

    it("sends the visitor to login with the checkout page remembered", () => {
      render(<CartPanel onClose={jest.fn()} />);

      fireEvent.click(
        screen.getByRole("button", { name: "Choisir un mode de paiement" })
      );
      fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

      expect(pushMock).toHaveBeenCalledWith(
        "/login?redirect=%2Fcheckout%2Fpayment"
      );
    });
  });

  it("links straight to checkout when already logged in", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 1);
    render(<CartPanel onClose={jest.fn()} />);

    expect(
      screen.getByRole("link", { name: "Choisir un mode de paiement" })
    ).toHaveAttribute("href", "/checkout/payment");
  });
});
