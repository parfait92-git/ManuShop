import { isOptimizableImage } from "@/lib/imageHosts";

describe("isOptimizableImage", () => {
  it("optimizes images hosted on an allow-listed domain (Cloudinary upload, Google avatar)", () => {
    expect(
      isOptimizableImage("https://res.cloudinary.com/demo/image/upload/logo.webp")
    ).toBe(true);
    expect(isOptimizableImage("https://lh3.googleusercontent.com/a/photo")).toBe(true);
  });

  it("optimizes local static images", () => {
    expect(isOptimizableImage("/images/manushop-web-bg.jpeg")).toBe(true);
  });

  it("leaves arbitrary external links unoptimized (next/image would reject them)", () => {
    expect(isOptimizableImage("https://example.com/logo.png")).toBe(false);
    expect(isOptimizableImage("http://res.cloudinary.com/logo.png")).toBe(false);
    expect(isOptimizableImage("pas une url")).toBe(false);
  });
});
