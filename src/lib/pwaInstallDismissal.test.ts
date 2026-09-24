import {
  dismissInstallPromptForSession,
  isInstallPromptDismissed,
} from "@/lib/pwaInstallDismissal";

describe("pwaInstallDismissal", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("is not dismissed by default", () => {
    expect(isInstallPromptDismissed()).toBe(false);
  });

  it("remembers a dismissal for the session", () => {
    dismissInstallPromptForSession();
    expect(isInstallPromptDismissed()).toBe(true);
  });

  it("fails silently when sessionStorage throws (private browsing)", () => {
    const spy = jest
      .spyOn(window.sessionStorage.__proto__, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });

    expect(isInstallPromptDismissed()).toBe(false);
    spy.mockRestore();
  });
});
