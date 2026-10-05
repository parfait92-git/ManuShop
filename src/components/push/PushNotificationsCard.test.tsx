// jsdom n'a pas `PointerEvent`, qu'utilise l'interrupteur de Base UI.
if (!("PointerEvent" in window)) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class extends MouseEvent {};
}

let mockRole = "admin";
jest.mock("../providers/AuthProvider", () => ({ useAuth: () => ({ profile: { role: mockRole } }) }));
const availabilityMock = jest.fn();
jest.mock("../../lib/push", () => ({ pushAvailability: () => availabilityMock() }));
const enableMock = jest.fn();
const disableMock = jest.fn(async () => undefined);
const sendTestMock = jest.fn();
const isEnabledHereMock = jest.fn(() => false);
jest.mock("../../services/PushService", () => ({
  pushService: {
    enable: () => enableMock(),
    disable: () => disableMock(),
    sendTest: () => sendTestMock(),
    isEnabledHere: () => isEnabledHereMock(),
  },
}));
const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PushNotificationsCard } from "./PushNotificationsCard";

const setPermission = (permission: NotificationPermission) => {
  (window as unknown as { Notification: { permission: NotificationPermission } }).Notification = { permission };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = "admin";
  setPermission("default");
  isEnabledHereMock.mockReturnValue(false);
});

describe("PushNotificationsCard", () => {
  it("explains what a merchant receives, and turns notifications on for this device", async () => {
    availabilityMock.mockResolvedValue("available");
    enableMock.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<PushNotificationsCard />);

    expect(screen.getByText(/les nouvelles commandes, les stocks qui baissent/)).toBeInTheDocument();
    await user.click(await screen.findByRole("switch", { name: "Recevoir les notifications sur cet appareil" }));

    expect(enableMock).toHaveBeenCalled();
    expect(await screen.findByRole("switch", { checked: true })).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith("Notifications activées sur cet appareil.");

    sendTestMock.mockResolvedValue(1);
    await user.click(screen.getByRole("button", { name: /notification d'essai/ }));
    expect(toastSuccess).toHaveBeenCalledWith("Notification d'essai envoyée.");
  });

  it("tells how to unblock notifications refused in the browser", async () => {
    availabilityMock.mockResolvedValue("available");
    enableMock.mockImplementation(async () => {
      setPermission("denied");
      return false;
    });
    const user = userEvent.setup();
    render(<PushNotificationsCard />);
    await user.click(await screen.findByRole("switch", { name: "Recevoir les notifications sur cet appareil" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Les notifications sont bloquées pour ManuShop.");
  });

  it("turns them off", async () => {
    availabilityMock.mockResolvedValue("available");
    isEnabledHereMock.mockReturnValue(true);
    setPermission("granted");
    const user = userEvent.setup();
    render(<PushNotificationsCard />);
    await user.click(await screen.findByRole("switch", { name: "Recevoir les notifications sur cet appareil" }));
    expect(disableMock).toHaveBeenCalled();
    expect(await screen.findByRole("switch", { checked: false })).toBeInTheDocument();
  });

  it.each([
    ["install-required", /installez|installée/],
    ["not-configured", /pas encore disponibles/],
    ["unsupported", /ne permet pas les notifications/],
  ])("explains why they can't be turned on (%s)", async (availability, text) => {
    availabilityMock.mockResolvedValue(availability);
    render(<PushNotificationsCard />);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("tells a client what they receive", async () => {
    mockRole = "client";
    availabilityMock.mockResolvedValue("available");
    render(<PushNotificationsCard />);
    expect(screen.getByText(/le suivi de vos commandes/)).toBeInTheDocument();
    await screen.findByRole("switch");
  });
});
