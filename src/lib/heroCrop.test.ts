import { describe, it, expect } from "vitest";
import {
  ART_ASPECT,
  ART_WIDTH_PCT,
  MIN_CONSTANT_WIDTH,
  MIN_SECTION_H,
  SECTION_ASPECT,
  heroCrop,
} from "./heroCrop";

// The bug this module exists to prevent, stated once:
//
// The hero used a FIXED height (540px) against a FLUID art column (60% of the
// viewport). Cover-cropping a portrait poster into that window means the
// visible fraction of the poster changes with the browser width — a 1745px
// monitor saw 34% of the flyer, a 1280px laptop saw 47%. The same page showed
// different amounts of the artwork to different people, and hero_focus
// therefore meant something different for every visitor.
//
// Deriving the height from the width makes the fraction constant. That is an
// arithmetic property, so it is pinned here rather than left as a CSS value
// nobody re-checks.

/** The two aspect ratios actually present in Casa's flyer library. */
const TWO_THIRDS = 427 / 640; // Lotería Sept 9, Fiestas Patrias
const THREE_QUARTERS = 1119 / 1477; // El Palomazo, Lotería July 30

const DESKTOPS = [1745, 1600, 1440, 1366, 1280, 1120];

describe("heroCrop — the constant-fraction invariant", () => {
  it.each([
    ["2:3 flyer", TWO_THIRDS],
    ["3:4 flyer", THREE_QUARTERS],
  ])("%s shows the same fraction at every desktop width", (_label, ratio) => {
    const fractions = DESKTOPS.map((w) => heroCrop(w, ratio).visibleFraction);
    for (const f of fractions) {
      expect(f).toBeCloseTo(fractions[0], 3);
    }
  });

  it("shows about half of a 2:3 poster", () => {
    expect(heroCrop(1745, TWO_THIRDS).visibleFraction).toBeCloseTo(0.5, 2);
  });

  // A squarer poster fits more of itself into the same window. Not a defect —
  // worth pinning so a future flyer ratio does not silently change framing.
  it("shows more of a squarer 3:4 poster", () => {
    const a = heroCrop(1745, TWO_THIRDS).visibleFraction;
    const b = heroCrop(1745, THREE_QUARTERS).visibleFraction;
    expect(b).toBeGreaterThan(a);
    // 0.568 — matches the 57% measured when these four flyers were rendered.
    expect(b).toBeCloseTo(0.57, 2);
  });

  // The regression that started all of this. Kept as an explicit contrast so
  // nobody reintroduces a fixed height thinking it is equivalent.
  it("beats a fixed 540px height, which is viewport-dependent", () => {
    const fixed = (w: number) => {
      const regionW = w * 0.6;
      return 540 / (regionW / TWO_THIRDS);
    };
    expect(fixed(1745)).toBeCloseTo(0.34, 2);
    expect(fixed(1280)).toBeCloseTo(0.47, 2);
    expect(Math.abs(fixed(1745) - fixed(1280))).toBeGreaterThan(0.1);
  });
});

describe("heroCrop — geometry", () => {
  it("derives the section height from the art column, not the viewport", () => {
    const { regionW, regionH } = heroCrop(1745, TWO_THIRDS);
    expect(regionW).toBeCloseTo(1745 * ART_WIDTH_PCT, 3);
    expect(regionH).toBeCloseTo(regionW * ART_ASPECT, 3);
  });

  it("SECTION_ASPECT reproduces the same height from the viewport alone", () => {
    // This is the number the CSS actually carries, so it has to agree with the
    // module or the stylesheet and the tests describe different layouts.
    for (const w of DESKTOPS) {
      expect(w / SECTION_ASPECT).toBeCloseTo(heroCrop(w, TWO_THIRDS).regionH, 3);
    }
  });

  it("never reports more than the whole poster", () => {
    expect(heroCrop(400, TWO_THIRDS).visibleFraction).toBeLessThanOrEqual(1);
    expect(heroCrop(200, THREE_QUARTERS).visibleFraction).toBeLessThanOrEqual(1);
  });
});

// Below a certain width the derived height gets too short to hold the copy
// block, so a floor takes over — and the floor necessarily breaks the constant
// fraction. Stating where that happens beats discovering it on a laptop.
describe("heroCrop — the small-desktop floor", () => {
  it("holds the floor rather than collapsing the section", () => {
    expect(heroCrop(900, TWO_THIRDS).regionH).toBe(MIN_SECTION_H);
  });

  it("switches over exactly at MIN_CONSTANT_WIDTH", () => {
    expect(MIN_CONSTANT_WIDTH).toBeCloseTo(MIN_SECTION_H / (ART_WIDTH_PCT * ART_ASPECT), 6);
    expect(heroCrop(MIN_CONSTANT_WIDTH, TWO_THIRDS).regionH).toBeCloseTo(MIN_SECTION_H, 3);
    expect(heroCrop(MIN_CONSTANT_WIDTH - 100, TWO_THIRDS).regionH).toBe(MIN_SECTION_H);
  });

  it("shows MORE of the poster below the floor, never less", () => {
    const above = heroCrop(1440, TWO_THIRDS).visibleFraction;
    const below = heroCrop(950, TWO_THIRDS).visibleFraction;
    expect(below).toBeGreaterThan(above);
  });
});
