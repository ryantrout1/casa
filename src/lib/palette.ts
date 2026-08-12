// Hero palette extraction. The fiesta takeover borrows its colours from
// Stephanie's flyer instead of hardcoding a single dark ground, so a bright
// Lotería poster and a dark cantina poster each get a hero that matches.
//
// Everything here is pure and takes a raw RGBA buffer rather than an image or a
// canvas. Extraction runs client-side in the composer (the browser already
// holds the uploaded File, so there is no server CPU cost and no new
// dependency), and the pixel-array seam is what makes it unit-testable without
// a DOM.
//
// The contrast floor is the load-bearing rule. A palette that reads well as
// swatches can still render unreadable type, so nothing leaves this module
// without clearing WCAG AA against its own background.

export type Palette = {
  /** Ranked candidate colours for the admin to pick from, most useful first. */
  swatches: string[];
  /** Section background. */
  bg: string;
  /** Eyebrow / ribbon / CTA colour. Guaranteed AA against `bg`. */
  accent: string;
  /** Body and headline colour. Guaranteed AA against `bg`. */
  ink: string;
};

/** WCAG AA for normal-size text. */
export const AA_CONTRAST = 4.5;

// The two ink colours the v8 system already uses on light and dark grounds.
export const CREAM = "#f7ecd4";
export const NAVY = "#1f3a63";

// What ships today on .herofx — the fallback must never be a regression from
// the current hero.
export const FALLBACK_BG = "#140c06";
export const FALLBACK_ACCENT = "#ffbf1f";

type RGB = { r: number; g: number; b: number };

const clamp255 = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n));

function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Is this a 6-digit hex colour? Mirrors the DB's hero_colors_hex CHECK. */
export function isHex(value: string): boolean {
  return HEX_RE.test(value);
}

