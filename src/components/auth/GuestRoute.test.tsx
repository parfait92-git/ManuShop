const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

import { render, screen, waitFor } from "@testing-library/react";

import { GuestRoute } from "./GuestRoute";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/login${search}`);
}

describe("GuestRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearch("");
  });

  it("renders its children for a genuine visitor", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      profile: null,
      loading: false,
    });

    render(
      <GuestRoute>
        <p>Formulaire</p>
      </GuestRoute>
    );

    expect(screen.getByText("Formulaire")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("bounces an already-authenticated visitor to the generic error page by default", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { id: "u1" },
      loading: false,
    });

    render(<GuestRoute>{null}</GuestRoute>);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/erreur?code=already-authenticated"
      )
    );
  });

  // BF-143 : un visiteur qui vient de se connecter depuis /login?redirect=
  // (ex. onglet dupliqué, bouton retour) doit repartir vers sa commande,
  // pas vers une page d'erreur générique — demande explicite de
  // l'utilisateur, 2026-09-29.
  it("sends an already-authenticated visitor to the remembered page instead", async () => {
    setSearch("?redirect=%2Fcheckout%2Fpayment");
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { id: "u1" },
      loading: false,
    });

    render(<GuestRoute>{null}</GuestRoute>);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/checkout/payment")
    );
  });

  it("ignores an unsafe redirect target and falls back to the error page", async () => {
    setSearch("?redirect=https%3A%2F%2Fevil.example");
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { id: "u1" },
      loading: false,
    });

    render(<GuestRoute>{null}</GuestRoute>);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/erreur?code=already-authenticated"
      )
    );
  });
});
