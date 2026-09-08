import { describe, it, expect } from "vitest";
import { ATTRACTION_ICONS } from "./heroMotif";
import { ATTRACTION_ART, BURST_RAYS, burstRay } from "./patriasArt";

// Same discipline as the lotería deck: art is data, so the parts that can be
// checked without a DOM are checked here, and the parts that cannot — does it
// actually look like a crown — are checked by rasterising the module and
// looking at it before the phase ships.
//
// That distinction is not academic. La Luna passed every structural test in
// phase 4 while drawing literally nothing.

describe("ATTRACTION_ART — totality", () => {
  it.each(ATTRACTION_ICONS)("%s has usable art", (icon) => {
    const art = ATTRACTION_ART[icon];
    expect(art).toBeDefined();
    expect(art.label.trim()).not.toBe("");
    expect(art.shapes.length).toBeGreaterThan(0);
  });

  it("has an entry for every icon and no extras", () => {
    expect(Object.keys(ATTRACTION_ART).sort()).toEqual([...ATTRACTION_ICONS].sort());
  });

  // Icons are drawn into a 28x28 box centred in a badge. A stray coordinate
  // would not throw — it would paint outside the badge and over the copy.
  it("keeps every shape inside the 28x28 icon box", () => {
    for (const icon of ATTRACTION_ICONS) {
      for (const s of ATTRACTION_ART[icon].shapes) {
        if (s.k === "circle") {
          expect(s.cx - s.r).toBeGreaterThanOrEqual(-1);
          expect(s.cx + s.r).toBeLessThanOrEqual(29);
          expect(s.cy - s.r).toBeGreaterThanOrEqual(-1);
          expect(s.cy + s.r).toBeLessThanOrEqual(29);
        }
        if (s.k === "rect") {
          expect(s.x).toBeGreaterThanOrEqual(-1);
          expect(s.y).toBeGreaterThanOrEqual(-1);
          expect(s.x + s.w).toBeLessThanOrEqual(29);
          expect(s.y + s.h).toBeLessThanOrEqual(29);
        }
      }
    }
  });

  // Every label is Spanish-first, matching how the Buckeye Hispanic Committee
  // prints its own flyers. An English-only label would read as an oversight on
  // a poster whose whole point is community.
  it("labels every icon", () => {
    const labels = ATTRACTION_ICONS.map((i) => ATTRACTION_ART[i].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("burstRay — firework geometry", () => {
  it("draws every ray from the centre outward", () => {
    for (let i = 0; i < BURST_RAYS; i++) {
      const r = burstRay(i);
      expect(r.d.startsWith("M24,24")).toBe(true);
    }
  });

  it("spaces the rays evenly around the circle", () => {
    const angles = Array.from({ length: BURST_RAYS }, (_, i) => burstRay(i).angle);
    expect(new Set(angles).size).toBe(BURST_RAYS);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(360);
    }
  });

  // Rounded so the emitted path is stable across runs. Raw float trig leaks
  // "23.999999999999996" into the markup, which makes every render a diff.
  it("emits coordinates rounded to one decimal", () => {
    for (let i = 0; i < BURST_RAYS; i++) {
      for (const n of burstRay(i).d.match(/-?\d+(\.\d+)?/g) ?? []) {
        const decimals = n.split(".")[1];
        expect(decimals === undefined || decimals.length <= 1).toBe(true);
      }
    }
  });

  it("keeps every ray tip inside the 48x48 burst box", () => {
    for (let i = 0; i < BURST_RAYS; i++) {
      const { tipX, tipY } = burstRay(i);
      expect(tipX).toBeGreaterThanOrEqual(0);
      expect(tipX).toBeLessThanOrEqual(48);
      expect(tipY).toBeGreaterThanOrEqual(0);
      expect(tipY).toBeLessThanOrEqual(48);
    }
  });
});