function fromHex(hex: string): RGB {
  const s = hex.replace("#", "");
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/**
 * WCAG relative luminance, 0 (black) to 1 (white).
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = fromHex(hex);
  const chan = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/**
 * WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white).
 * Symmetric by construction.
 */
export function contrastRatio(a: string, b: string): number {
  // Fail safe: an unparseable colour reports the worst possible ratio, so it
  // can never slip past an `>= AA_CONTRAST` gate as a NaN comparison would.
  if (!isHex(a) || !isHex(b)) return 1;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The readable ink for a given background: cream on dark grounds, navy on
 * light ones. Falls through to pure black/white when neither brand ink clears
 * AA — a mid-grey ground has poor contrast with both, and an unreadable hero is
 * worse than an off-brand one.
 */
export function pickInk(bg: string): string {
  // An unusable background gets the ink the hero ships with today.
  if (!isHex(bg)) return CREAM;
  const candidates = [
    relativeLuminance(bg) < 0.4 ? CREAM : NAVY,
    relativeLuminance(bg) < 0.4 ? NAVY : CREAM,
    "#ffffff",
    "#000000",
  ];
  for (const c of candidates) {
    if (contrastRatio(c, bg) >= AA_CONTRAST) return c;
  }
  // Unreachable in practice: black and white cannot both fail against the same
  // colour. Kept so the function is total rather than returning undefined.
  return relativeLuminance(bg) < 0.5 ? "#ffffff" : "#000000";
}

// Saturation in HSL terms, 0 (grey) to 1 (fully saturated). Used to rank
// candidates so a brand colour beats a muddy majority for the accent slot.
function saturation({ r, g, b }: RGB): number {
  const mx = Math.max(r, g, b) / 255;
  const mn = Math.min(r, g, b) / 255;
  if (mx === mn) return 0;
  const l = (mx + mn) / 2;
  return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
}

// Quantise to a coarse grid so near-identical pixels collapse into one bucket.
// 32 levels per channel is fine enough to keep magenta and orange apart, coarse
// enough that JPEG noise does not fragment a flat area into hundreds of buckets.
const STEP = 32;
const quantise = (v: number) => Math.min(255, Math.floor(v / STEP) * STEP + STEP / 2);

// A bucket collapses near-identical pixels, but reports the *average of the
// real pixels* it collected rather than the bucket's centre. The grid is only a
// grouping device; emitting centres would hand the admin swatches up to
// STEP/2 off from the flyer's actual colours, which defeats the point.
type Bucket = { sum: RGB; count: number };
type Candidate = { hex: string; count: number; sat: number };

/**
 * Derive a hero palette from a raw RGBA pixel buffer.
 *
 * `width` and `height` are accepted for API clarity and future region-weighting
 * (e.g. sampling the crop band rather than the whole flyer); the current
 * implementation walks every pixel, so it reads the buffer length directly and
 * tolerates a mismatch rather than trusting the caller's arithmetic.
 *
 * Total by contract: an empty, fully transparent, or unusable buffer yields the
 * colours the hero ships with today rather than throwing.
 */
export function extractPalette(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Palette {
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    // Skip anything meaningfully transparent — a PNG flyer with transparent
    // margins must not average toward black.
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = `${quantise(r)},${quantise(g)},${quantise(b)}`;
    const found = buckets.get(key);
    if (found) {
      found.sum.r += r;
      found.sum.g += g;
      found.sum.b += b;
      found.count += 1;
    } else {
      buckets.set(key, { sum: { r, g, b }, count: 1 });
    }
  }

  if (buckets.size === 0) {
    return {
      swatches: [FALLBACK_BG, FALLBACK_ACCENT, CREAM],
      bg: FALLBACK_BG,
      accent: FALLBACK_ACCENT,
      ink: CREAM,
    };
  }

  // Resolve each bucket to the average of the real pixels it collected, so the
  // emitted hex is a colour that actually appears in the flyer.
  const all: Candidate[] = [...buckets.values()].map((b) => {
    const rgb = { r: b.sum.r / b.count, g: b.sum.g / b.count, b: b.sum.b / b.count };
    return { hex: toHex(rgb), count: b.count, sat: saturation(rgb) };
  });

  // Background: plain frequency. The ground of a poster is the colour there is
  // most of. Ties break on hex so the result is deterministic.
  const byCount = [...all].sort((a, b) => b.count - a.count || (a.hex < b.hex ? -1 : 1));
  const bg = byCount[0].hex;

  // Accent: frequency weighted by saturation, so a small block of magenta beats
  // a large field of brown. Anything failing AA against the ground is dropped
  // here rather than substituted later — an accent that cannot be read is not a
  // candidate at all.
  const scored = all
    .filter((b) => b.hex !== bg && contrastRatio(b.hex, bg) >= AA_CONTRAST)
    .map((b) => ({ ...b, score: b.count * (0.25 + b.sat) }))
    .sort((a, b) => b.score - a.score || (a.hex < b.hex ? -1 : 1));

  const ink = pickInk(bg);

  // Monochrome and near-monochrome flyers leave nothing usable. Fall back to
  // the shipped accent, and to the ink itself when even that fails — both are
  // already AA-checked against this ground.
  const accent =
    scored[0]?.hex ??
    (contrastRatio(FALLBACK_ACCENT, bg) >= AA_CONTRAST ? FALLBACK_ACCENT : ink);

  // Swatches: the picks first, then the next most prominent colours in the
  // flyer, capped at five. Deliberately NOT filtered by contrast — the AA gate
  // governs which colour we *default* the accent to, not what the admin is
  // allowed to see. A vivid magenta that fails as body text is still a
  // legitimate choice for a ribbon fill, and hiding it would defeat the
  // override this palette is meant to offer.
  const byProminence = [...all].sort(
    (a, b) => b.count * (0.25 + b.sat) - a.count * (0.25 + a.sat) || (a.hex < b.hex ? -1 : 1),
  );
  const swatches: string[] = [bg, accent];
  for (const c of byProminence) {
    if (swatches.length >= 5) break;
    if (!swatches.includes(c.hex)) swatches.push(c.hex);
  }

  return { swatches, bg, accent, ink };
}
