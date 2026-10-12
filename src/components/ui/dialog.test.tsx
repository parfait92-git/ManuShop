import { render, screen } from "@testing-library/react";

import { Dialog, DialogPortal, DialogTitle } from "./dialog";

describe("DialogPortal", () => {
  // Signalé par l'utilisateur (2026-10-12) : sur téléphone, l'étape 4 de
  // « Créer ma boutique » dépassait l'écran sans pouvoir défiler.
  it("never grows taller than the screen, and scrolls inside when its content is long", () => {
    render(
      <Dialog open>
        <DialogPortal>
          <DialogTitle>Créer ma boutique</DialogTitle>
        </DialogPortal>
      </Dialog>
    );
    const popup = screen.getByRole("dialog");
    expect(popup.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(popup.className).toContain("overflow-y-auto");
  });
});
