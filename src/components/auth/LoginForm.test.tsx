jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const loginMock = jest.fn();
const setRememberMeMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    login: (...args: unknown[]) => loginMock(...args),
    setRememberMe: (...args: unknown[]) => setRememberMeMock(...args),
    loginWithGoogle: jest.fn(),
    loginWithFacebook: jest.fn(),
  },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "./LoginForm";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/login${search}`);
}

// BF-143 : reprendre une commande interrompue par une connexion forcée —
// demande explicite de l'utilisateur, 2026-09-29.
describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginMock.mockResolvedValue(undefined);
    setRememberMeMock.mockResolvedValue(undefined);
    setSearch("");
  });

  it("shows no banner and redirects to the dashboard by default", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    expect(
      screen.queryByText(/Connectez-vous pour continuer votre commande/)
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Adresse email"), "a@b.com");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows a contextual banner and redirects to the remembered page once logged in", async () => {
    setSearch("?redirect=%2Fcheckout%2Fpayment");
    const user = userEvent.setup();
    render(<LoginForm />);

    expect(
      await screen.findByText("Connectez-vous pour continuer votre commande.")
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Adresse email"), "a@b.com");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/checkout/payment")
    );
  });

  it("shows the just-registered variant of the banner", async () => {
    setSearch("?redirect=%2Fcheckout%2Fpayment&registered=1");
    render(<LoginForm />);

    expect(
      await screen.findByText(
        "Compte créé avec succès ! Connectez-vous pour continuer votre commande."
      )
    ).toBeInTheDocument();
  });

  it("forwards the redirect target to the register link", async () => {
    setSearch("?redirect=%2Fcheckout%2Fpayment");
    render(<LoginForm />);

    expect(
      await screen.findByRole("link", { name: "Créer mon espace" })
    ).toHaveAttribute("href", "/register?redirect=%2Fcheckout%2Fpayment");
  });
});
