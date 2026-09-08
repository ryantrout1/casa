import type { LoteriaCard } from "./heroMotif";
import type { Shape } from "./motifShapes";

// The lotería deck, described rather than drawn.
//
// Each card is data: a number, a name, a panel colour, and a short list of
// primitive shapes laid out in a 66x66 art panel. The component turns that into
// SVG. Keeping it as data is what makes the deck testable at all — this repo
// has no jsdom, so anything expressed as JSX could only ever be verified by
// looking at the page.
//
// Colours here are CANONICAL and never come from the row's palette. A lotería
// card is a known image: El Sol is a yellow face on pale sky, La Luna is gold
// on night navy, and that is what makes them readable at a glance from across
// the room. Tinting them to match a flyer would make El Sol stop being El Sol.
// PapelPicado recolours per fiesta precisely because it carries no such
// meaning; the deck is the opposite case, and the two should not be unified.
//
// Fidelity ceiling: these are schematics, not illustrations. Every card reads
// at 110px wide on a phone. If a shape needs more than a handful of segments,
// it is overshooting — a recognisable silhouette beats an accurate contour.

// Re-exported so existing importers keep working; the definition now lives in
// motifShapes, shared with every other motif's art.
export type { Shape };

export type CardArt = {
  /** The number printed in the card's top-left corner. */
  n: number;
  /** The name on the plate along the bottom. */
  name: string;
  /** The art panel's ground. */
  panel: string;
  shapes: Shape[];
};

/**
 * Typed as a total Record on purpose. Adding a name to LOTERIA_CARDS without
 * adding art here fails the typecheck, which is a better guard than any test:
 * the alternative is an optional lookup and a card that silently does not draw.
 */
