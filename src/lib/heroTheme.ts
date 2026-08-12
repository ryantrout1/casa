// Hero takeover presentation helpers. These live apart from lib/fiestas on
// purpose: fiestas imports the Neon driver, and the composer's live preview is
// a client component. Importing fiestas there would pull the driver into the
// browser bundle. Everything here is pure and depends only on lib/palette.
//
// lib/fiestas re-exports both functions, so server-side callers are unaffected.

import { isHex, pickInk } from "./palette";

// The object-position the flyer should be cropped at. Clamped and rounded here
// rather than trusted from the row, because this value reaches the page as a
// custom property — the DB CHECK is the other half of the same guard.
export function heroFocusCss(focus: number | null): string {
  if (focus === null || !Number.isFinite(focus)) return "center 50%";
  const pct = Math.min(100, Math.max(0, Math.round(focus)));
  return `center ${pct}%`;
}

// The CSS custom properties the takeover section carries. Emitting nothing
// when a row has no colours is the load-bearing contract: the stylesheet's
// fallbacks then render exactly what shipped before this column existed, so
// every fiesta published to date is untouched.
//
// Two inks, not one. `--fx-ink` is text ON the section ground. `--fx-accent-ink`
// is text ON the accent, because the ribbon and the primary button are *filled*
// with the accent and carry copy on top — a single accent value cannot also be
// its own legible text. Both are derived when not stored, so a colour chosen
// for looks can never produce unreadable type.
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

  if (accent) {
    out["--fx-accent"] = accent;
    out["--fx-accent-ink"] = pickInk(accent);
  }

  return out;
}
