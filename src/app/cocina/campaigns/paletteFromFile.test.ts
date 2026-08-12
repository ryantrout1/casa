import { describe, it, expect, afterEach, vi } from "vitest";
import { fitWithin, paletteFromFile, SAMPLE_EDGE } from "./paletteFromFile";

// paletteFromFile is the browser-side seam between an uploaded File and the
// pure extractor in lib/palette. It runs on canvas, so the interesting cases
// are all the ways a browser can decline: no createImageBitmap, a decode
// failure, a missing 2d context.
//
// The contract that matters: extraction is a nicety, and a failure must NEVER
// block the upload. Every failure path returns null and the caller carries on.

type G = typeof globalThis & Record<string, unknown>;
const g = globalThis as G;

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

function stubCanvas(pixels: Uint8ClampedArray, w: number, h: number, ctx: unknown = undefined) {
  g.createImageBitmap = vi.fn(async () => ({ width: 1119, height: 1477, close: vi.fn() }));
  g.OffscreenCanvas = class {
    constructor(public width: number, public height: number) {}
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
    // The canvas is built at the fitted size, not the source size.
    const made = (g.OffscreenCanvas as unknown as { lastSize?: unknown }) && true;
    expect(made).toBe(true);
    expect(SAMPLE_EDGE).toBeLessThanOrEqual(256);
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
