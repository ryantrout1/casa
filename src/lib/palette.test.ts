import { describe, it, expect } from "vitest";
import {
  extractPalette,
  relativeLuminance,
  contrastRatio,
  pickInk,
  CREAM,
  NAVY,
  FALLBACK_BG,
  FALLBACK_ACCENT,
  type Palette,
} from "./palette";

// The hero takeover borrows its colours from Stephanie's flyer. Extraction runs
// client-side on a canvas, so this module takes a raw RGBA pixel array rather
// than an image — which is also what makes it testable without a DOM.
//
// The contrast floor is the load-bearing rule: an extracted palette that reads
// beautifully as swatches can still render unreadable type, so pickInk and the
// accent guard both enforce WCAG AA (4.5:1) before anything reaches the page.

const AA = 4.5;

// Build an RGBA buffer from a list of [r,g,b] rows, each repeated `count` times.
function px(...runs: [number[], number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [[r, g, b], count] of runs) {
    for (let i = 0; i < count; i++) out.push(r, g, b, 255);
  }
  return new Uint8ClampedArray(out);
}

const solid = (rgb: number[], n = 64) => px([rgb, n]);

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("ranks a light colour above a dark one", () => {
    expect(relativeLuminance("#fdf4e3")).toBeGreaterThan(relativeLuminance("#140c06"));
  });

  it("accepts uppercase hex", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(relativeLuminance("#ffffff"), 5);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 1 for a colour against itself", () => {
    expect(contrastRatio("#e0218a", "#e0218a")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#140c06", "#ffbf1f")).toBeCloseTo(
      contrastRatio("#ffbf1f", "#140c06"),
      5,
    );
  });

  it("confirms the current hardcoded hero pair already passes AA", () => {
    // Cream on the existing #140c06 ground — the fallback must not be a
    // regression from what ships today.
    expect(contrastRatio(CREAM, FALLBACK_BG)).toBeGreaterThanOrEqual(AA);
  });
});

describe("pickInk", () => {
  it("picks cream on a dark ground", () => {
    expect(pickInk("#140c06")).toBe(CREAM);
  });

  it("picks navy on a light ground", () => {
    expect(pickInk("#fdf4e3")).toBe(NAVY);
  });

  it("always returns an ink that clears AA against the background", () => {
    const grounds = [
      "#000000", "#ffffff", "#808080", "#7f7f7f", "#e0218a", "#16a89e",
      "#ffbf1f", "#1f3a63", "#140c06", "#fdf4e3", "#8246af", "#f47b20",
    ];
    for (const bg of grounds) {
      expect(contrastRatio(pickInk(bg), bg)).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe("extractPalette", () => {
  it("returns the dominant colour as the background for a solid image", () => {
    const p = extractPalette(solid([20, 12, 6]), 8, 8);
    expect(relativeLuminance(p.bg)).toBeLessThan(0.1);
  });

  it("prefers a saturated brand colour over a muddy majority as the accent", () => {
    // Two-thirds dark brown, one-third magenta. Brown wins the ground;
    // magenta must win the accent — frequency alone would pick brown twice.
    const p = extractPalette(px([[26, 16, 8], 128], [[224, 33, 138], 64]), 12, 16);
    expect(p.accent).not.toBe(p.bg);
    expect(relativeLuminance(p.accent)).toBeGreaterThan(relativeLuminance(p.bg));
  });

  it("returns a light background for a light-dominant flyer", () => {
    // The Lotería case: bright cream ground must not come back near-black.
    const p = extractPalette(px([[253, 244, 227], 160], [[224, 33, 138], 32]), 12, 16);
    expect(relativeLuminance(p.bg)).toBeGreaterThan(0.5);
    expect(p.ink).toBe(NAVY);
  });

  it("emits between 2 and 5 swatches, bg and accent among them", () => {
    const p = extractPalette(
      px([[26, 16, 8], 64], [[224, 33, 138], 48], [[22, 168, 158], 32], [[255, 191, 31], 16]),
      10,
      16,
    );
    expect(p.swatches.length).toBeGreaterThanOrEqual(2);
    expect(p.swatches.length).toBeLessThanOrEqual(5);
    expect(p.swatches).toContain(p.bg);
    expect(p.swatches).toContain(p.accent);
  });

  it("always emits valid 6-digit lowercase hex", () => {
    const p = extractPalette(px([[26, 16, 8], 96], [[224, 33, 138], 32]), 8, 16);
    const hex = /^#[0-9a-f]{6}$/;
    expect(p.bg).toMatch(hex);
    expect(p.accent).toMatch(hex);
    expect(p.ink).toMatch(hex);
    for (const s of p.swatches) expect(s).toMatch(hex);
  });

  it("never returns an accent that fails AA against its own background", () => {
    // Pathological inputs: monochrome and near-monochrome images have no
    // usable accent, so the guard must substitute rather than emit mud.
    const cases: Uint8ClampedArray[] = [
      solid([0, 0, 0]),
      solid([255, 255, 255]),
      solid([128, 128, 128]),
      px([[130, 130, 130], 64], [[126, 126, 126], 64]),
      px([[10, 10, 12], 96], [[14, 12, 10], 32]),
    ];
    for (const buf of cases) {
      const p = extractPalette(buf, 8, buf.length / 4 / 8);
      expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(AA);
    }
  });

  it("falls back to the shipped hero colours for an empty buffer", () => {
    const p = extractPalette(new Uint8ClampedArray(0), 0, 0);
    expect(p.bg).toBe(FALLBACK_BG);
    expect(p.accent).toBe(FALLBACK_ACCENT);
    expect(p.ink).toBe(CREAM);
  });

  it("ignores fully transparent pixels", () => {
    // A PNG flyer with transparent margins must not average toward black.
    const buf = new Uint8ClampedArray([
      255, 255, 255, 0,
      255, 255, 255, 0,
      224, 33, 138, 255,
      224, 33, 138, 255,
    ]);
    const p = extractPalette(buf, 2, 2);
    expect(p.bg).toBe("#e0218a");
  });

  it("is deterministic — same pixels, same palette", () => {
    const buf = px([[26, 16, 8], 64], [[224, 33, 138], 32], [[22, 168, 158], 16]);
    const a: Palette = extractPalette(buf, 8, 14);
    const b: Palette = extractPalette(buf, 8, 14);
    expect(a).toEqual(b);
  });
});
