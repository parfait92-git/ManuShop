import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const sendContactMessageMock = jest.fn();
jest.mock("../../services/SupportMessageService", () => ({
  supportMessageService: {
    sendContactMessage: (...args: unknown[]) => sendContactMessageMock(...args),
  },
}));

import { ContactSuperAdminCta } from "@/components/storefront/ContactSuperAdminCta";

describe("ContactSuperAdminCta", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the dialog with empty subject/body fields", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: null });
    const user = userEvent.setup();
    render(<ContactSuperAdminCta />);

    await user.click(screen.getByRole("button", { name: /Nous contacter/ }));

    expect(await screen.findByLabelText("Objet")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("requires being signed in to send, without discarding what was typed", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: null });
    const user = userEvent.setup();
    render(<ContactSuperAdminCta />);

    await user.click(screen.getByRole("button", { name: /Nous contacter/ }));
    await user.type(await screen.findByLabelText("Objet"), "Question");
    await user.type(screen.getByLabelText("Message"), "Un message.");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      await screen.findByText(/Vous devez être connecté/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(sendContactMessageMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Objet")).toHaveValue("Question");
  });

  it("sends the message and shows a confirmation when signed in", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: { uid: "u1" } });
    sendContactMessageMock.mockResolvedValue({ id: "msg1" });
    const user = userEvent.setup();
    render(<ContactSuperAdminCta />);

    await user.click(screen.getByRole("button", { name: /Nous contacter/ }));
    await user.type(await screen.findByLabelText("Objet"), "Question");
    await user.type(screen.getByLabelText("Message"), "Un message.");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(sendContactMessageMock).toHaveBeenCalledWith(
        "Question",
        "Un message."
      )
    );
    expect(await screen.findByText(/Message envoyé/)).toBeInTheDocument();
  });

  it("shows an error message when sending fails", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: { uid: "u1" } });
    sendContactMessageMock.mockRejectedValue(new Error("Échec réseau."));
    const user = userEvent.setup();
    render(<ContactSuperAdminCta />);

    await user.click(screen.getByRole("button", { name: /Nous contacter/ }));
    await user.type(await screen.findByLabelText("Objet"), "Question");
    await user.type(screen.getByLabelText("Message"), "Un message.");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText("Échec réseau.")).toBeInTheDocument();
  });

  it("closes without sending when cancelled", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: { uid: "u1" } });
    const user = userEvent.setup();
    render(<ContactSuperAdminCta />);

    await user.click(screen.getByRole("button", { name: /Nous contacter/ }));
    await screen.findByLabelText("Objet");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByLabelText("Objet")).not.toBeInTheDocument();
    expect(sendContactMessageMock).not.toHaveBeenCalled();
  });
});
