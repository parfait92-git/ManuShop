import { render, screen, waitFor } from "@testing-library/react";

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing while auth state is loading", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      profile: null,
      loading: true,
    });
    const { container } = render(
      <ProtectedRoute>
        <p>Contenu protégé</p>
      </ProtectedRoute>
    );

    expect(container).toBeEmptyDOMElement();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /catalogue when signed out (direct access, logout or expired session)", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      profile: null,
      loading: false,
    });
    render(
      <ProtectedRoute>
        <p>Contenu protégé</p>
      </ProtectedRoute>
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/catalogue"));
  });

  it("redirects to /onboarding when authenticated but without a Firestore profile", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: null,
      loading: false,
    });
    render(
      <ProtectedRoute>
        <p>Contenu protégé</p>
      </ProtectedRoute>
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/onboarding"));
  });

  it("redirects to /erreur?code=403 when the profile's role isn't allowed", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { role: "client" },
      loading: false,
    });
    render(
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        <p>Contenu protégé</p>
      </ProtectedRoute>
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/erreur?code=403")
    );
  });

  it("renders the children when authenticated with an allowed role", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { role: "admin" },
      loading: false,
    });
    render(
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        <p>Contenu protégé</p>
      </ProtectedRoute>
    );

    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders the children when authenticated and no role restriction applies", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { role: "client" },
      loading: false,
    });
    render(
      <ProtectedRoute>
        <p>Contenu protégé</p>
      </ProtectedRoute>
    );

    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
