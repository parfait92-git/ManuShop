jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const registerShopOwnerMock = jest.fn();
const logoutMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    registerShopOwner: (...args: unknown[]) => registerShopOwnerMock(...args),
    logout: (...args: unknown[]) => logoutMock(...args),
  },
}));

const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

const refreshProfileMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ refreshProfile: refreshProfileMock }),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "./RegisterForm";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/register${search}`);
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Votre nom"), "Awa Diallo");
  await user.type(screen.getByLabelText("Email"), "awa@example.com");
  await user.click(
    screen.getByRole("button", { name: "Afficher le mot de passe" })
  );
  await user.type(screen.getByLabelText("Mot de passe"), "motdepasse1");
  await user.type(
    screen.getByLabelText("Confirmer le mot de passe"),
    "motdepasse1"
  );
  await user.click(screen.getByRole("button", { name: /Créer mon compte/ }));
}

// BF-142 : signalé par l'utilisateur — le formulaire d'inscription n'avait
// aucun moyen d'afficher le mot de passe en clair, contrairement au
// formulaire de connexion (LoginForm).
describe("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerShopOwnerMock.mockResolvedValue({ id: "u1" });
    setSearch("");
  });

  it("masks both password fields by default", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText("Confirmer le mot de passe")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("toggles the password field independently from the confirmation field", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(
      screen.getByRole("button", { name: "Afficher le mot de passe" })
    );

    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByLabelText("Confirmer le mot de passe")).toHaveAttribute(
      "type",
      "password"
    );

    await user.click(
      screen.getByRole("button", { name: "Masquer le mot de passe" })
    );
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("toggles the confirmation field independently from the password field", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(
      screen.getByRole("button", {
        name: "Afficher la confirmation du mot de passe",
      })
    );

    expect(screen.getByLabelText("Confirmer le mot de passe")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("still submits the typed password correctly once revealed", async () => {
    registerShopOwnerMock.mockResolvedValue({ id: "u1" });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Votre nom"), "Awa Diallo");
    await user.type(screen.getByLabelText("Email"), "awa@example.com");
    await user.click(
      screen.getByRole("button", { name: "Afficher le mot de passe" })
    );
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse1");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "motdepasse1"
    );
    await user.click(screen.getByRole("button", { name: /Créer mon compte/ }));

    expect(registerShopOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Awa Diallo",
        email: "awa@example.com",
        password: "motdepasse1",
      })
    );
  });

  // BF-143 : reprendre une commande interrompue par une inscription —
  // demande explicite de l'utilisateur, 2026-09-29.
  describe("arrivé depuis le panier (?redirect=)", () => {
    it("shows a success message, signs the new account out, and sends to login", async () => {
      setSearch("?redirect=%2Fcheckout%2Fpayment");
      const user = userEvent.setup();
      render(<RegisterForm />);

      await fillAndSubmit(user);

      await waitFor(() => expect(logoutMock).toHaveBeenCalled());
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Compte créé avec succès !"
      );
      expect(pushMock).toHaveBeenCalledWith(
        "/login?redirect=%2Fcheckout%2Fpayment&registered=1"
      );
      expect(refreshProfileMock).not.toHaveBeenCalled();
    });

    it("forwards the redirect target to the login link", async () => {
      setSearch("?redirect=%2Fcheckout%2Fpayment");
      render(<RegisterForm />);

      await waitFor(() =>
        expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
          "href",
          "/login?redirect=%2Fcheckout%2Fpayment"
        )
      );
    });
  });

  it("keeps the existing behaviour (straight to the catalogue) without a redirect target", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user);

    await waitFor(() => expect(refreshProfileMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/catalogue");
    expect(logoutMock).not.toHaveBeenCalled();
  });
});
