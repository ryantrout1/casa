import { describe, it, expect, afterEach, vi } from "vitest";
import { fitWithin, paletteFromFile, SAMPLE_EDGE } from "./paletteFromFile";

// paletteFromFile is the browser-side seam between an uploaded File and the
// pure extractor in lib/palette. It runs on canvas, so the interesting cases
// are all the ways a browser can decline: no createImageBitmap, a decode
// failure, a missing 2d context.
//
// The contract that matters: extraction is a nicety, and a failure must NEVER
// block the upload. Every failure path returns null and the caller carries on.

// Cast through unknown: the DOM lib types for createImageBitmap and
// OffscreenCanvas are far richer than the slice this module uses, and the
// stubs only need to satisfy that slice.
const g = globalThis as unknown as Record<string, unknown>;

const original = {
  createImageBitmap: g.createImageBitmap,
  OffscreenCanvas: g.OffscreenCanvas,
};

afterEach(() => {
  g.createImageBitmap = original.createImageBitmap;
  g.OffscreenCanvas = original.OffscreenCanvas;
  vi.restoreAllMocks();
});

// A stand-in File — nothing reads its bytes, the stubbed decoder does.
const fakeFile = () => ({ type: "image/jpeg", size: 1000, name: "flyer.jpg" }) as unknown as File;

// Build an RGBA buffer of one solid colour.
function solid(rgb: [number, number, number], count: number): Uint8ClampedArray {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(rgb[0], rgb[1], rgb[2], 255);
  return new Uint8ClampedArray(out);
}

// Records the size every canvas is constructed at, so a test can prove the
// module sampled a thumbnail rather than the full-resolution flyer.
const sizes: { w: number; h: number }[] = [];

function stubCanvas(pixels: Uint8ClampedArray, w: number, h: number, ctx: unknown = undefined) {
  sizes.length = 0;
  g.createImageBitmap = vi.fn(async () => ({ width: 1119, height: 1477, close: vi.fn() }));
  g.OffscreenCanvas = class {
    constructor(width: number, height: number) {
      sizes.push({ w: width, h: height });
    }
    getContext() {
      return ctx === undefined
        ? { drawImage: vi.fn(), getImageData: () => ({ data: pixels, width: w, height: h }) }
        : ctx;
    }
  };
}

describe("fitWithin", () => {
  it("leaves an already-small image alone", () => {
    expect(fitWithin(40, 50, 96)).toEqual({ w: 40, h: 50 });
  });

  it("scales a portrait flyer to fit the long edge", () => {
    // 1119x1477 is the real Palomazo flyer.
    const { w, h } = fitWithin(1119, 1477, 96);
    expect(h).toBe(96);
    expect(w).toBe(73);
  });

  it("scales a landscape image on its width", () => {
    const { w, h } = fitWithin(2000, 1000, 100);
    expect(w).toBe(100);
    expect(h).toBe(50);
  });

  it("never returns a zero dimension", () => {
    const { w, h } = fitWithin(4000, 1, 96);
    expect(w).toBeGreaterThanOrEqual(1);
    expect(h).toBeGreaterThanOrEqual(1);
  });

  it("handles degenerate input without throwing", () => {
    expect(fitWithin(0, 0, 96)).toEqual({ w: 1, h: 1 });
  });
});

describe("paletteFromFile", () => {
  it("returns a palette sampled from the decoded pixels", async () => {
    stubCanvas(solid([26, 16, 8], 64), 8, 8);
    const p = await paletteFromFile(fakeFile());
    expect(p).not.toBeNull();
    expect(p!.bg).toMatch(/^#[0-9a-f]{6}$/);
    expect(p!.swatches.length).toBeGreaterThanOrEqual(2);
  });

  it("downsamples rather than reading the full flyer", async () => {
    stubCanvas(solid([26, 16, 8], 64), 8, 8);
    await paletteFromFile(fakeFile());
    // The stubbed bitmap reports the real Palomazo dimensions; the canvas must
    // be built at the fitted thumbnail size, not 1119x1477.
    expect(sizes).toHaveLength(1);
    expect(Math.max(sizes[0].w, sizes[0].h)).toBe(SAMPLE_EDGE);
    expect(sizes[0]).toEqual({ w: 73, h: 96 });
  });

  it("returns null when the browser has no createImageBitmap", async () => {
    g.createImageBitmap = undefined;
    expect(await paletteFromFile(fakeFile())).toBeNull();
  });

  it("returns null when decoding throws", async () => {
    g.createImageBitmap = vi.fn(async () => {
      throw new Error("unsupported image");
    });
    g.OffscreenCanvas = class {
      getContext() {
        return null;
      }
    };
    expect(await paletteFromFile(fakeFile())).toBeNull();
  });

  it("returns null when there is no 2d context", async () => {
    stubCanvas(solid([26, 16, 8], 64), 8, 8, null);
    expect(await paletteFromFile(fakeFile())).toBeNull();
  });

  it("returns null when getImageData throws (tainted or oversized canvas)", async () => {
    g.createImageBitmap = vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() }));
    g.OffscreenCanvas = class {
      getContext() {
        return {
          drawImage: vi.fn(),
          getImageData: () => {
            throw new Error("SecurityError");
          },
        };
      }
    };
    expect(await paletteFromFile(fakeFile())).toBeNull();
  });

  it("returns null in a non-browser environment with no canvas at all", async () => {
    g.createImageBitmap = vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() }));
    g.OffscreenCanvas = undefined;
    expect(await paletteFromFile(fakeFile())).toBeNull();
  });
});
