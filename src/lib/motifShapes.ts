// The primitive vocabulary every motif's art is described in.
//
// Extracted from loteriaDeck so a second motif does not have to import from the
// first one — patrias fireworks depending on the lotería deck would read as a
// mistake to the next person, and would make deleting either one awkward.
//
// Art is described as data rather than written as JSX for one reason: this repo
// has no jsdom, so anything expressed as a component can only be verified by
// looking at the page. As data it can at least be checked for structure, and
// rasterised offline to be checked by eye.

export type Shape =
  | { k: "circle"; cx: number; cy: number; r: number; fill: string }
  | { k: "rect"; x: number; y: number; w: number; h: number; rx?: number; fill: string }
  | { k: "path"; d: string; fill?: string; stroke?: string; w?: number };
