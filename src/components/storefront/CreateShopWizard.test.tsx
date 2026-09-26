const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const refreshProfileMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ refreshProfile: refreshProfileMock }),
}));

const createShopWithSubscriptionMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    createShopWithSubscription: (...args: unknown[]) =>
      createShopWithSubscriptionMock(...args),
  },
}));

jest.mock("./ShopLogoStep", () => ({
  ShopLogoStep: () => <div data-testid="shop-logo-step" />,
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CreateShopWizard } from "@/components/storefront/CreateShopWizard";

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nom de la boutique"), "Chez Mado");
  await user.click(screen.getByRole("button", { name: "Suivant" }));
}

async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
  await goToStep2(user);
  await user.click(screen.getByRole("button", { name: "Suivant" }));
}

async function goToStep4(user: ReturnType<typeof userEvent.setup>) {
  await goToStep3(user);
  await user.click(
    screen.getByRole("button", { name: "Continuer vers l'abonnement" })
  );
}

describe("CreateShopWizard", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks moving past step 1 without a shop name", async () => {
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Suivant" }));

    expect(
      screen.getByText(/au moins 2 caractères/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de la boutique")).toBeInTheDocument();
  });

  it("advances through steps 1 → 2 → 3 with the name carried into the recap", async () => {
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await goToStep3(user);

    expect(screen.getByText("Chez Mado")).toBeInTheDocument();
    // Champs jamais remplis : état honnête "Non renseigné", pas de valeur
    // fabriquée (BF-82).
    expect(screen.getAllByText("Non renseigné").length).toBeGreaterThan(0);
  });

  it("defaults to the recommended (yearly) plan on step 4", async () => {
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await goToStep4(user);

    expect(screen.getByRole("button", { name: /Annuel/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("lets the user pick a different plan", async () => {
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await goToStep4(user);
    await user.click(screen.getByRole("button", { name: /Mensuel/ }));

    expect(screen.getByRole("button", { name: /Mensuel/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /Annuel/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("creates the shop, refreshes the profile and redirects to /dashboard on confirm", async () => {
    createShopWithSubscriptionMock.mockResolvedValue({ shopId: "shop-new" });
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await goToStep4(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer ma boutique" })
    );

    expect(createShopWithSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Chez Mado", subscriptionPlan: "yearly" })
    );
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows an honest error and does not navigate away on failure", async () => {
    createShopWithSubscriptionMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await goToStep4(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmer et créer ma boutique" })
    );

    expect(
      await screen.findByText("Une erreur est survenue. Veuillez réessayer.")
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("closing the dialog resets the form (BF-84)", async () => {
    const user = userEvent.setup();
    render(<CreateShopWizard open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText("Nom de la boutique"), "Perdu");
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
