let mockProfile: { role: string } | null = null;
jest.mock("../../../components/providers/AuthProvider", () => ({
  useAuth: () => ({ firebaseUser: { uid: "u1" }, profile: mockProfile }),
}));
jest.mock("../../../services/AuthService", () => ({ authService: { logout: jest.fn() } }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { render, screen } from "@testing-library/react";

import ErreurPage from "./page";

describe("ErreurPage — accès refusé", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/erreur?code=403");
  });

  it("sends a client home instead of back to the dashboard, which would refuse again", async () => {
    mockProfile = { role: "client" };
    render(<ErreurPage />);
    expect(await screen.findByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/catalogue");
  });

  it("offers the dashboard to a manager or a seller", async () => {
    mockProfile = { role: "admin" };
    render(<ErreurPage />);
    expect(await screen.findByRole("link", { name: "Retour au tableau de bord" })).toHaveAttribute("href", "/dashboard");
  });
});
