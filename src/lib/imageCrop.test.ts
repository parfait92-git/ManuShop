import { compressCanvas, cropImageToSquare } from "@/lib/imageCrop";

/** Canvas factice : `toBlob` renvoie un blob dont le type et la taille
 * sont décidés par `encode(type, quality)` — jsdom n'implémente pas
 * l'encodage d'image. */
function fakeCanvas(encode: (type: string, quality: number) => Blob) {
  const toBlob = jest.fn(
    (callback: BlobCallback, type: string, quality: number) =>
      callback(encode(type, quality))
  );
  return { canvas: { toBlob } as unknown as HTMLCanvasElement, toBlob };
}

function blobOf(size: number, type: string): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

describe("compressCanvas", () => {
  it("encodes in WebP at the first quality when already under the size target", async () => {
    const { canvas, toBlob } = fakeCanvas((type) => blobOf(1000, type));

    const blob = await compressCanvas(canvas, 5000);

    expect(blob.type).toBe("image/webp");
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(toBlob.mock.calls[0][2]).toBe(0.82);
  });

  it("lowers the quality until the blob fits under the size target", async () => {
    const { canvas, toBlob } = fakeCanvas((type, quality) =>
      blobOf(Math.round(quality * 10000), type)
    );

    const blob = await compressCanvas(canvas, 6500);

    expect(blob.size).toBeLessThanOrEqual(6500);
    expect(toBlob.mock.calls.map((call) => call[2])).toEqual([0.82, 0.72, 0.62]);
  });

  it("keeps the lowest quality rather than failing when the target is unreachable", async () => {
    const { canvas, toBlob } = fakeCanvas((type) => blobOf(9000, type));

    const blob = await compressCanvas(canvas, 100);

    expect(blob.size).toBe(9000);
    expect(toBlob).toHaveBeenCalledTimes(4);
    expect(toBlob.mock.calls[3][2]).toBe(0.5);
  });

  it("falls back to JPEG when the browser silently returns PNG for WebP (old Safari)", async () => {
    const { canvas, toBlob } = fakeCanvas((type) =>
      type === "image/webp" ? blobOf(50000, "image/png") : blobOf(1000, type)
    );

    const blob = await compressCanvas(canvas, 5000);

    expect(blob.type).toBe("image/jpeg");
    expect(toBlob.mock.calls.map((call) => call[1])).toEqual([
      "image/webp",
      "image/jpeg",
    ]);
  });

  it("rejects when the browser fails to encode", async () => {
    const { canvas } = fakeCanvas(() => null as unknown as Blob);

    await expect(compressCanvas(canvas, 5000)).rejects.toThrow(
      "Échec du recadrage"
    );
  });
});

describe("cropImageToSquare", () => {
  const originalImage = global.Image;
  const originalCreateElement = document.createElement.bind(document);

  afterEach(() => {
    global.Image = originalImage;
    jest.restoreAllMocks();
  });

  it("draws the crop into a size×size canvas and compresses it under the product target by default", async () => {
    // Image qui se « charge » dès que `src` est posé.
    global.Image = class {
      private listeners: Record<string, () => void> = {};
      addEventListener(event: string, listener: () => void) {
        this.listeners[event] = listener;
      }
      set src(_value: string) {
        queueMicrotask(() => this.listeners.load?.());
      }
    } as unknown as typeof Image;

    const drawImage = jest.fn();
    const { canvas, toBlob } = fakeCanvas((type) => blobOf(1000, type));
    Object.assign(canvas, { getContext: () => ({ drawImage }) });
    jest
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) =>
        tag === "canvas" ? canvas : originalCreateElement(tag)
      );

    const blob = await cropImageToSquare(
      "blob:photo",
      { x: 10, y: 20, width: 300, height: 300 },
      512
    );

    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      10,
      20,
      300,
      300,
      0,
      0,
      512,
      512
    );
    expect(blob.type).toBe("image/webp");
    expect(toBlob).toHaveBeenCalledTimes(1);
  });
});
