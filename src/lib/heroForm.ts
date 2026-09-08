import { phoenixLocalToUtcISO, type HeroCopy } from "./schedule";
import { isHex } from "./palette";
import type { HeroLang } from "./publish";
import {
  ATTRACTION_ICONS,
  LOTERIA_CARDS,
  MOTIF_NAMES,
  NEON_ICONS,
  type MotifName,
} from "./heroMotif";

// The composer's hero panel, as the form holds it. Every field is a string
// (or a string-shaped number) because that is what an <input> yields; the
// conversion to a storable HeroCopy happens here, once, in a pure function
// the component can be tested through.
export type HeroFormState = {
  /** Phoenix wall-clock "YYYY-MM-DDTHH:mm" — when the EVENT starts. */
  startLocal: string;
  /** Phoenix wall-clock "YYYY-MM-DDTHH:mm" — when the TAKEOVER starts. */
  liveLocal: string;
  title: string;
  script: string;
  ribbon: string;
  sub: string;
  /**
   * The same four lines in the other language, for the rotating hero. `lang`
   * names the language of the primary set above; these are implicitly the
   * other one. The hero only rotates when all four cover the primary's used
   * fields — heroAlt enforces that, not this module.
   */
  titleAlt: string;
  scriptAlt: string;
  ribbonAlt: string;
  subAlt: string;
  lang: HeroLang;
  /** Crop position 0–100 as the slider holds it, or "" for "use the default". */
  focus: string;
  bg: string;
  accent: string;
  ink: string;
};

export const EMPTY_HERO_FORM: HeroFormState = {
  startLocal: "",
  liveLocal: "",
  title: "",
  script: "",
  ribbon: "",
  sub: "",
  titleAlt: "",
  scriptAlt: "",
  ribbonAlt: "",
  subAlt: "",
  lang: "en",
  focus: "",
  bg: "",
  accent: "",
  ink: "",
};

/**
 * Turn the hero panel's form state into the HeroCopy that rides inside the
 * draft blob, or `undefined` when the admin has not touched it.
 *
 * The `undefined` return is the load-bearing contract. Every draft saved
 * before the hero panel existed has no `hero` key, and the cron drain parses
 * those blobs; returning an object for an untouched form would change the
 * shape of every draft in the system. So "nothing filled in" must stay
 * indistinguishable from "this feature does not exist".
 */
export function heroPayloadFrom(f: HeroFormState): HeroCopy | undefined {
  const startsAt = f.startLocal ? phoenixLocalToUtcISO(f.startLocal) : null;
  const liveAt = f.liveLocal ? phoenixLocalToUtcISO(f.liveLocal) : null;

  // Trim once; the same values decide "is anything filled" and what is sent,
  // so the two can never disagree.
  const title = f.title.trim();
  const script = f.script.trim();
  const ribbon = f.ribbon.trim();
  const sub = f.sub.trim();
  const titleAlt = f.titleAlt.trim();
  const scriptAlt = f.scriptAlt.trim();
  const ribbonAlt = f.ribbonAlt.trim();
  const subAlt = f.subAlt.trim();

  // A crop of 0 is a real value (top of the flyer), so emptiness is tested on
  // the string, not on the number.
  const focusRaw = f.focus.trim();
  const focus = focusRaw === "" ? null : Number(focusRaw);
  const hasFocus = focus !== null && Number.isFinite(focus);

  const bg = isHex(f.bg) ? f.bg.toLowerCase() : null;
  const accent = isHex(f.accent) ? f.accent.toLowerCase() : null;
  const ink = isHex(f.ink) ? f.ink.toLowerCase() : null;

  // Alt copy on its own is a real edit — the admin may be adding a translation
  // to a fiesta whose primary copy was stored before this panel existed.
  const filled =
    startsAt || liveAt || title || script || ribbon || sub ||
    titleAlt || scriptAlt || ribbonAlt || subAlt ||
    hasFocus || bg || accent || ink;
  if (!filled) return undefined;

  return {
    startsAt,
    ...(liveAt ? { liveAt } : {}),
    ...(title ? { title } : {}),
    ...(script ? { script } : {}),
    ...(ribbon ? { ribbon } : {}),
    ...(sub ? { sub } : {}),
    ...(titleAlt ? { titleAlt } : {}),
    ...(scriptAlt ? { scriptAlt } : {}),
    ...(ribbonAlt ? { ribbonAlt } : {}),
    ...(subAlt ? { subAlt } : {}),
    lang: f.lang,
    ...(hasFocus ? { focus: Math.min(100, Math.max(0, Math.round(focus))) } : {}),
    ...(bg ? { bg } : {}),
    ...(accent ? { accent } : {}),
    ...(ink ? { ink } : {}),
  };
}

