import type { AttractionIcon } from "./heroMotif";
import type { Shape } from "./motifShapes";

// Art for a Fiestas Patrias–style community poster: firework bursts flanking
// the headline, and a row of badges naming what is actually happening at the
// event — live music, folklórico, the crowning, the grito.
//
// Unlike the lotería deck, this art IS palette-driven. A firework has no
// canonical colour, so taking the flyer's is right; a lotería card does, which
// is why El Sol stays yellow no matter what the poster looks like. The two
// rules are opposites on purpose and should not be unified.

export type IconArt = {
  /** Printed under the badge. Spanish-first, as the Committee prints its own. */
  label: string;
  /** Drawn in a 28x28 box, centred in the badge. */
  shapes: Shape[];
};

/** How many rays a burst throws. Eight reads as a firework; more reads as a blur. */
export const BURST_RAYS = 8;

const BURST_BOX = 48;
const CENTRE = BURST_BOX / 2;
const INNER = 5;
const OUTER = 21;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * One ray of a firework burst, as a line from the centre outward plus the tip
 * where its spark sits.
 *
 * Coordinates are rounded to one decimal so the emitted path is byte-stable.
 * Raw trig leaks values like 23.999999999999996 into the markup, which makes
 * every server render differ from the last for no reason.
 */
export function burstRay(i: number): {
  angle: number;
  d: string;
  tipX: number;
  tipY: number;
} {
  const angle = (360 / BURST_RAYS) * i;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const tipX = round1(CENTRE + dx * OUTER);
  const tipY = round1(CENTRE + dy * OUTER);
  return {
    angle,
    d: `M${CENTRE},${CENTRE} L${tipX},${tipY}`,
    tipX,
    tipY,
  };
}

/** The inner radius rays start from, for the component's spark placement. */
export const BURST_INNER = INNER;

/**
 * Typed as a total Record so adding a name to ATTRACTION_ICONS without adding
 * art fails the typecheck rather than rendering an empty badge.
 */
export const ATTRACTION_ART: Record<AttractionIcon, IconArt> = {
  music: {
    label: "Música en vivo",
    shapes: [
      { k: "path", d: "M10,20 L10,6 L22,3 L22,17", stroke: "currentColor", w: 2.2 },
      { k: "circle", cx: 7, cy: 20, r: 4, fill: "currentColor" },
      { k: "circle", cx: 19, cy: 17, r: 4, fill: "currentColor" },
    ],
  },
  dancers: {
    label: "Folklórico",
    shapes: [
      { k: "circle", cx: 14, cy: 5, r: 3.4, fill: "currentColor" },
      // Skirt: the silhouette that makes it read as folklórico rather than
      // just "a person".
      { k: "path", d: "M14,9 L21,25 L7,25 Z", fill: "currentColor" },
      { k: "path", d: "M14,12 L24,8 M14,12 L4,8", stroke: "currentColor", w: 2.2 },
    ],
  },
  chinelos: {
    label: "Chinelos",
    shapes: [
      // A tall cone, not a dome. The first version curved the crown and read
      // unmistakably as a lampshade; height is what makes it a chinelo hat.
      { k: "path", d: "M14,1 L22,13 L6,13 Z", fill: "currentColor" },
      { k: "rect", x: 3, y: 13, w: 22, h: 3, rx: 1.5, fill: "currentColor" },
      { k: "circle", cx: 14, cy: 21, r: 5.5, fill: "currentColor" },
    ],
  },
  crown: {
    label: "Reina de Oro",
    shapes: [
      { k: "path", d: "M4,22 L6,7 L11,14 L14,4 L17,14 L22,7 L24,22 Z", fill: "currentColor" },
      { k: "rect", x: 4, y: 23, w: 20, h: 3.5, rx: 1.5, fill: "currentColor" },
    ],
  },
  grito: {
    label: "El Grito",
    shapes: [
      // A bell — the grito is rung, and a bell reads at 28px where a shouting
      // figure does not.
      { k: "path", d: "M6,20 q0,-14 8,-14 q8,0 8,14 Z", fill: "currentColor" },
      { k: "rect", x: 4, y: 20, w: 20, h: 3, rx: 1.5, fill: "currentColor" },
      { k: "circle", cx: 14, cy: 25, r: 2.4, fill: "currentColor" },
      { k: "circle", cx: 14, cy: 4, r: 2, fill: "currentColor" },
    ],
  },
  vendors: {
    label: "Vendedores",
    shapes: [
      // Scalloped awning over a counter on two posts. The first version painted
      // white stripes onto a cream fill — invisible — and the solid body then
      // read as an open box rather than a stall. Gaps between scallops give the
      // stripes for free, with no cutout colour to get wrong.
      { k: "rect", x: 1, y: 6, w: 26, h: 3, rx: 1.5, fill: "currentColor" },
      { k: "path", d: "M2,9 l5.5,0 l-2.75,5 Z M9,9 l5.5,0 l-2.75,5 Z M16,9 l5.5,0 l-2.75,5 Z", fill: "currentColor" },
      { k: "rect", x: 2, y: 17, w: 24, h: 3, rx: 1.2, fill: "currentColor" },
      { k: "rect", x: 4, y: 20, w: 2.5, h: 7, fill: "currentColor" },
      { k: "rect", x: 21.5, y: 20, w: 2.5, h: 7, fill: "currentColor" },
    ],
  },
  food: {
    label: "Comida",
    shapes: [
      // The shell is an outline, not a fill. Filled, it was a solid dome with
      // two dots on it and read as an igloo; leaving it open lets the filling
      // sit visibly inside the way an actual taco does.
      { k: "path", d: "M4,21 q10,-17 20,0", stroke: "currentColor", w: 2.6 },
      { k: "circle", cx: 10, cy: 17, r: 2.2, fill: "currentColor" },
      { k: "circle", cx: 14, cy: 14.5, r: 2.2, fill: "currentColor" },
      { k: "circle", cx: 18, cy: 17, r: 2.2, fill: "currentColor" },
      { k: "rect", x: 3.5, y: 21, w: 21, h: 3, rx: 1.5, fill: "currentColor" },
    ],
  },
};
