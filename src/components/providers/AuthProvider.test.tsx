jest.mock("../../lib/firebase", () => ({
  auth: { __tag: "primary" },
  db: { __tag: "db" },
}));

const getLocalSessionIdMock = jest.fn();
const createLocalSessionIdMock = jest.fn();
jest.mock("../../lib/sessionId", () => ({
  getLocalSessionId: (...args: unknown[]) => getLocalSessionIdMock(...args),
  createLocalSessionId: (...args: unknown[]) => createLocalSessionIdMock(...args),
}));

let onAuthStateChangedCallback: ((user: unknown) => void) | undefined;
const onAuthStateChangedMock = jest.fn((callback: (user: unknown) => void) => {
  onAuthStateChangedCallback = callback;
  return jest.fn();
});
const getUserProfileMock = jest.fn();
const updateProfileMock = jest.fn();
const logoutMock = jest.fn();
const addFavoriteMock = jest.fn();
const removeFavoriteMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    onAuthStateChanged: (...args: [(user: unknown) => void]) =>
      onAuthStateChangedMock(...args),
    getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
    logout: (...args: unknown[]) => logoutMock(...args),
    addFavorite: (...args: unknown[]) => addFavoriteMock(...args),
    removeFavorite: (...args: unknown[]) => removeFavoriteMock(...args),
  },
}));

const isSuperAdminMock = jest.fn();
jest.mock("../../services/PlatformAdminService", () => ({
  platformAdminService: { isSuperAdmin: (...args: unknown[]) => isSuperAdminMock(...args) },
}));

let snapshotCallback: ((snapshot: { data: () => unknown }) => void) | undefined;
const onSnapshotMock = jest.fn(
  (_ref: unknown, callback: (snapshot: { data: () => unknown }) => void) => {
    snapshotCallback = callback;
    return jest.fn();
  }
);
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({ __ref: "users/uid-1" })),
  onSnapshot: (...args: [unknown, (snapshot: { data: () => unknown }) => void]) =>
    onSnapshotMock(...args),
}));

const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastErrorMock(...args) } }));

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import type { User } from "@/models/user/User";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "uid-1",
    displayName: "Ada Diallo",
    role: "admin",
    createdAt: {} as never,
    ...overrides,
  };
}