// ---------------------------------------------------------------------------
// Motif panel
// ---------------------------------------------------------------------------
//
// The four motif columns as the admin form holds them: strings and string
// arrays, because that is what inputs and checkboxes yield. Everything below is
// pure, and the SERVER calls motifColumnsFrom rather than trusting values the
// client computed — the same posture sethero already takes with colours and
// crop. One parser, two callers, no chance of the badge in /cocina disagreeing
// with what actually gets written.

export type MotifDraft = {
  /** "" means no motif. Otherwise one of MOTIF_NAMES. */
  motif: string;
  /** Comma- or space-separated hex, e.g. "#f7ead0, #d42b2b, #2e7d4f". */
  palette: string;
  /** Same format, one colour per character of the headline. Blank cycles the palette. */
  titleColors: string;
  cards: string[];
  icons: string[];
  bandTop: string;
  bandHeight: string;
};

export const EMPTY_MOTIF_DRAFT: MotifDraft = {
  motif: "",
  palette: "",
  titleColors: "",
  cards: [],
  icons: [],
  bandTop: "",
  bandHeight: "",
};

/** The four values that go into the four columns. Null means "clear it". */
export type MotifColumns = {
  motif: MotifName | null;
  palette: string[] | null;
  titleColors: string[] | null;
  tokens: Record<string, unknown> | null;
};

export const NO_MOTIF_COLUMNS: MotifColumns = {
  motif: null,
  palette: null,
  titleColors: null,
  tokens: null,
};

/**
 * Split a hex list typed into a text field.
 *
 * All-or-nothing: one malformed entry returns null rather than a shorter list.
 * A partially-parsed palette would render a composition using colours the admin
 * did not choose, and they would have no way to tell which ones were dropped.
 * The status badge in /cocina is what makes the rejection visible.
 */
export function parseHexList(s: string): string[] | null {
  const parts = s
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.length === 0) return null;
  if (!parts.every((p) => isHex(p))) return null;
  return parts.map((p) => p.toLowerCase());
}

/** A stored jsonb hex array back into the text the field shows. */
export function formatHexList(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v.filter((c): c is string => typeof c === "string").join(", ");
}

// A whole percentage typed into a number input. Blank and unparseable are the
// same answer — no band — because both mean the token record cannot be built.
function bandPct(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function names<T extends string>(v: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const n of v) {
    if (typeof n !== "string") continue;
    if (!(allowed as readonly string[]).includes(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n as T);
  }
  return out;
}

/**
 * Turn the motif panel's draft into the four column values.
 *
 * Returns NO_MOTIF_COLUMNS whenever the motif is unset or unusable, which
 * clears all four columns together. Clearing them as a group is deliberate:
 * leaving a stale palette behind after switching the dropdown to "none" would
 * mean the next motif silently inherited the previous event's colours.
 *
 * Note this does NOT decide whether the motif will render — lib/heroMotif does,
 * and it re-validates everything on the way out of the database. This function
 * only decides what is worth storing.
 *
 * That makes it deliberately MORE permissive than heroMotif: it checks format
 * (is this a hex, is this a real card name) while heroMotif checks
 * renderability (are there 3-6 colours, are there 2-4 cards). A palette one
 * colour short is stored, not cleared, so an admin who saves halfway through
 * choosing does not reopen the editor to find their work gone. The status badge
 * in /cocina runs BOTH, so what they see is always heroMotif's verdict.
 */
export function motifColumnsFrom(d: MotifDraft): MotifColumns {
  const motif = (MOTIF_NAMES as readonly string[]).includes(d.motif)
    ? (d.motif as MotifName)
    : null;
  if (!motif) return NO_MOTIF_COLUMNS;

  const palette = parseHexList(d.palette);
  if (!palette) return NO_MOTIF_COLUMNS;

  // Blank is the normal case — the headline cycles the palette. Only a
  // non-blank list that fails to parse is a problem, and it drops to null
  // rather than voiding the whole motif, matching heroMotif's own posture:
  // a bad colour array has a good default, a bad card name does not.
  const titleColors = d.titleColors.trim() === "" ? null : parseHexList(d.titleColors);

  let tokens: Record<string, unknown> | null = null;
  if (motif === "loteria") {
    const cards = names(d.cards, LOTERIA_CARDS);
    tokens = cards.length > 0 ? { motif, cards } : null;
  } else if (motif === "patrias") {
    const icons = names(d.icons, ATTRACTION_ICONS);
    tokens = icons.length > 0 ? { motif, icons } : null;
  } else if (motif === "cantina") {
    const icons = names(d.icons, NEON_ICONS);
    tokens = icons.length > 0 ? { motif, icons } : null;
  } else {
    const bandTop = bandPct(d.bandTop);
    const bandHeight = bandPct(d.bandHeight);
    tokens = bandTop !== null && bandHeight !== null ? { motif, bandTop, bandHeight } : null;
  }

  // A motif with no tokens can never render, so storing the name and palette
  // alone would leave a row that looks configured in the admin and does
  // nothing on the site.
  if (!tokens) return NO_MOTIF_COLUMNS;

  return { motif, palette, titleColors, tokens };
}
