import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { ProductImageLightbox } from "@/components/storefront/ProductImageLightbox";

// jsdom n'a pas `PointerEvent` : sans lui, `pointerType` et `clientX` sont perdus.
class TestPointerEvent extends MouseEvent {
  pointerType: string;
  constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? "mouse";
  }
}
beforeAll(() => {
  (window as unknown as { PointerEvent: unknown }).PointerEvent = TestPointerEvent;
});

const images = ["https://picsum.photos/a.jpg", "https://picsum.photos/b.jpg", "https://picsum.photos/c.jpg"];
const alts = ["Photo 1", "Photo 2", "Photo 3"];

function Harness({ start = 0, onClose = jest.fn() }: { start?: number | null; onClose?: () => void }) {
  const [index, setIndex] = useState<number | null>(start);
  return (
    <ProductImageLightbox
      images={images}
      alts={alts}
      index={index}
      onIndexChange={setIndex}
      onClose={() => {
        setIndex(null);
        onClose();
      }}
      title="Mielle"
    />
  );
}

const shown = () => screen.getByRole("button", { name: /Zoomer|Dézoomer/ }).querySelector("img");

describe("ProductImageLightbox", () => {
  it("shows the chosen photo full screen, with its position", () => {
    render(<Harness start={1} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Mielle");
    expect(shown()).toHaveAttribute("alt", "Photo 2");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("moves to the next and previous photo, wrapping around, by button and keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness start={2} />);

    await user.click(screen.getByRole("button", { name: "Photo suivante" }));
    expect(shown()).toHaveAttribute("alt", "Photo 1");
    await user.click(screen.getByRole("button", { name: "Photo précédente" }));
    expect(shown()).toHaveAttribute("alt", "Photo 3");

    fireEvent.keyDown(screen.getByRole("button", { name: "Photo suivante" }), { key: "ArrowRight" });
    expect(shown()).toHaveAttribute("alt", "Photo 1");
    fireEvent.keyDown(screen.getByRole("button", { name: "Photo suivante" }), { key: "ArrowLeft" });
    expect(shown()).toHaveAttribute("alt", "Photo 3");
  });

  it("jumps to a photo from its thumbnail", async () => {
    const user = userEvent.setup();
    render(<Harness start={0} />);
    await user.click(screen.getByRole("button", { name: "Voir la photo 3" }));
    expect(shown()).toHaveAttribute("alt", "Photo 3");
    expect(screen.getByRole("button", { name: "Voir la photo 3" })).toHaveAttribute("aria-current", "true");
  });

  it("zooms in and out on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Zoomer sur la photo" }));
    expect(shown()?.style.transform).toBe("scale(2.5)");
    await user.click(screen.getByRole("button", { name: "Dézoomer" }));
    expect(shown()?.style.transform).toBe("");
  });

  it("changes photo on a finger swipe, without zooming", () => {
    render(<Harness start={0} />);
    const area = screen.getByRole("button", { name: "Zoomer sur la photo" });
    fireEvent.pointerDown(area, { pointerType: "touch", clientX: 300 });
    fireEvent.pointerUp(area, { pointerType: "touch", clientX: 150 });
    fireEvent.click(screen.getByRole("button", { name: "Zoomer sur la photo" }));
    expect(shown()).toHaveAttribute("alt", "Photo 2");
    expect(shown()?.style.transform).toBe("");
  });

  it("lets the photo follow the finger, and springs back on a short swipe", () => {
    render(<Harness start={0} />);
    const area = screen.getByRole("button", { name: "Zoomer sur la photo" });
    const follower = () => area.parentElement!.parentElement as HTMLElement;

    fireEvent.pointerDown(area, { pointerType: "touch", clientX: 300 });
    fireEvent.pointerMove(area, { pointerType: "touch", clientX: 270 });
    expect(follower().style.transform).toBe("translateX(-30px)");

    fireEvent.pointerUp(area, { pointerType: "touch", clientX: 270 });
    expect(follower().style.transform).toBe("");
    expect(shown()).toHaveAttribute("alt", "Photo 1");
  });

  it("slides the new photo in from the side it comes from", async () => {
    const user = userEvent.setup();
    render(<Harness start={1} />);
    const slide = () => screen.getByRole("button", { name: "Zoomer sur la photo" }).parentElement as HTMLElement;

    await user.click(screen.getByRole("button", { name: "Photo suivante" }));
    expect(slide().className).toContain("slide-in-from-right");
    await user.click(screen.getByRole("button", { name: "Photo précédente" }));
    expect(slide().className).toContain("slide-in-from-left");
    await user.click(screen.getByRole("button", { name: "Voir la photo 3" }));
    expect(slide().className).toContain("slide-in-from-right");
  });

  it("closes", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("hides the arrows and counter for a single photo", () => {
    render(<ProductImageLightbox images={[images[0]]} alts={[alts[0]]} index={0} onIndexChange={jest.fn()} onClose={jest.fn()} title="Mielle" />);
    expect(screen.queryByRole("button", { name: "Photo suivante" })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });
});