function Probe() {
  const { profile, loading, isSuperAdmin, toggleFavorite } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="profile">{profile ? profile.displayName : "none"}</span>
      <span data-testid="super-admin">{String(isSuperAdmin)}</span>
      <span data-testid="favorites">
        {(profile?.favoriteProductIds ?? []).join(",")}
      </span>
      <button type="button" onClick={() => toggleFavorite("product-1")}>
        toggle
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onAuthStateChangedCallback = undefined;
    snapshotCallback = undefined;
    isSuperAdminMock.mockResolvedValue(false);
    updateProfileMock.mockResolvedValue(undefined);
    (auth as { currentUser: unknown }).currentUser = null;
  });

  async function triggerAuthState(user: unknown) {
    await act(async () => {
      onAuthStateChangedCallback?.(user);
    });
  }

  it("starts loading and resolves to signed-out when there is no Firebase user", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await triggerAuthState(null);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("profile")).toHaveTextContent("none");
  });

  it("loads the profile and super admin status for a signed-in user", async () => {
    getUserProfileMock.mockResolvedValue(fakeUser());
    isSuperAdminMock.mockResolvedValue(true);
    getLocalSessionIdMock.mockReturnValue("existing-session");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await triggerAuthState({ uid: "uid-1", email: "a@b.com" });

    await waitFor(() =>
      expect(screen.getByTestId("profile")).toHaveTextContent("Ada Diallo")
    );
    expect(screen.getByTestId("super-admin")).toHaveTextContent("true");
  });

  it("mints and saves a fresh session id when this browser has none yet", async () => {
    getUserProfileMock.mockResolvedValue(fakeUser());
    getLocalSessionIdMock.mockReturnValue(null);
    createLocalSessionIdMock.mockReturnValue("fresh-session-id");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await triggerAuthState({ uid: "uid-1", email: "a@b.com" });

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith("uid-1", {
        activeSessionId: "fresh-session-id",
      })
    );
  });

  it("waits for the session-id write to settle before arming the single-session listener (avoids a self-logout race)", async () => {
    getUserProfileMock.mockResolvedValue(fakeUser());
    getLocalSessionIdMock.mockReturnValue(null);
    createLocalSessionIdMock.mockReturnValue("fresh-session-id");

    let resolveUpdate: () => void = () => {};
    updateProfileMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    act(() => {
      onAuthStateChangedCallback?.({ uid: "uid-1", email: "a@b.com" });
    });

    // Les micro-tâches déjà planifiées (résolution de getUserProfile /
    // isSuperAdmin) ont le temps de s'exécuter, mais pas l'écriture
    // (volontairement non résolue ici) : si le listener démarrait avant que
    // cette écriture ne soit terminée, il pourrait voir l'ancien
    // `activeSessionId` (d'un autre navigateur) alors que `localSessionId`
    // est déjà le nouveau, et se déconnecter lui-même à tort.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onSnapshotMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });

    await waitFor(() => expect(onSnapshotMock).toHaveBeenCalled());
  });

  it("does not overwrite an existing local session id (page reload, or another tab)", async () => {
    getUserProfileMock.mockResolvedValue(fakeUser());
    getLocalSessionIdMock.mockReturnValue("existing-session");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await triggerAuthState({ uid: "uid-1", email: "a@b.com" });

    await waitFor(() =>
      expect(screen.getByTestId("profile")).toHaveTextContent("Ada Diallo")
    );
    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(createLocalSessionIdMock).not.toHaveBeenCalled();
  });

  it("force-logs-out and warns when the account's session id changes elsewhere", async () => {
    getUserProfileMock.mockResolvedValue(fakeUser());
    getLocalSessionIdMock.mockReturnValue("this-browser-session");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await triggerAuthState({ uid: "uid-1", email: "a@b.com" });
    await waitFor(() => expect(onSnapshotMock).toHaveBeenCalled());

    act(() => {
      snapshotCallback?.({ data: () => ({ activeSessionId: "another-browser-session" }) });
    });

    expect(logoutMock).toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it("does not log out when the session id snapshot still matches this browser", async () => {
    getUserProfileMock.mockResolvedValue(fakeUser());
    getLocalSessionIdMock.mockReturnValue("this-browser-session");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await triggerAuthState({ uid: "uid-1", email: "a@b.com" });
    await waitFor(() => expect(onSnapshotMock).toHaveBeenCalled());

    act(() => {
      snapshotCallback?.({ data: () => ({ activeSessionId: "this-browser-session" }) });
    });

    expect(logoutMock).not.toHaveBeenCalled();
  });

  describe("toggleFavorite (BF-129)", () => {
    it("adds a product optimistically and persists it", async () => {
      getUserProfileMock.mockResolvedValue(fakeUser());
      getLocalSessionIdMock.mockReturnValue("existing-session");
      addFavoriteMock.mockResolvedValue(undefined);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await triggerAuthState({ uid: "uid-1", email: "a@b.com" });
      await waitFor(() =>
        expect(screen.getByTestId("profile")).toHaveTextContent("Ada Diallo")
      );
      (auth as { currentUser: unknown }).currentUser = { uid: "uid-1" };

      fireEvent.click(screen.getByRole("button", { name: "toggle" }));

      // Optimiste : visible avant même que la promesse se résolve.
      expect(screen.getByTestId("favorites")).toHaveTextContent("product-1");
      await waitFor(() =>
        expect(addFavoriteMock).toHaveBeenCalledWith("uid-1", "product-1")
      );
    });

    it("removes an already-favorited product", async () => {
      getUserProfileMock.mockResolvedValue(
        fakeUser({ favoriteProductIds: ["product-1"] })
      );
      getLocalSessionIdMock.mockReturnValue("existing-session");
      removeFavoriteMock.mockResolvedValue(undefined);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await triggerAuthState({ uid: "uid-1", email: "a@b.com" });
      await waitFor(() =>
        expect(screen.getByTestId("favorites")).toHaveTextContent("product-1")
      );
      (auth as { currentUser: unknown }).currentUser = { uid: "uid-1" };

      fireEvent.click(screen.getByRole("button", { name: "toggle" }));

      expect(screen.getByTestId("favorites")).toHaveTextContent("");
      await waitFor(() =>
        expect(removeFavoriteMock).toHaveBeenCalledWith("uid-1", "product-1")
      );
    });

    it("reverts the optimistic update and warns on failure", async () => {
      getUserProfileMock.mockResolvedValue(fakeUser());
      getLocalSessionIdMock.mockReturnValue("existing-session");
      addFavoriteMock.mockRejectedValue(new Error("network"));
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await triggerAuthState({ uid: "uid-1", email: "a@b.com" });
      await waitFor(() =>
        expect(screen.getByTestId("profile")).toHaveTextContent("Ada Diallo")
      );
      (auth as { currentUser: unknown }).currentUser = { uid: "uid-1" };

      fireEvent.click(screen.getByRole("button", { name: "toggle" }));

      await waitFor(() =>
        expect(screen.getByTestId("favorites")).toHaveTextContent("")
      );
      expect(toastErrorMock).toHaveBeenCalled();
    });

    it("does nothing when nobody is signed in", async () => {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await triggerAuthState(null);

      fireEvent.click(screen.getByRole("button", { name: "toggle" }));

      expect(addFavoriteMock).not.toHaveBeenCalled();
      expect(removeFavoriteMock).not.toHaveBeenCalled();
    });
  });
});