export const LOTERIA_DECK: Record<LoteriaCard, CardArt> = {
  el_sol: {
    n: 46,
    name: "EL SOL",
    panel: "#bfe4f2",
    shapes: [
      { k: "path", d: "M33,10 L33,2 M33,64 L33,56 M10,33 L2,33 M56,33 L64,33", stroke: "#e8a020", w: 3 },
      { k: "path", d: "M17,17 L11,11 M49,49 L55,55 M49,17 L55,11 M17,49 L11,55", stroke: "#e8a020", w: 3 },
      { k: "circle", cx: 33, cy: 33, r: 17, fill: "#f5c518" },
      { k: "circle", cx: 27, cy: 29, r: 2, fill: "#8a5a10" },
      { k: "circle", cx: 39, cy: 29, r: 2, fill: "#8a5a10" },
      { k: "path", d: "M25,39 q8,7 16,0", stroke: "#8a5a10", w: 2 },
    ],
  },
  la_rosa: {
    n: 41,
    name: "LA ROSA",
    panel: "#fdf4e0",
    shapes: [
      { k: "circle", cx: 33, cy: 24, r: 14, fill: "#d8324a" },
      { k: "circle", cx: 27, cy: 19, r: 8, fill: "#b02038" },
      { k: "circle", cx: 38, cy: 27, r: 7, fill: "#e8556a" },
      { k: "path", d: "M33,38 L33,60", stroke: "#2e7d4f", w: 3 },
      { k: "path", d: "M33,46 q-14,-4 -17,-13 q12,-1 17,9 Z", fill: "#2e7d4f" },
      { k: "path", d: "M33,53 q14,-4 17,-13 q-12,-1 -17,9 Z", fill: "#2e7d4f" },
    ],
  },
  la_luna: {
    n: 23,
    name: "LA LUNA",
    panel: "#1f3a63",
    shapes: [
      // Carved from two circles rather than drawn as one path. The obvious
      // version — two arcs sharing both endpoints — is degenerate and renders
      // as nothing at all, which is how this shipped invisible the first time.
      // The carving circle has to match the panel exactly.
      { k: "circle", cx: 36, cy: 33, r: 21, fill: "#f2c94c" },
      { k: "circle", cx: 25, cy: 27, r: 19, fill: "#1f3a63" },
      { k: "circle", cx: 13, cy: 14, r: 1.8, fill: "#fdf6e4" },
      { k: "circle", cx: 17, cy: 50, r: 1.6, fill: "#fdf6e4" },
      { k: "circle", cx: 8, cy: 34, r: 1.2, fill: "#fdf6e4" },
      { k: "circle", cx: 55, cy: 55, r: 1.4, fill: "#fdf6e4" },
    ],
  },
  la_mano: {
    n: 21,
    name: "LA MANO",
    panel: "#4a90d9",
    shapes: [
      { k: "rect", x: 24, y: 30, w: 24, h: 30, rx: 8, fill: "#e8913c" },
      { k: "rect", x: 24, y: 12, w: 6, h: 22, rx: 3, fill: "#e8913c" },
      { k: "rect", x: 32, y: 8, w: 6, h: 26, rx: 3, fill: "#e8913c" },
      { k: "rect", x: 40, y: 11, w: 6, h: 23, rx: 3, fill: "#e8913c" },
      { k: "rect", x: 15, y: 35, w: 10, h: 6, rx: 3, fill: "#e8913c" },
    ],
  },
  el_corazon: {
    n: 27,
    name: "EL CORAZÓN",
    panel: "#fdf4e0",
    shapes: [
      { k: "path", d: "M33,58 q-20,-14 -20,-29 q0,-13 11,-13 q6,0 9,7 q3,-7 9,-7 q11,0 11,13 q0,15 -20,29 Z", fill: "#c0392b" },
      // A highlight, not vessels. The first attempt drew two curved stubs out
      // of the top of the heart and they read unmistakably as horns.
      { k: "path", d: "M24,20 q-3,7 1,14", stroke: "#e8556a", w: 2.5 },
    ],
  },
  la_chalupa: {
    n: 48,
    name: "LA CHALUPA",
    panel: "#8fc4d8",
    shapes: [
      { k: "rect", x: 0, y: 42, w: 66, h: 24, fill: "#3f8fa8" },
      // Ripples, to stop the water reading as a flat band.
      { k: "path", d: "M4,52 q6,-3 12,0 q6,3 12,0", stroke: "#7fc0d4", w: 1.6 },
      { k: "path", d: "M38,58 q6,-3 12,0 q6,3 12,0", stroke: "#7fc0d4", w: 1.6 },
      // The passenger is gone. A blob with a cone for a head read as neither a
      // person nor a boat; the flower-laden hull alone is what makes the card
      // recognisable, so it gets the whole panel.
      { k: "path", d: "M5,40 q28,24 56,0 q-7,18 -28,18 q-21,0 -28,-18 Z", fill: "#8a5a2e" },
      { k: "path", d: "M5,40 q28,24 56,0", stroke: "#5e3a1c", w: 2 },
      { k: "circle", cx: 20, cy: 36, r: 5, fill: "#e8437c" },
      { k: "circle", cx: 33, cy: 32, r: 5.5, fill: "#f5c518" },
      { k: "circle", cx: 46, cy: 36, r: 5, fill: "#d8324a" },
      { k: "path", d: "M33,26 l0,-8", stroke: "#2e7d4f", w: 2 },
    ],
  },
  la_sirena: {
    n: 6,
    name: "LA SIRENA",
    panel: "#4a90d9",
    shapes: [
      { k: "rect", x: 0, y: 44, w: 66, h: 22, fill: "#2f6fae" },
      { k: "path", d: "M4,50 q7,-3 14,0 q7,3 14,0", stroke: "#7fb4e0", w: 1.6 },
      // Hair first, so the head sits on top of it and the fringe reads.
      { k: "path", d: "M20,22 q0,-19 13,-19 q13,0 13,19 q-3,-5 -6,-6 q-7,4 -14,0 q-4,1 -6,6 Z", fill: "#2c1a10" },
      { k: "circle", cx: 33, cy: 15, r: 7.5, fill: "#c9945a" },
      { k: "path", d: "M27,22 q6,-3 12,0 q2,9 -1,16 l-10,0 q-3,-7 -1,-16 Z", fill: "#c9945a" },
      // The tail carries the card. The first version was a thin sliver at the
      // bottom edge and read as a smudge; it now runs half the panel.
      { k: "path", d: "M28,38 l10,0 q5,12 -5,20 q-10,-8 -5,-20 Z", fill: "#3fbfb5" },
      { k: "path", d: "M33,56 q-11,-1 -14,8 q9,3 14,-3 q5,6 14,3 q-3,-9 -14,-8 Z", fill: "#2aa89e" },
    ],
  },
  el_gallo: {
    n: 1,
    name: "EL GALLO",
    panel: "#f2c94c",
    shapes: [
      { k: "path", d: "M24,52 q-7,-18 5,-29 q2,-11 12,-10 q-4,6 0,9 q11,5 11,18 q0,12 -10,12 Z", fill: "#e6e0d0" },
      { k: "path", d: "M39,15 q4,-9 10,-7 q-2,5 2,6 q-5,4 -12,1 Z", fill: "#d42b2b" },
      { k: "circle", cx: 43, cy: 20, r: 1.6, fill: "#2c1a10" },
      { k: "path", d: "M24,52 l-5,9 M32,52 l0,10", stroke: "#c9922b", w: 2.5 },
      { k: "path", d: "M18,38 q-8,-6 -6,-14 q7,3 8,11 Z", fill: "#d42b2b" },
    ],
  },
};

/**
 * Deal the chosen cards into the two groups that flank the headline.
 *
 * Odd counts lean left — 3 becomes 2 and 1. Visibly asymmetric, but the cards
 * are tilted anyway so it reads as deliberate, and 2 or 4 is the natural pick.
 *
 * Order is preserved across the split so the admin's checkbox order is the
 * order that appears on the page, reading left to right.
 */
export function splitCards(cards: LoteriaCard[]): {
  left: LoteriaCard[];
  right: LoteriaCard[];
} {
  const mid = Math.ceil(cards.length / 2);
  return { left: cards.slice(0, mid), right: cards.slice(mid) };
}
