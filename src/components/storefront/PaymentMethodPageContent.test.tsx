const mockItems = [
  { productId: "p1", name: "Sac à main artisanal", price: 12500, image: "", quantity: 1 },
];

const clearMock = jest.fn();
jest.mock("../../store/cartStore", () => {
  const actual = jest.requireActual("../../store/cartStore");
  return {
    ...actual,
    useCartStore: (
      selector: (state: {
        items: typeof mockItems;
        clear: typeof clearMock;
      }) => unknown
    ) => selector({ items: mockItems, clear: clearMock }),
  };
});

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockProfile: { displayName?: string; phone?: string } | null = {
  displayName: "Fatou Ba",
  phone: "+237600000000",
};
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

let mockShop: { id: string } | null = { id: "shop-1" };
jest.mock("../../hooks/useShop", () => ({
  useShop: () => ({ shop: mockShop, loading: false }),
}));

const createOrderMock = jest.fn();
jest.mock("../../services/OrderService", () => ({
  orderService: { createOrder: (...args: unknown[]) => createOrderMock(...args) },
}));

const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PaymentMethodPageContent } from "@/components/storefront/PaymentMethodPageContent";

describe("PaymentMethodPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = { displayName: "Fatou Ba", phone: "+237600000000" };
    mockShop = { id: "shop-1" };
  });

  it("shows the cart total, pre-fills the client's name/phone, and defaults to the card field", () => {
    render(<PaymentMethodPageContent />);

    // `toLocaleString("fr-FR")` sépare les milliers par une espace fine
    // insécable (U+202F), pas une espace normale — d'où les regex \s+
    // plutôt que des chaînes littérales pour matcher le montant affiché.
    expect(screen.getByText(/Total.*12\s*500\s*FCFA/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toHaveValue("Fatou Ba");
    expect(screen.getByLabelText("Numéro de carte")).toBeInTheDocument();
  });

  it("switches to a phone field for Orange Money / MTN Mobile Money", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodPageContent />);

    await user.click(screen.getByRole("button", { name: /Orange Money/ }));

    expect(screen.getByLabelText("Numéro de téléphone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Orange Money/ })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the confirm button until the delivery address is filled in", () => {
    render(<PaymentMethodPageContent />);

    expect(
      screen.getByRole("button", { name: /Confirmer ma commande/ })
    ).toBeDisabled();
  });

  it("creates a real order, clears the cart and redirects to the client's order list", async () => {
    createOrderMock.mockResolvedValue({ orderId: "order-1" });
    const user = userEvent.setup();
    render(<PaymentMethodPageContent />);

    await user.type(
      screen.getByLabelText("Adresse de livraison"),
      "Akwa, Douala"
    );
    await user.click(
      screen.getByRole("button", { name: /Confirmer ma commande/ })
    );

    await waitFor(() =>
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: "shop-1",
          clientName: "Fatou Ba",
          clientPhone: "+237600000000",
          clientAddress: "Akwa, Douala",
          items: [
            {
              productId: "p1",
              name: "Sac à main artisanal",
              quantity: 1,
              unitPrice: 12500,
            },
          ],
          subtotal: 12500,
          total: 12500,
        })
      )
    );
    expect(clearMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/mes-commandes");
  });

  it("shows an empty-cart message instead of the checkout form when there is nothing to order", () => {
    mockItems.splice(0, mockItems.length);
    render(<PaymentMethodPageContent />);

    expect(screen.getByText("Votre panier est vide")).toBeInTheDocument();
    mockItems.push({
      productId: "p1",
      name: "Sac à main artisanal",
      price: 12500,
      image: "",
      quantity: 1,
    });
  });
});
