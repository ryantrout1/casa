import { isHex } from "./palette";

// One fiesta row becomes the motif composition the hero should draw, or
// nothing. Pure and client-safe, like heroAlt, heroDates, heroViews and
// heroTheme — the admin's live preview is a client component and must not drag
// the Neon driver into the browser bundle. Import only from ./palette.
//
// A motif is all-or-nothing, for the same reason the bilingual pairing rule is.
// A plan that resolved with three of its four parts would draw a composition
// with a hole in it: a papel picado strip over an empty column, or a headline
// where the letters after the accent lost their colour. That reads as a broken
// page rather than a half-configured one, so anything unusable voids the whole
// plan and Hero falls back to the takeover that ships today.
//
// Nothing in here trusts the database. The four columns are jsonb and text with
// only a CHECK on the motif name, so every other shape — array lengths, hex
// format, which card names exist — is enforced here. The DB constraint and this
// module are the two halves of the same guard, the same split hero_focus and
// hero_colors_hex already use.

/** The motif names the DB CHECK allows. Kept in sync with fiestas_hero_motif_chk. */
export const MOTIF_NAMES = ["loteria", "patrias", "cantina", "photo_band"] as const;
export type MotifName = (typeof MOTIF_NAMES)[number];

/**
 * The lotería deck the hero can draw from. Card art lands in Phase 4; this list
 * is the contract that lets Phase 1 reject a name the deck will never have,
 * rather than discovering it at render time as a blank rectangle.
 */
export const LOTERIA_CARDS = [
  "el_sol",
  "la_rosa",
  "la_luna",
  "la_mano",
  "el_corazon",
  "la_chalupa",
  "la_sirena",
  "el_gallo",
] as const;
export type LoteriaCard = (typeof LOTERIA_CARDS)[number];

/** Attraction icons for a Fiestas Patrias–style community poster. */
export const ATTRACTION_ICONS = [
  "music",
  "dancers",
  "chinelos",
  "crown",
  "grito",
  "vendors",
  "food",
] as const;
export type AttractionIcon = (typeof ATTRACTION_ICONS)[number];

/** Neon icon strip for a cantina-style poster. */
export const NEON_ICONS = ["mic", "drinks", "food", "music", "star"] as const;
export type NeonIcon = (typeof NEON_ICONS)[number];

/** Fewer than three colours is not a palette; more than six is noise. */
export const MIN_PALETTE = 3;
export const MAX_PALETTE = 6;

/** Cards flank the type. Two is the minimum that reads as a pair; four fills a desktop hero. */
export const MIN_CARDS = 2;
export const MAX_CARDS = 4;

/** One icon is a stray; more than six will not fit the strip at 390px. */
export const MIN_ICONS = 1;
export const MAX_ICONS = 6;

export type MotifPlan =
  | { motif: "loteria"; palette: string[]; titleColors: string[]; cards: LoteriaCard[] }
  | { motif: "patrias"; palette: string[]; titleColors: string[]; icons: AttractionIcon[] }
  | { motif: "cantina"; palette: string[]; titleColors: string[]; icons: NeonIcon[] }
  | { motif: "photo_band"; palette: string[]; bandTop: number; bandHeight: number }
  | { motif: "none" };

/** The single "draw nothing" value, so callers can compare against one object shape. */
export const NO_MOTIF: MotifPlan = { motif: "none" };

/** What this module needs off a Flyer. Structurally a subset, so callers pass one. */
export type MotifSource = {
  heroMotif: string | null;
  heroPalette: unknown;
  heroTitleColors: unknown;
  heroTokens: unknown;
  heroTitle: string | null;
};

function isMotifName(v: string | null): v is MotifName {
  return v !== null && (MOTIF_NAMES as readonly string[]).includes(v);
}

/**
 * A jsonb array of 3–6 six-digit hex colours, or null.
 *
 * Exported because Phase 2's admin form validates the same shape before it will
 * save, and two copies of the rule would drift.
 */
export function validPalette(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length < MIN_PALETTE || v.length > MAX_PALETTE) return null;
  if (!v.every((c) => typeof c === "string" && isHex(c))) return null;
  return v as string[];
}

/**
 * How many colours a headline needs — one per character it will render.
 *
 * Normalised to NFC first. "LOTERÍA" is seven characters with a precomposed Í
 * and eight with a combining acute, and the two forms are indistinguishable in
 * the admin textarea. Without this, the same title typed on two machines would
 * disagree about whether its stored colour array still fits, and every colour
 * after the accent would shift by one.
 *
 * Spread rather than `.length` so an astral character counts once.
 */
function titleLength(title: string | null): number {
  if (!title) return 0;
  const t = title.normalize("NFC").trim();
  return t === "" ? 0 : [...t].length;
}

