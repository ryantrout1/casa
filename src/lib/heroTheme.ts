// Hero takeover presentation helpers. These live apart from lib/fiestas on
// purpose: fiestas imports the Neon driver, and the composer's live preview is
// a client component. Importing fiestas there would pull the driver into the
// browser bundle. Everything here is pure and depends only on lib/palette.
//
// lib/fiestas re-exports both functions, so server-side callers are unaffected.

import { AA_CONTRAST, AA_LARGE, FALLBACK_BG, contrastRatio, isHex, pickInk } from "./palette";

// The object-position the flyer should be cropped at. Clamped and rounded here
// rather than trusted from the row, because this value reaches the page as a
// custom property — the DB CHECK is the other half of the same guard.
//
// Null means the TOP of the poster, not its middle. Every flyer Casa has run is
// composed top-down — sponsor or presenter, then the title lockup, then details
// — so the top is the half worth showing when nobody has chosen a crop.
//
// This default has to live here rather than in the stylesheet. globals.css
// writes `var(--fx-art-pos, center 0%)`, but that fallback is unreachable:
// Hero.tsx sets --fx-art-pos from this function on every render, so the custom
// property is never unset and the CSS default never fires. Changing it there
// alone did nothing at all.
export function heroFocusCss(focus: number | null): string {
  if (focus === null || !Number.isFinite(focus)) return "center 0%";
  const pct = Math.min(100, Math.max(0, Math.round(focus)));
  return `center ${pct}%`;
}

// `--fx-bg` is the section ground and `--fx-ink` is the text on it, derived
// when not stored. The accent colours TEXT on that ground, which is why it is
// gated on contrast rather than paired with its own ink — and why it ships as
// two variables, one per text size band.
//
// The ribbon and the primary button deliberately do not read any of this. They
// stay Casa's teal and yellow on every fiesta, with their own baked-in text
// colours: the flyer sets the ground and the script, the furniture belongs to
// the brand. One accent tinting the script, the ribbon AND the button turned
// every poster into two colours.
export function heroStyleVars(f: {
  heroBg: string | null;
  heroAccent: string | null;
  heroInk: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  const bg = f.heroBg && isHex(f.heroBg) ? f.heroBg : null;
  const accent = f.heroAccent && isHex(f.heroAccent) ? f.heroAccent : null;
  const ink = f.heroInk && isHex(f.heroInk) ? f.heroInk : null;

  if (bg) {
    out["--fx-bg"] = bg;
    out["--fx-ink"] = ink ?? pickInk(bg);
  } else if (ink) {
    out["--fx-ink"] = ink;
  }

  // The sub-line is deliberately quieter than the headline. Unthemed it uses a
  // hand-picked muted brown; themed it has to derive that from whatever ink we
  // landed on, so it is expressed as opacity rather than a fifth colour.
  if (out["--fx-ink"]) out["--fx-sub-op"] = "0.82";

  // An accent that cannot be read against the ground is not usable as text.
  // Dropping it lets the stylesheet fall back to the brand yellow and magenta,
  // which is a better outcome than an unreadable eyebrow.
  //
  // Two gates, because the takeover now sets text at two very different sizes.
  // --fx-accent is for the 11px eyebrow and keeps WCAG's normal-text ratio.
  // --fx-accent-lg is for the Bangers sub-line at up to 38px, which is
  // large-scale text and whose required ratio is 3:1.
  //
  // The difference is not academic: Casa's Lotería flyer is red #d42b2b on
  // cream #f5e6c8, which measures 4.08. Under one gate the flyer's own colour
  // was discarded and the hero fell back to brand yellow at 1.34 against that
  // ground — so a light poster lost its accent entirely and the fallback was
  // less readable than the colour it replaced. Dark posters were never
  // affected, which is why this only surfaced when a cream flyer went live.
  if (accent) {
    const ground = bg ?? FALLBACK_BG;
    const ratio = contrastRatio(accent, ground);
    if (ratio >= AA_CONTRAST) out["--fx-accent"] = accent;
    if (ratio >= AA_LARGE) out["--fx-accent-lg"] = accent;
  }

  return out;
}
