import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom n'implémente pas PointerEvent, dont Base UI (Switch) a besoin pour
// son gestionnaire de clic — voir ShopSettingsForm.test.tsx/CategoryManager.test.tsx.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId = 1;
    width = 1;
    height = 1;
    pressure = 0.5;
    tangentialPressure = 0;
    tiltX = 0;
    tiltY = 0;
    twist = 0;
    pointerType = "mouse";
    isPrimary = true;
    constructor(type: string, params: MouseEventInit = {}) {
      super(type, params);
    }
  }
  // @ts-expect-error -- polyfill réservé à l'environnement de test
  window.PointerEvent = PointerEventPolyfill;
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

import type { User } from "@/models/user/User";

const refreshProfileMock = jest.fn();
let mockFirebaseUser: { providerData: { providerId: string }[] } | null = {
  providerData: [{ providerId: "password" }],
};
let mockProfile: User | null = null;
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({
    firebaseUser: mockFirebaseUser,
    profile: mockProfile,
    refreshProfile: refreshProfileMock,
  }),
}));

const updateProfileMock = jest.fn();
const sendPasswordResetMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
    sendPasswordReset: (...args: unknown[]) => sendPasswordResetMock(...args),
  },
}));

jest.mock("../dashboard/ImageCropDialog", () => ({
  ImageCropDialog: () => <div data-testid="image-crop-dialog" />,
}));

// `@/lib/upload` importe `@/lib/firebase` (SDK Firebase réel) — inutile ici,
// l'upload lui-même est déjà couvert par `upload.test.ts`.
jest.mock("../../lib/upload", () => ({ uploadAvatar: jest.fn() }));

const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

import { AccountSettingsForm } from "@/components/account/AccountSettingsForm";

function fakeProfile(overrides: Partial<User> = {}): User {
  return {
    id: "uid-1",
    displayName: "Ada Diallo",
    role: "client",
    email: "ada@example.com",
    createdAt: {
      toDate: () => new Date("2026-01-15T00:00:00Z"),
    } as never,
    ...overrides,
  };
}

describe("AccountSettingsForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseUser = { providerData: [{ providerId: "password" }] };
    mockProfile = fakeProfile();
  });

  it("shows a loading state until the profile is available", () => {
    mockProfile = null;
    render(<AccountSettingsForm />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("pre-fills the form with the current profile", () => {
    render(<AccountSettingsForm />);
    expect(screen.getByLabelText("Nom")).toHaveValue("Ada Diallo");
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
  });

  it("saves the updated profile and refreshes it", async () => {
    updateProfileMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AccountSettingsForm />);

    await user.clear(screen.getByLabelText("Nom"));
    await user.type(screen.getByLabelText("Nom"), "Ada K. Diallo");
    await user.click(screen.getByRole("button", { name: /Enregistrer/ }));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith(
        "uid-1",
        expect.objectContaining({ displayName: "Ada K. Diallo" })
      )
    );
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(await screen.findByText("Profil mis à jour.")).toBeInTheDocument();
  });

  it("submits notifyByEmail: false after toggling the switch off", async () => {
    updateProfileMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AccountSettingsForm />);

    await user.click(screen.getByLabelText("Notifications par email"));
    await user.click(screen.getByRole("button", { name: /Enregistrer/ }));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith(
        "uid-1",
        expect.objectContaining({ notifyByEmail: false })
      )
    );
  });

  it("shows the password reset action for an email/password account and sends the reset email", async () => {
    sendPasswordResetMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AccountSettingsForm />);

    await user.click(
      screen.getByRole("button", { name: /Changer le mot de passe/ })
    );

    expect(sendPasswordResetMock).toHaveBeenCalledWith("ada@example.com");
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  });

  it("hides the password reset action for a social sign-in account", () => {
    mockFirebaseUser = { providerData: [{ providerId: "google.com" }] };
    render(<AccountSettingsForm />);

    expect(
      screen.queryByRole("button", { name: /Changer le mot de passe/ })
    ).not.toBeInTheDocument();
  });
});
