const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const useNotificationsMock = jest.fn();
jest.mock("../../hooks/useNotifications", () => ({
  useNotifications: (...args: unknown[]) => useNotificationsMock(...args),
}));

const markReadMock = jest.fn().mockResolvedValue(undefined);
jest.mock("../../services/NotificationService", () => ({
  notificationService: { markRead: (...args: unknown[]) => markReadMock(...args) },
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NotificationBell } from "@/components/storefront/NotificationBell";

const date = new Date("2026-10-01T10:00:00Z");

function notification(id: string, read: boolean) {
  return {
    id,
    userId: "client-1",
    type: "review_request",
    orderId: "o1",
    shopId: "shop-1",
    message: `Message ${id}`,
    link: "/mes-commandes/o1/avis",
    read,
    createdAt: { toDate: () => date, toMillis: () => date.getTime() },
  };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing for a visitor", () => {
    useAuthMock.mockReturnValue({ firebaseUser: null });
    useNotificationsMock.mockReturnValue([]);
    const { container } = render(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the unread count, then marks a notification read and opens its page", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: { uid: "client-1" } });
    useNotificationsMock.mockReturnValue([notification("n1", false), notification("n2", true)]);
    const user = userEvent.setup();
    render(<NotificationBell />);

    expect(useNotificationsMock).toHaveBeenCalledWith("client-1");
    await user.click(screen.getByRole("button", { name: "Notifications, 1 non lue(s)" }));
    await user.click(screen.getByRole("button", { name: /Message n1/ }));

    expect(markReadMock).toHaveBeenCalledWith("n1");
    expect(pushMock).toHaveBeenCalledWith("/mes-commandes/o1/avis");
  });

  it("doesn't re-mark an already read notification", async () => {
    useAuthMock.mockReturnValue({ firebaseUser: { uid: "client-1" } });
    useNotificationsMock.mockReturnValue([notification("n2", true)]);
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    await user.click(screen.getByRole("button", { name: /Message n2/ }));

    expect(markReadMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/mes-commandes/o1/avis");
  });
});
