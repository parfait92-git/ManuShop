import { render, screen, waitFor } from "@testing-library/react";

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";

describe("SuperAdminRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing while auth state is loading", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      isSuperAdmin: false,
      loading: true,
    });
    const { container } = render(
      <SuperAdminRoute>
        <p>Contenu Super Admin</p>
      </SuperAdminRoute>
    );

    expect(container).toBeEmptyDOMElement();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /catalogue when signed out (direct access, logout or expired session)", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      isSuperAdmin: false,
      loading: false,
    });
    render(
      <SuperAdminRoute>
        <p>Contenu Super Admin</p>
      </SuperAdminRoute>
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/catalogue"));
  });

  it("redirects to /erreur?code=403 when authenticated but not a Super Admin", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      isSuperAdmin: false,
      loading: false,
    });
    render(
      <SuperAdminRoute>
        <p>Contenu Super Admin</p>
      </SuperAdminRoute>
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/erreur?code=403")
    );
  });

  it("renders the children when authenticated as a Super Admin", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      isSuperAdmin: true,
      loading: false,
    });
    render(
      <SuperAdminRoute>
        <p>Contenu Super Admin</p>
      </SuperAdminRoute>
    );

    expect(screen.getByText("Contenu Super Admin")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
