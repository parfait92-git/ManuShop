jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const registerShopOwnerMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    registerShopOwner: (...args: unknown[]) => registerShopOwnerMock(...args),
  },
}));

const refreshProfileMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ refreshProfile: refreshProfileMock }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "./RegisterForm";

// BF-142 : signalé par l'utilisateur — le formulaire d'inscription n'avait
// aucun moyen d'afficher le mot de passe en clair, contrairement au
// formulaire de connexion (LoginForm).
describe("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
