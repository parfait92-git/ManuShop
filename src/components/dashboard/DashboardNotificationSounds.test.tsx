const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const useDashboardNotificationSoundsMock = jest.fn();
jest.mock("../../hooks/useDashboardNotificationSounds", () => ({
  useDashboardNotificationSounds: (...args: unknown[]) =>
    useDashboardNotificationSoundsMock(...args),
}));

import { render } from "@testing-library/react";

import { DashboardNotificationSounds } from "./DashboardNotificationSounds";

describe("DashboardNotificationSounds", () => {
  it("wires the current shop's id into the sound hook and renders nothing", () => {
    useAuthMock.mockReturnValue({ profile: { shopId: "shop-1" } });

    const { container } = render(<DashboardNotificationSounds />);

    expect(useDashboardNotificationSoundsMock).toHaveBeenCalledWith("shop-1");
    expect(container).toBeEmptyDOMElement();
  });

  it("passes undefined when there is no profile yet", () => {
    useAuthMock.mockReturnValue({ profile: undefined });

    render(<DashboardNotificationSounds />);

    expect(useDashboardNotificationSoundsMock).toHaveBeenCalledWith(undefined);
  });
});
