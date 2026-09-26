const mockItems = [
  { productId: "p1", name: "Sac à main artisanal", price: 12500, image: "", quantity: 1 },
];

jest.mock("../../store/cartStore", () => {
  const actual = jest.requireActual("../../store/cartStore");
  return {
    ...actual,
    useCartStore: (selector: (state: { items: typeof mockItems }) => unknown) =>
      selector({ items: mockItems }),
  };
});

const toastInfoMock = jest.fn();
jest.mock("sonner", () => ({ toast: { info: (...args: unknown[]) => toastInfoMock(...args) } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PaymentMethodPageContent } from "@/components/storefront/PaymentMethodPageContent";

describe("PaymentMethodPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the cart total and defaults to the card field", () => {
    render(<PaymentMethodPageContent />);

    // `toLocaleString("fr-FR")` sépare les milliers par une espace fine
    // insécable (U+202F), pas une espace normale — d'où les regex \s+
    // plutôt que des chaînes littérales pour matcher le montant affiché.
    expect(screen.getByText(/Total à payer.*12\s*500\s*FCFA/)).toBeInTheDocument();
    expect(screen.getByLabelText("Numéro de carte")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Payer\s*12\s*500\s*FCFA/ })
    ).toBeInTheDocument();
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

  it("clicking Payer only shows an honest notice, no fake success", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodPageContent />);

    await user.click(
      screen.getByRole("button", { name: /Payer\s*12\s*500\s*FCFA/ })
    );

    expect(toastInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("Paiement non disponible")
    );
  });
});
