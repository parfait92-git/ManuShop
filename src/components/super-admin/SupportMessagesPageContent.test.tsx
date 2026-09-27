import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

const listAllMessagesMock = jest.fn();
const replyToMessageMock = jest.fn();
jest.mock("../../services/SupportMessageService", () => ({
  supportMessageService: {
    listAllMessages: (...args: unknown[]) => listAllMessagesMock(...args),
    replyToMessage: (...args: unknown[]) => replyToMessageMock(...args),
  },
}));

import { SupportMessagesPageContent } from "@/components/super-admin/SupportMessagesPageContent";
import type { SupportMessage } from "@/models/support/SupportMessage";

function fakeMessage(overrides: Partial<SupportMessage> = {}): SupportMessage {
  return {
    id: "msg1",
    shopId: "shop1",
    shopName: "Boutique Ada",
    senderId: "u1",
    senderName: "Ada",
    subject: "Objet du message",
    body: "Corps du message",
    status: "open",
    createdAt: Timestamp.fromDate(new Date("2026-01-01T10:00:00")),
    ...overrides,
  };
}

describe("SupportMessagesPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state, then the list of messages", async () => {
    listAllMessagesMock.mockResolvedValue([fakeMessage()]);
    render(<SupportMessagesPageContent />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(await screen.findByText("Objet du message")).toBeInTheDocument();
    expect(screen.getByText("Boutique Ada — Ada")).toBeInTheDocument();
  });

  it("shows an empty state when there are no messages", async () => {
    listAllMessagesMock.mockResolvedValue([]);
    render(<SupportMessagesPageContent />);

    expect(
      await screen.findByText("Aucun message pour le moment.")
    ).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    listAllMessagesMock.mockRejectedValue(new Error("boom"));
    render(<SupportMessagesPageContent />);

    expect(
      await screen.findByText("Échec du chargement des messages. Réessayez.")
    ).toBeInTheDocument();
  });

  it("expands a message row and replies to it", async () => {
    listAllMessagesMock.mockResolvedValue([fakeMessage()]);
    replyToMessageMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SupportMessagesPageContent />);

    await user.click(await screen.findByText("Objet du message"));
    expect(screen.getByText("Corps du message")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("Votre réponse...");
    await user.type(textarea, "Voici la réponse");
    await user.click(screen.getByRole("button", { name: "Répondre" }));

    await waitFor(() =>
      expect(replyToMessageMock).toHaveBeenCalledWith("msg1", "Voici la réponse")
    );
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(await screen.findByText("Voici la réponse")).toBeInTheDocument();
    expect(screen.getByText("Répondu")).toBeInTheDocument();
  });

  it("shows an error and keeps the form when replying fails", async () => {
    listAllMessagesMock.mockResolvedValue([fakeMessage()]);
    replyToMessageMock.mockRejectedValue(new Error("Échec réseau."));
    const user = userEvent.setup();
    render(<SupportMessagesPageContent />);

    await user.click(await screen.findByText("Objet du message"));
    await user.type(screen.getByPlaceholderText("Votre réponse..."), "Réponse");
    await user.click(screen.getByRole("button", { name: "Répondre" }));

    expect(await screen.findByText("Échec réseau.")).toBeInTheDocument();
  });

  it("shows the existing reply instead of the form for an already-answered message", async () => {
    listAllMessagesMock.mockResolvedValue([
      fakeMessage({
        status: "answered",
        reply: {
          body: "Déjà répondu",
          createdAt: Timestamp.fromDate(new Date("2026-01-02T10:00:00")),
        },
      }),
    ]);
    const user = userEvent.setup();
    render(<SupportMessagesPageContent />);

    await user.click(await screen.findByText("Objet du message"));

    expect(screen.getByText("Déjà répondu")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Votre réponse...")).not.toBeInTheDocument();
  });
});
