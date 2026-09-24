import { act, renderHook, waitFor } from "@testing-library/react";

import { usePwaInstall } from "@/hooks/usePwaInstall";

function mockMatchMedia(matches: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches });
}

function mockUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";

describe("usePwaInstall", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockUserAgent(ANDROID_UA);
    Object.defineProperty(window.navigator, "standalone", {
      value: undefined,
      configurable: true,
    });
  });

  it("reports no install path by default (desktop/unsupported browser)", () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.platform).toBe("none");
  });

  it("stays 'none' when the app is already running standalone", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.platform).toBe("none");
  });

  it("reports 'ios' on iPhone Safari, which has no install prompt API", async () => {
    mockUserAgent(IOS_UA);
    const { result } = renderHook(() => usePwaInstall());
    await waitFor(() => expect(result.current.platform).toBe("ios"));
  });

  it("captures beforeinstallprompt and exposes a promptInstall() that resolves after the native choice", async () => {
    const { result } = renderHook(() => usePwaInstall());

    const promptMock = jest.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    const preventDefaultSpy = jest.spyOn(event, "preventDefault");

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(result.current.platform).toBe("android");

    const state = result.current;
    if (state.platform !== "android") throw new Error("unreachable");
    await act(async () => {
      await state.promptInstall();
    });

    expect(promptMock).toHaveBeenCalled();
    expect(result.current.platform).toBe("none");
  });

  it("resets to 'none' when the browser fires appinstalled", () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event("beforeinstallprompt"), {
          prompt: jest.fn(),
          userChoice: Promise.resolve({ outcome: "accepted" as const }),
        })
      );
    });
    expect(result.current.platform).toBe("android");

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.platform).toBe("none");
  });
});
