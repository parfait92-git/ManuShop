import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const usePwaInstallMock = jest.fn();
jest.mock("../../hooks/usePwaInstall", () => ({
  usePwaInstall: () => usePwaInstallMock(),
}));

const isInstallPromptDismissedMock = jest.fn();
const dismissInstallPromptForSessionMock = jest.fn();
jest.mock("../../lib/pwaInstallDismissal", () => ({
  isInstallPromptDismissed: () => isInstallPromptDismissedMock(),
  dismissInstallPromptForSession: () => dismissInstallPromptForSessionMock(),
}));

import { InstallPrompt } from "@/components/pwa/InstallPrompt";

describe("InstallPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isInstallPromptDismissedMock.mockReturnValue(false);
  });

  it("renders nothing when there is no install path", () => {
    usePwaInstallMock.mockReturnValue({ platform: "none" });
    render(<InstallPrompt />);
    expect(screen.queryByText("Installer ManuShop")).not.toBeInTheDocument();
  });

  it("renders nothing when already dismissed for this session", () => {
    isInstallPromptDismissedMock.mockReturnValue(true);
    usePwaInstallMock.mockReturnValue({ platform: "ios" });
    render(<InstallPrompt />);
    expect(screen.queryByText("Installer ManuShop")).not.toBeInTheDocument();
  });

  it("shows manual instructions on iOS, without an Installer button", async () => {
    usePwaInstallMock.mockReturnValue({ platform: "ios" });
    render(<InstallPrompt />);

    expect(await screen.findByText("Installer ManuShop")).toBeInTheDocument();
    expect(screen.getByText(/Partager/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Installer" })
    ).not.toBeInTheDocument();
  });

  it("shows an Installer button on Android and triggers the native prompt", async () => {
    const promptInstall = jest.fn().mockResolvedValue(undefined);
    usePwaInstallMock.mockReturnValue({ platform: "android", promptInstall });
    const user = userEvent.setup();
    render(<InstallPrompt />);

    await user.click(
      await screen.findByRole("button", { name: "Installer" })
    );
    expect(promptInstall).toHaveBeenCalled();
  });

  it("dismisses the banner for the session when closed", async () => {
    usePwaInstallMock.mockReturnValue({ platform: "ios" });
    const user = userEvent.setup();
    render(<InstallPrompt />);

    await user.click(await screen.findByRole("button", { name: "Fermer" }));

    expect(dismissInstallPromptForSessionMock).toHaveBeenCalled();
    expect(screen.queryByText("Installer ManuShop")).not.toBeInTheDocument();
  });
});
