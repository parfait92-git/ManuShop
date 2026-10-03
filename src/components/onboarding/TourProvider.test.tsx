import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";

import { Dialog, DialogPortal, DialogTitle } from "@/components/ui/dialog";

import { TourProvider, useTour } from "./TourProvider";

function Registers({ name, onStart }: { name: string; onStart: (name: string) => void }) {
  const { register } = useTour();
  useEffect(() => register(() => onStart(name)), [register, name, onStart]);
  return null;
}

function ReplayButton() {
  const { replay } = useTour();
  return (
    <button type="button" onClick={replay}>
      replay
    </button>
  );
}

describe("TourProvider", () => {
  it("replays the most recently registered tour — a dialog's over its page's — and falls back once it unmounts", async () => {
    const onStart = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TourProvider>
        <Registers name="page" onStart={onStart} />
        <Registers name="dialog" onStart={onStart} />
        <ReplayButton />
      </TourProvider>
    );

    await user.click(screen.getByRole("button", { name: "replay" }));
    expect(onStart).toHaveBeenLastCalledWith("dialog");

    rerender(
      <TourProvider>
        <Registers name="page" onStart={onStart} />
        <ReplayButton />
      </TourProvider>
    );
    await user.click(screen.getByRole("button", { name: "replay" }));
    expect(onStart).toHaveBeenLastCalledWith("page");
  });
});

/** Simule une visite affichée tant que `running` est vrai. */
function RunningTour({ running }: { running: boolean }) {
  const { markRunning } = useTour();
  useEffect(() => (running ? markRunning() : undefined), [running, markRunning]);
  return null;
}

describe("Dialog pendant une visite guidée", () => {
  function renderDialog(running: boolean, onOpenChange: jest.Mock) {
    return render(
      <TourProvider>
        <RunningTour running={running} />
        <Dialog open onOpenChange={onOpenChange}>
          <DialogPortal>
            <DialogTitle>Fenêtre</DialogTitle>
          </DialogPortal>
        </Dialog>
      </TourProvider>
    );
  }

  it("closes on Escape as usual when no tour is running", async () => {
    const onOpenChange = jest.fn();
    renderDialog(false, onOpenChange);
    await act(async () => {});

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("ignores close requests while a tour is running — Escape also quits the tour, and its tooltip lives outside the dialog", async () => {
    const onOpenChange = jest.fn();
    renderDialog(true, onOpenChange);
    await act(async () => {});

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
