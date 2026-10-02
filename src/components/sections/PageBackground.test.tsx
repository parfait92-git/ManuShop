import { render } from "@testing-library/react";

import { PageBackground } from "./PageBackground";

describe("PageBackground", () => {
  it("renders a single <picture> so the browser downloads only the variant matching the screen (art direction)", () => {
    const { container } = render(<PageBackground />);

    expect(container.querySelectorAll("img")).toHaveLength(1);
    const sources = container.querySelectorAll("picture source");
    expect(sources).toHaveLength(2);
    expect(sources[0]).toHaveAttribute("media", "(min-width: 768px)");
    expect(sources[0].getAttribute("srcset")).toContain("manushop-web-bg.jpeg");
    expect(sources[1].getAttribute("srcset")).toContain("manushop-mobile-bg.jpeg");
  });

  it("loads the backdrop eagerly — it is visible on arrival, unlike every other (lazy) image", () => {
    const { container } = render(<PageBackground />);

    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("alt", "");
  });
});
