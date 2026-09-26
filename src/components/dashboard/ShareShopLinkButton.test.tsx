const writeTextMock = jest.fn();
Object.defineProperty(window.navigator, "clipboard", {
  value: { writeText: writeTextMock },
  configurable: true,
});

const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ShareShopLinkButton } from "@/components/dashboard/ShareShopLinkButton";

// `userEvent` n'est volontairement pas utilisé dans ce fichier : dès que
// `userEvent.setup()` est appelé — même sans jamais appeler `.click()` —
// les clics `fireEvent` suivants dans le même test cessent d'atteindre les
// gestionnaires `onClick` (aucune erreur, juste silencieusement aucun
// effet). Reproduit isolément lors de l'écriture de ce test ; `fireEvent`
// seul fonctionne de bout en bout. `act()` autour des clics qui déclenchent
// un traitement asynchrone (handlers `async function`) pour éviter les
// avertissements "not wrapped in act".
async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

describe("ShareShopLinkButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://manushop.cm";
    Object.defineProperty(window.navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });

  it("copies the shop's public link to the clipboard", async () => {
    writeTextMock.mockResolvedValue(undefined);
    render(<ShareShopLinkButton shopId="shop-1" shopName="Mode 237" />);

    await click(screen.getByRole("button", { name: /Partager le lien/ }));
    await click(screen.getByRole("button", { name: "Copier le lien" }));

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(
        "https://manushop.cm/boutique/shop-1"
      )
    );
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("shows an error toast when copying fails", async () => {
    writeTextMock.mockRejectedValue(new Error("denied"));
    render(<ShareShopLinkButton shopId="shop-1" shopName="Mode 237" />);

    await click(screen.getByRole("button", { name: /Partager le lien/ }));
    await click(screen.getByRole("button", { name: "Copier le lien" }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
  });

  it("builds a WhatsApp share link with the shop name and URL", async () => {
    render(<ShareShopLinkButton shopId="shop-1" shopName="Mode 237" />);

    await click(screen.getByRole("button", { name: /Partager le lien/ }));

    const whatsappLink = screen.getByRole("link", { name: /WhatsApp/ });
    expect(whatsappLink).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("Mode 237"))
    );
    expect(whatsappLink).toHaveAttribute(
      "href",
      expect.stringContaining(
        encodeURIComponent("https://manushop.cm/boutique/shop-1")
      )
    );
  });

  it("builds a mailto share link with the shop name and URL", async () => {
    render(<ShareShopLinkButton shopId="shop-1" shopName="Mode 237" />);

    await click(screen.getByRole("button", { name: /Partager le lien/ }));

    const mailLink = screen.getByRole("link", { name: /Email/ });
    expect(mailLink).toHaveAttribute("href", expect.stringContaining("mailto:"));
  });

  it("does not offer native sharing when navigator.share is unavailable", async () => {
    render(<ShareShopLinkButton shopId="shop-1" shopName="Mode 237" />);

    await click(screen.getByRole("button", { name: /Partager le lien/ }));

    expect(
      screen.queryByRole("button", { name: /Plus d'options/ })
    ).not.toBeInTheDocument();
  });

  it("offers native sharing when navigator.share is available", async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      value: shareMock,
      configurable: true,
    });
    render(<ShareShopLinkButton shopId="shop-1" shopName="Mode 237" />);

    await click(screen.getByRole("button", { name: /Partager le lien/ }));
    await click(screen.getByRole("button", { name: /Plus d'options/ }));

    expect(shareMock).toHaveBeenCalledWith({
      title: "Mode 237",
      url: "https://manushop.cm/boutique/shop-1",
    });
  });
});