/**
 * Repeat the palette to cover `n` characters.
 *
 * This is the fallback whenever stored title colours are absent or unusable, so
 * a headline is always fully coloured — never partly. An empty palette cannot
 * reach here (validPalette gates it), but the guard keeps the function total.
 */
export function cyclePalette(n: number, palette: string[]): string[] {
  if (n <= 0 || palette.length === 0) return [];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}

/**
 * Per-character colours for the headline.
 *
 * Stored colours are used only when they are all valid hex AND there are
 * exactly as many as the title has characters. A short array would run out
 * partway through the word and a long one would silently ignore its tail —
 * both leave a headline that looks half-styled, which is worse than an
 * evenly-cycled one. Falling back is deliberate and never voids the plan:
 * unlike a bad card name, a bad colour array has a good default.
 */
function resolveTitleColors(v: unknown, title: string | null, palette: string[]): string[] {
  const n = titleLength(title);
  if (n === 0) return [];
  if (
    Array.isArray(v) &&
    v.length === n &&
    v.every((c) => typeof c === "string" && isHex(c))
  ) {
    return v as string[];
  }
  return cyclePalette(n, palette);
}

// A jsonb object, and specifically not an array — Array.isArray is the check
// that matters, because `typeof [] === "object"` would otherwise let a bare
// list of card names through as if it were a token record.
function asRecord(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/**
 * A list of names drawn from a closed set: right length, no repeats, every
 * entry known.
 *
 * An unknown name voids rather than being filtered out. Dropping it would
 * render a three-card composition where the admin configured four and give no
 * signal that anything was wrong — the silent-drop shape exactly.
 */
function validNames<T extends string>(
  v: unknown,
  allowed: readonly T[],
  min: number,
  max: number,
): T[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length < min || v.length > max) return null;
  if (!v.every((n) => typeof n === "string" && (allowed as readonly string[]).includes(n))) {
    return null;
  }
  if (new Set(v).size !== v.length) return null;
  return v as T[];
}

// A whole percentage. Non-integers are rejected rather than rounded: a band
// position is authored by a slider, so a fractional value means something
// wrote to the column that was not the admin.
function pct(v: unknown, lo: number, hi: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  if (v < lo || v > hi) return null;
  return v;
}

/**
 * The composition the hero should draw for this fiesta, or `{ motif: "none" }`.
 *
 * Total by contract. Every failure path — an unknown motif, an unusable
 * palette, tokens that name a different motif than the row does, a card that is
 * not in the deck, a band that runs off the bottom of the flyer — returns
 * `none`, and the caller renders the takeover that ships today.
 */
export function heroMotif(f: MotifSource): MotifPlan {
  if (!isMotifName(f.heroMotif)) return NO_MOTIF;

  const palette = validPalette(f.heroPalette);
  if (!palette) return NO_MOTIF;

  const tokens = asRecord(f.heroTokens);
  if (!tokens) return NO_MOTIF;

  // hero_motif and hero_tokens are two columns that can disagree — switching
  // the dropdown without clearing the token editor is the obvious way. Trusting
  // the column and coercing the tokens would draw a cantina composition holding
  // lotería cards, so a mismatch voids instead.
  if (tokens.motif !== f.heroMotif) return NO_MOTIF;

  const titleColors = resolveTitleColors(f.heroTitleColors, f.heroTitle, palette);

  switch (f.heroMotif) {
    case "loteria": {
      const cards = validNames(tokens.cards, LOTERIA_CARDS, MIN_CARDS, MAX_CARDS);
      return cards ? { motif: "loteria", palette, titleColors, cards } : NO_MOTIF;
    }
    case "patrias": {
      const icons = validNames(tokens.icons, ATTRACTION_ICONS, MIN_ICONS, MAX_ICONS);
      return icons ? { motif: "patrias", palette, titleColors, icons } : NO_MOTIF;
    }
    case "cantina": {
      const icons = validNames(tokens.icons, NEON_ICONS, MIN_ICONS, MAX_ICONS);
      return icons ? { motif: "cantina", palette, titleColors, icons } : NO_MOTIF;
    }
    case "photo_band": {
      const bandTop = pct(tokens.bandTop, 0, 100);
      const bandHeight = pct(tokens.bandHeight, 1, 100);
      if (bandTop === null || bandHeight === null) return NO_MOTIF;
      // A band running past the bottom edge would leave dead space under the
      // crop rather than clipping — object-position cannot reach past 100%.
      if (bandTop + bandHeight > 100) return NO_MOTIF;
      return { motif: "photo_band", palette, bandTop, bandHeight };
    }
  }
}
