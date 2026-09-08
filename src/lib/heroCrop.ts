// Hero crop geometry.
//
// The takeover shows a horizontal slice of a portrait flyer in a landscape
// band. How much of the poster that slice contains is pure arithmetic, and it
// is the number that decides whether the hero looks like the flyer or like a
// detail from the middle of it.
//
// The rule: derive the section's height from the art column's WIDTH. Any fixed
// height makes the visible fraction depend on the browser window — which is
// what shipped, and why a 1745px monitor saw a third of the poster while a
// 1280px laptop saw nearly half.
//
// One counterintuitive consequence worth stating, because it points the wrong
// way: a WIDER art column shows LESS of the poster, not more. Widening scales
// the image up, so its natural height grows faster than the band does. Going
// full-bleed would have made the framing worse.
//
// Pure and client-safe, like the other hero modules.

/** Share of the viewport the flyer column occupies. Mirrored in .herofx .art. */
export const ART_WIDTH_PCT = 0.5;

/** Art column height as a share of its width. Mirrored by SECTION_ASPECT in CSS. */
export const ART_ASPECT = 0.75;

/**
 * Viewport width ÷ section height — the value the stylesheet carries as
 * `aspect-ratio`. Derived rather than written twice, so the CSS and this module
 * cannot drift apart into two different layouts.
 */
export const SECTION_ASPECT = 1 / (ART_WIDTH_PCT * ART_ASPECT);

/**
 * Floor for the section height.
 *
 * Below this the derived height is too short to hold the eyebrow, sub-line and
 * two buttons without clipping. The floor necessarily breaks the constant
 * fraction — it trades framing consistency for not cutting off the CTAs, which
 * is the right way round.
 */
export const MIN_SECTION_H = 420;

/** The viewport width at which the floor takes over from the derived height. */
export const MIN_CONSTANT_WIDTH = MIN_SECTION_H / (ART_WIDTH_PCT * ART_ASPECT);

export type HeroCrop = {
  /** Rendered width of the flyer column, in CSS pixels. */
  regionW: number;
  /** Rendered height of the section, in CSS pixels. */
  regionH: number;
  /** Share of the poster's height that is visible, 0–1. */
  visibleFraction: number;
};

/**
 * What the hero will actually show at a given viewport width.
 *
 * `flyerRatio` is the poster's width ÷ height — 0.667 for the 2:3 posters in
 * Casa's library, about 0.757 for the 3:4 ones. A squarer poster fits more of
 * itself into the same band, so the fraction varies a little BY FLYER while
 * staying constant BY SCREEN, which is the property that matters.
 */
export function heroCrop(viewportW: number, flyerRatio: number): HeroCrop {
  const regionW = viewportW * ART_WIDTH_PCT;
  const regionH = Math.max(regionW * ART_ASPECT, MIN_SECTION_H);

  // object-fit: cover against a portrait image in a landscape band always
  // scales to the WIDTH, so the natural height follows from the ratio.
  const naturalH = regionW / flyerRatio;

  return {
    regionW,
    regionH,
    // Clamped: on a very narrow window the floor can exceed the whole poster,
    // and reporting 1.4 of an image would be meaningless.
    visibleFraction: Math.min(1, regionH / naturalH),
  };
}
