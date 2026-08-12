import { extractPalette, type Palette } from "./palette";

// The browser-side seam between an uploaded flyer and the pure extractor in
// lib/palette. Extraction happens here, on canvas, rather than on the server:
// the composer already holds the File before uploading it, so there is no
// second network round-trip, no serverless CPU, and no image-decoding
// dependency in package.json.
//
// The governing rule is that extraction is a convenience. A browser that
// cannot decode the image, cannot give us a 2d context, or refuses
// getImageData must not stop the admin from publishing — every failure path
// returns null and the caller uploads exactly as it did before.

// Longest edge, in pixels, that we sample. A flyer's palette is a property of
// its large flat areas, not its detail, so a thumbnail is not merely adequate
// — it is better, because JPEG ringing around type averages out. 96px keeps
// the whole scan comfortably under a millisecond.
export const SAMPLE_EDGE = 96;

/**
 * Scale a width/height down so its longest edge is at most `edge`, preserving
 * aspect ratio. Never returns a zero dimension — a canvas of width 0 throws in
 * some browsers and silently yields an empty buffer in others.
 */
export function fitWithin(
  width: number,
  height: number,
  edge: number,
): { w: number; h: number } {
  const w0 = Number.isFinite(width) && width > 0 ? width : 1;
  const h0 = Number.isFinite(height) && height > 0 ? height : 1;
  const scale = Math.min(1, edge / Math.max(w0, h0));
  return {
    w: Math.max(1, Math.round(w0 * scale)),
    h: Math.max(1, Math.round(h0 * scale)),
  };
}

type Ctx2D = {
  drawImage: (img: unknown, x: number, y: number, w: number, h: number) => void;
  getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray };
};

// OffscreenCanvas where available, a detached <canvas> otherwise. Returns null
// in any environment with neither (SSR, older Safari, a test runner).
function makeCanvas(w: number, h: number): { getContext: (t: "2d") => unknown } | null {
  const OC = (globalThis as Record<string, unknown>).OffscreenCanvas as
    | (new (w: number, h: number) => { getContext: (t: "2d") => unknown })
    | undefined;
  if (typeof OC === "function") return new OC(w, h);

  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    return el;
  }
  return null;
}

/**
 * Decode an uploaded flyer and derive a hero palette from it.
 * Returns null on any failure — never throws, never blocks the upload.
 */
export async function paletteFromFile(file: File): Promise<Palette | null> {
  try {
    const decode = (globalThis as Record<string, unknown>).createImageBitmap as
      | ((f: File) => Promise<{ width: number; height: number; close?: () => void }>)
      | undefined;
    if (typeof decode !== "function") return null;

    const bitmap = await decode(file);
    const { w, h } = fitWithin(bitmap.width, bitmap.height, SAMPLE_EDGE);

    const canvas = makeCanvas(w, h);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d") as Ctx2D | null;
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Free the decoded bitmap promptly — a 1119x1477 flyer is ~6MB in memory
    // and the admin may replace it several times in one session.
    bitmap.close?.();

    return extractPalette(data, w, h);
  } catch {
    return null;
  }
}
