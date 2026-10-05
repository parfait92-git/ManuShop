const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const markTourSeenMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: {
    markTourSeen: (...args: unknown[]) => markTourSeenMock(...args),
  },
}));

// `react-joyride` lui-même est couvert par GuidedTour.test.tsx (et lent sous
// jsdom) : ici, seul compte ce que PageTour lui passe.
// Préfixe `mock` : seule variable externe que Jest autorise dans une fabrique
// `jest.mock` (hoistée au-dessus des imports).
let mockLastSteps: Record<string, unknown>[] = [];
jest.mock("./GuidedTour", () => ({
  GuidedTour: ({
    steps,
    onFinish,
  }: {
    steps: { target: string; content: string }[];
    onFinish: (skipped: boolean) => void;
  }) => {
    mockLastSteps = steps;
    return (
      <div data-testid="tour">
        {steps.map((step) => (
          <p key={step.content} data-target={step.target}>
            {step.content}
          </p>
        ))}
        <button type="button" onClick={() => onFinish(false)}>
          fake-finish
        </button>
        <button type="button" onClick={() => onFinish(true)}>
          fake-skip
        </button>
      </div>
    );
  },
}));

jest.mock("./tours", () => ({
  REPLAY_HINT_STEP: { target: "tour-replay", content: "Revoir ici" },
  TOURS: {
    "test-tour": [
      { target: "center", content: "Bienvenue" },
      { target: "first", content: "Premier élément" },
      { target: "admin-only", content: "Réservé gérant", roles: ["admin"] },
      { target: "missing", content: "Jamais affiché" },
    ],
  },
}));

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PageTour } from "./PageTour";
import { TourProvider } from "./TourProvider";
import { TourReplayButton } from "./TourReplayButton";

function fakeProfile(overrides: Record<string, unknown> = {}) {
  return { id: "u1", role: "admin", seenTours: ["other-tour"], ...overrides };
}

function renderPage(autoStart = true) {
  return render(
    <TourProvider>
      <TourReplayButton />
      <div data-tour="first">cible</div>
      <div data-tour="admin-only">cible gérant</div>
      <PageTour tourId={"test-tour" as never} autoStart={autoStart} />
    </TourProvider>
  );
}

async function waitForTargets() {
  await act(async () => {
    jest.advanceTimersByTime(6000);
  });
  jest.useRealTimers();
}

describe("PageTour", () => {
  const refreshProfileMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    markTourSeenMock.mockResolvedValue(undefined);
  });

  function signedIn(profile: Record<string, unknown> | null, loading = false) {
    useAuthMock.mockReturnValue({
      profile,
      loading,
      refreshProfile: refreshProfileMock,
    });
  }

  it("runs automatically on a first visit, keeping only the steps whose target is on the page", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile());
    renderPage();
    // La cible "missing" n'apparaît jamais : on attend le délai maximal.
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    jest.useRealTimers();

    expect(await screen.findByText("Bienvenue")).toBeInTheDocument();
    expect(screen.getByText("Premier élément")).toBeInTheDocument();
    expect(screen.getByText("Réservé gérant")).toBeInTheDocument();
    expect(screen.queryByText("Jamais affiché")).not.toBeInTheDocument();
  });

  it("never passes undefined placement/title keys to react-joyride (they override its defaults and crash the tooltip)", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile());
    renderPage();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    jest.useRealTimers();

    await screen.findByTestId("tour");
    for (const step of mockLastSteps) {
      for (const value of Object.values(step)) expect(value).not.toBeUndefined();
    }
  });

  it("leaves out steps reserved to another role", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile({ role: "seller" }));
    renderPage();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    jest.useRealTimers();

    expect(await screen.findByText("Premier élément")).toBeInTheDocument();
    expect(screen.queryByText("Réservé gérant")).not.toBeInTheDocument();
  });

  it("does not run once already seen on the account, nor while auth is still loading", async () => {
    signedIn(fakeProfile({ seenTours: ["test-tour"] }));
    const { unmount } = renderPage();
    await act(async () => {});
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
    unmount();

    signedIn(null, true);
    renderPage();
    await act(async () => {});
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
  });

  it("marks the tour as seen on the account once finished", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile());
    renderPage();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    jest.useRealTimers();

    await userEvent.click(await screen.findByRole("button", { name: "fake-finish" }));

    expect(markTourSeenMock).toHaveBeenCalledWith("u1", "test-tour");
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
  });

  it("remembers a signed-out visitor's tour in the browser instead", async () => {
    jest.useFakeTimers();
    signedIn(null);
    window.localStorage.setItem("manushop:seen-tours", JSON.stringify(["other-tour"]));
    renderPage();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    jest.useRealTimers();

    await userEvent.click(await screen.findByRole("button", { name: "fake-finish" }));

    expect(markTourSeenMock).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem("manushop:seen-tours")!)).toEqual([
      "other-tour",
      "test-tour",
    ]);
  });

  it("stops every automatic tour once the user taps « Passer »", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile());
    renderPage();
    await waitForTargets();

    await userEvent.click(await screen.findByRole("button", { name: "fake-skip" }));
    expect(markTourSeenMock).toHaveBeenCalledWith("u1", "*");
  });

  it("no longer starts any tour by itself after « Passer », on the account or in the browser", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile({ seenTours: ["*"] }));
    renderPage();
    await waitForTargets();
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();

    // Visiteur : même règle, dans le navigateur.
    jest.useFakeTimers();
    signedIn(null);
    window.localStorage.setItem("manushop:seen-tours", JSON.stringify(["*"]));
    renderPage();
    await waitForTargets();
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
  });

  it("counts the tours seen before signing in: signing in doesn't replay them", async () => {
    jest.useFakeTimers();
    window.localStorage.setItem("manushop:seen-tours", JSON.stringify(["test-tour"]));
    signedIn(fakeProfile({ seenTours: [] }));
    renderPage();
    await waitForTargets();
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
  });

  it("never starts by itself when told not to (purchase flow), but can still be replayed", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile({ seenTours: [] }));
    renderPage(false);
    await waitForTargets();
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();

    jest.useFakeTimers();
    act(() => {
      screen.getByRole("button", { name: /visite/i }).click();
    });
    await waitForTargets();
    expect(await screen.findByTestId("tour")).toBeInTheDocument();
  });

  it("ends the very first tour ever with a hint showing where to replay it", async () => {
    jest.useFakeTimers();
    signedIn(fakeProfile({ seenTours: [] }));
    renderPage();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    jest.useRealTimers();

    expect(await screen.findByText("Revoir ici")).toBeInTheDocument();
  });

  it("can be replayed from the header button even once seen, without marking it again", async () => {
    signedIn(fakeProfile({ seenTours: ["test-tour"] }));
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Revoir la visite guidée de cette page" })
    );
    await waitFor(() => expect(screen.getByTestId("tour")).toBeInTheDocument(), {
      timeout: 7000,
    });

    await user.click(screen.getByRole("button", { name: "fake-finish" }));
    expect(markTourSeenMock).not.toHaveBeenCalled();
  }, 15000);
});
