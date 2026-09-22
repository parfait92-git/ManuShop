import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockFirebaseUser: unknown = null;
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ firebaseUser: mockFirebaseUser }),
}));

const logoutMock = jest.fn().mockResolvedValue(undefined);
jest.mock("../../services/AuthService", () => ({
  authService: { logout: () => logoutMock() },
}));

import { SiteHeader } from "./SiteHeader";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

// requestAnimationFrame is mocked onto a real timer so the `ticking` flag in
// SiteHeader (set synchronously, cleared inside the frame) unwinds in the
// same order it does in a browser instead of collapsing into one tick.
function scroll(value: number) {
  setScrollY(value);
  fireEvent.scroll(window);
  act(() => {
    jest.runOnlyPendingTimers();
  });
}

describe("SiteHeader", () => {
  let rafSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    setScrollY(0);
    mockFirebaseUser = null;
    logoutMock.mockClear();
    rafSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        return window.setTimeout(() => cb(performance.now()), 0);
      });
  });

  afterEach(() => {
    rafSpy.mockRestore();
    jest.useRealTimers();
  });

  it("stays visible while scrolling near the top", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");

    scroll(20);

    expect(header).toHaveStyle({ opacity: "1" });
  });

  it("hides the header when scrolling down past the threshold", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");

    scroll(60);
    scroll(120);

    expect(header).toHaveStyle({ opacity: "0" });
  });

  it("reveals the header again when scrolling back up", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");

    scroll(60);
    scroll(120);
    expect(header).toHaveStyle({ opacity: "0" });

    scroll(40);

    expect(header).toHaveStyle({ opacity: "1" });
  });

  it("ignores small scroll deltas to avoid flickering", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");

    // Scroll up first to make the header visible and move past the top
    // offset, then apply a delta below the flicker threshold.
    scroll(200);
    scroll(60);
    expect(header).toHaveStyle({ opacity: "1" });

    scroll(64);

    expect(header).toHaveStyle({ opacity: "1" });
  });

  it("toggles the mobile menu open and closed", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SiteHeader />);

    expect(screen.queryByLabelText("Navigation mobile")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(screen.getByLabelText("Navigation mobile")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fermer le menu" }));
    expect(screen.queryByLabelText("Navigation mobile")).not.toBeInTheDocument();
  });

  it("closes the mobile menu when a nav link is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SiteHeader />);

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const mobileNav = screen.getByLabelText("Navigation mobile");

    await user.click(
      within(mobileNav).getByRole("link", { name: "Boutique" })
    );

    expect(screen.queryByLabelText("Navigation mobile")).not.toBeInTheDocument();
  });

  it("navigates to the catalogue when the search form is submitted empty", () => {
    render(<SiteHeader />);

    fireEvent.submit(screen.getByLabelText("Rechercher un produit").closest("form")!);

    expect(pushMock).toHaveBeenCalledWith("/catalogue");
  });

  it("navigates to the catalogue with the search term as a query param", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SiteHeader />);

    await user.type(screen.getByLabelText("Rechercher un produit"), "sandales");
    fireEvent.submit(screen.getByLabelText("Rechercher un produit").closest("form")!);

    expect(pushMock).toHaveBeenCalledWith("/catalogue?q=sandales");
  });

  it("links Se connecter, Boutique, and the cart to their real pages", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getByRole("link", { name: "Boutique" })).toHaveAttribute(
      "href",
      "/catalogue"
    );
    expect(screen.getByRole("link", { name: "Voir le panier" })).toHaveAttribute(
      "href",
      "/catalogue"
    );
  });

  it("shows Se déconnecter instead of a /login link when already authenticated", async () => {
    mockFirebaseUser = { uid: "u1" };
    const user = userEvent.setup({ delay: null });
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Se connecter" })).not.toBeInTheDocument();
    const logoutButton = screen.getByRole("button", { name: "Se déconnecter" });

    await user.click(logoutButton);

    expect(logoutMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
