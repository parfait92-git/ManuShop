import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

const useCurrentShopMock = jest.fn();
jest.mock("../../hooks/useCurrentShop", () => ({
  useCurrentShop: () => useCurrentShopMock(),
}));

const useSupportMessagesForShopMock = jest.fn();
jest.mock("../../hooks/useSupportMessagesForShop", () => ({
  useSupportMessagesForShop: (...args: unknown[]) =>
    useSupportMessagesForShopMock(...args),
}));

const sendMessageMock = jest.fn();
jest.mock("../../services/SupportMessageService", () => ({
  supportMessageService: {
    sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  },
}));

import { SupportPageContent } from "@/components/dashboard/SupportPageContent";
import type { Shop } from "@/models/shop/Shop";
import type { SupportMessage } from "@/models/support/SupportMessage";

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop1",
    name: "Boutique Ada",
    premiumFeatures: ["contactForm"],
    ...overrides,
  } as Shop & { id: string };
}

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

describe("SupportPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSupportMessagesForShopMock.mockReturnValue(undefined);
  });

  it("shows a loading state while the shop is loading", () => {
    useCurrentShopMock.mockReturnValue({ shop: null, loading: true });
    render(<SupportPageContent />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows a locked state when contactForm isn't enabled", () => {
    useCurrentShopMock.mockReturnValue({
      shop: fakeShop({ premiumFeatures: [] }),
      loading: false,
    });
    render(<SupportPageContent />);
    expect(
      screen.getByText(
        "Cette fonctionnalité est réservée aux boutiques disposant du privilège premium correspondant."
      )
    ).toBeInTheDocument();
    // Le privilège n'étant pas actif, aucun abonnement temps réel ne doit
    // être ouvert pour rien.
    expect(useSupportMessagesForShopMock).toHaveBeenCalledWith(undefined);
  });

  it("subscribes to the shop's messages in real time once enabled", () => {
    useCurrentShopMock.mockReturnValue({ shop: fakeShop(), loading: false });
    render(<SupportPageContent />);
    expect(useSupportMessagesForShopMock).toHaveBeenCalledWith("shop1");
  });

  it("shows a loading state for the message list while the subscription resolves", () => {
    useCurrentShopMock.mockReturnValue({ shop: fakeShop(), loading: false });
    useSupportMessagesForShopMock.mockReturnValue(undefined);
    render(<SupportPageContent />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows the form and message list when enabled", async () => {
    useCurrentShopMock.mockReturnValue({ shop: fakeShop(), loading: false });
    useSupportMessagesForShopMock.mockReturnValue([fakeMessage()]);
    render(<SupportPageContent />);

    expect(screen.getByLabelText("Objet")).toBeInTheDocument();
    expect(await screen.findByText("Objet du message")).toBeInTheDocument();
    expect(screen.getByText("Corps du message")).toBeInTheDocument();
  });

  it("shows the reply inline when the message was answered", async () => {
    useCurrentShopMock.mockReturnValue({ shop: fakeShop(), loading: false });
    useSupportMessagesForShopMock.mockReturnValue([
      fakeMessage({
        status: "answered",
        reply: {
          body: "Réponse du Super Admin",
          createdAt: Timestamp.fromDate(new Date("2026-01-02T10:00:00")),
        },
      }),
    ]);
    render(<SupportPageContent />);

    expect(await screen.findByText("Réponse du Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Répondu")).toBeInTheDocument();
  });

  it("sends a message and clears the form, relying on the live subscription for the update", async () => {
    useCurrentShopMock.mockReturnValue({ shop: fakeShop(), loading: false });
    useSupportMessagesForShopMock.mockReturnValue([]);
    sendMessageMock.mockResolvedValue({ id: "msg2" });
    const user = userEvent.setup();
    render(<SupportPageContent />);

    await screen.findByText("Aucun message envoyé pour le moment.");

    await user.type(screen.getByLabelText("Objet"), "Nouveau souci");
    await user.type(screen.getByLabelText("Message"), "Corps du message");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith("Nouveau souci", "Corps du message")
    );
    await waitFor(() =>
      expect((screen.getByLabelText("Objet") as HTMLInputElement).value).toBe("")
    );
  });

  it("shows an error message when sending fails", async () => {
    useCurrentShopMock.mockReturnValue({ shop: fakeShop(), loading: false });
    useSupportMessagesForShopMock.mockReturnValue([]);
    sendMessageMock.mockRejectedValue(new Error("Échec réseau."));
    const user = userEvent.setup();
    render(<SupportPageContent />);

    await screen.findByText("Aucun message envoyé pour le moment.");

    await user.type(screen.getByLabelText("Objet"), "Objet");
    await user.type(screen.getByLabelText("Message"), "Corps");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText("Échec réseau.")).toBeInTheDocument();
  });
});
