import { isHex } from "./palette";
import type { HeroLang } from "./publish";
import type { HeroFormState } from "./heroForm";

// Turning a flyer into form suggestions. Everything here is pure: the network
// call and the API key live in the route, and this module only ever sees the
// response body. That split is what makes the interesting cases — refusals,
// truncation, malformed JSON — testable without a key or a network.
//
// The governing rule throughout: a bad read must leave the admin exactly where
// they started. Never halfway. A form with three of nine fields filled from a
// misread poster is worse than an empty one, because there is no way to tell
// which three.

/**
 * The JSON schema handed to the Messages API via `output_config.format`.
 *
 * Every property is required-and-nullable rather than optional, for two
 * documented reasons: structured outputs reorder optional properties after
 * required ones, and optional properties count against a per-request
 * complexity budget. "The poster does not say" is expressed as null.
 *
 * The date is decomposed into month/day/year/hour/minute rather than asked for
 * as a string. A poster prints "SATURDAY AUGUST 29 · 8 PM" — no year, a day
 * name that may disagree with the date, and a 12-hour clock. Parsing that from
 * free text is exactly the kind of thing that silently produces a wrong date
 * on the homepage, so the model reports parts and this module assembles them.
 */
export const FLYER_SCHEMA = {
  type: "object" as const,
  properties: {
    title: {
      type: ["string", "null"],
      description: "Event name, largest type. Excludes any cursive continuation.",
    },
    script: {
      type: ["string", "null"],
      description: "The cursive continuation of the title lockup, if any.",
    },
    ribbon: { type: ["string", "null"], description: "Banner or tagline strip, verbatim" },
    sub: {
      type: ["string", "null"],
      description:
        "One short supporting line, usually the address. Must NOT repeat title, script, or ribbon.",
    },
    caption: { type: ["string", "null"], description: "Short one-line label for a listing page" },
    alt: { type: ["string", "null"], description: "Accessibility description of the artwork" },
    lang: {
      type: "string",
      enum: ["en", "es"],
      description: "Language the DATE is printed in on the poster, not the poster's overall language",
    },
    month: { type: ["integer", "null"], description: "Event month, 1-12" },
    day: { type: ["integer", "null"], description: "Event day of month, 1-31" },
    year: { type: ["integer", "null"], description: "Only if the poster prints it. Else null." },
    hour24: { type: ["integer", "null"], description: "Start hour on a 24-hour clock, 0-23" },
    minute: { type: ["integer", "null"], description: "Start minute, 0-59" },
    bg: { type: ["string", "null"], description: "Dominant background colour, #rrggbb" },
    accent: { type: ["string", "null"], description: "Brightest signature accent, #rrggbb" },
    ink: { type: ["string", "null"], description: "Main headline text colour, #rrggbb" },
  },
  required: [
    "title", "script", "ribbon", "sub", "caption", "alt", "lang",
    "month", "day", "year", "hour24", "minute", "bg", "accent", "ink",
  ],
  additionalProperties: false,
};

export type FlyerSuggestion = {
  title: string | null;
  script: string | null;
  ribbon: string | null;
  sub: string | null;
  caption: string | null;
  alt: string | null;
  lang: HeroLang;
  month: number | null;
  day: number | null;
  year: number | null;
  hour24: number | null;
  minute: number | null;
  bg: string | null;
  accent: string | null;
  ink: string | null;
};

// A trimmed string, or null for absent/blank. Anything non-string that is not
// null is a type violation, reported separately so the caller can void.
function text(v: unknown): { ok: boolean; value: string | null } {
  if (v === null || v === undefined) return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false, value: null };
  const t = v.trim();
  return { ok: true, value: t === "" ? null : t };
}

// An integer within range, or null. Out-of-range voids the read: an hour of 25
// means the model misread the poster, and a misread clock is not something to
// paper over.
function int(v: unknown, lo: number, hi: number): { ok: boolean; value: number | null } {
  if (v === null || v === undefined) return { ok: true, value: null };
  if (typeof v !== "number" || !Number.isInteger(v)) return { ok: false, value: null };
  if (v < lo || v > hi) return { ok: false, value: null };
  return { ok: true, value: v };
}

/**
 * Turn a Messages API response body into a suggestion, or null.
 *
 * Total by contract. Every failure — refusal, truncation, no text block,
 * malformed JSON, a wrong-typed field — returns null so the caller can carry
 * on with an untouched form.
 */
export function parseFlyerResponse(raw: unknown): FlyerSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const res = raw as Record<string, unknown>;

  // Two stop reasons produce output that does not honour the schema, both
  // documented: a refusal message takes precedence over the format, and a
  // max_tokens cutoff can truncate mid-object.
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;

  if (!Array.isArray(res.content)) return null;
  const block = res.content.find(
    (b): b is { type: string; text: string } =>
      !!b && typeof b === "object" && (b as { type?: unknown }).type === "text" &&
      typeof (b as { text?: unknown }).text === "string",
  );
  if (!block) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(block.text);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;

  // Every schema key must be present. A missing key means the response did not
  // come from this schema, so nothing in it can be trusted.
  for (const key of FLYER_SCHEMA.required) {
    if (!(key in p)) return null;
  }

  const strings = {
    title: text(p.title),
    script: text(p.script),
    ribbon: text(p.ribbon),
    sub: text(p.sub),
    caption: text(p.caption),
    alt: text(p.alt),
  };
  const numbers = {
    month: int(p.month, 1, 12),
    day: int(p.day, 1, 31),
    year: int(p.year, 1900, 2999),
    hour24: int(p.hour24, 0, 23),
    minute: int(p.minute, 0, 59),
  };
  for (const r of [...Object.values(strings), ...Object.values(numbers)]) {
    if (!r.ok) return null;
  }

  // Colours are the one soft field. They are cosmetic and every one of them
  // has a CSS fallback, so an unusable value drops to null rather than voiding
  // an otherwise good read of the text and the date.
  const colour = (v: unknown) => (typeof v === "string" && isHex(v) ? v.toLowerCase() : null);

  return {
    title: strings.title.value,
    script: strings.script.value,
    ribbon: strings.ribbon.value,
    sub: strings.sub.value,
    caption: strings.caption.value,
    alt: strings.alt.value,
    lang: p.lang === "es" ? "es" : "en",
    month: numbers.month.value,
    day: numbers.day.value,
    year: numbers.year.value,
    hour24: numbers.hour24.value,
    minute: numbers.minute.value,
    bg: colour(p.bg),
    accent: colour(p.accent),
    ink: colour(p.ink),
  };
}

// Today's Phoenix calendar date, as numeric parts. Arizona observes no DST, so
// the -7h shift is fixed. Reading UTC here would roll a late-evening event
// forward by a whole year on the boundary.
function phoenixToday(nowMs: number): { y: number; m: number; d: number } {
  const shifted = new Date(nowMs - 7 * 3_600_000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

// Does this calendar date exist? Guards Feb 30, Apr 31, and non-leap Feb 29.
function realDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Resolve a poster's month/day into a full 'YYYY-MM-DD'.
 *
 * Posters routinely print "AUGUST 29" with no year. Guessing wrong puts a date
 * a year out on the homepage, so the rule is explicit and testable: use the
 * printed year when there is one; otherwise take the next occurrence, treating
 * today as still ahead. Leap days walk forward to the next year that has one.
 */
export function normaliseEventDate(
  month: number | null,
  day: number | null,
  year: number | null,
  nowMs: number,
): string | null {
  if (month === null || day === null) return null;

  if (year !== null) {
    return realDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }

  const today = phoenixToday(nowMs);
  // Four candidates covers a leap day: the current year plus the next three.
  for (let i = 0; i <= 4; i++) {
    const y = today.y + i;
    if (!realDate(y, month, day)) continue;
    const notPast =
      y > today.y || month > today.m || (month === today.m && day >= today.d);
    if (notPast) return `${y}-${pad(month)}-${pad(day)}`;
  }
  return null;
}

// Which form fields a read is ever allowed to touch. Deliberately excludes
// liveLocal and focus: when the takeover should appear is a scheduling
// decision, and where to crop depends on the hero's geometry, not the poster.
//
// `lang` is split out because it is the one field whose type is not `string` —
// it is a two-value union with a non-empty default, so it is set explicitly
// rather than through the blank-filling path.
type TextField = Extract<
  keyof HeroFormState,
  "title" | "script" | "ribbon" | "sub" | "bg" | "accent" | "ink" | "startLocal"
>;
type Fillable = TextField | "lang";

/**
 * Layer a suggestion over the form. Only ever fills blanks — anything already
 * typed wins, so a read that arrives after the admin started typing cannot
 * clobber their work.
 *
 * Returns the set of fields that came from the read, so the UI can tag them
 * and clear the tag on edit.
 */
export function mergeSuggestions(
  form: HeroFormState,
  suggestion: FlyerSuggestion | null,
  nowMs: number,
): { form: HeroFormState; suggested: Set<Fillable> } {
  const suggested = new Set<Fillable>();
  if (!suggestion) return { form: { ...form }, suggested };

  const next: HeroFormState = { ...form };

  const fill = (key: TextField, value: string | null) => {
    if (!value) return;
    if (next[key] !== "") return; // the admin's own words win
    next[key] = value;
    suggested.add(key);
  };

  fill("title", suggestion.title);
  fill("script", suggestion.script);
  fill("ribbon", suggestion.ribbon);
  fill("sub", suggestion.sub);
  fill("bg", suggestion.bg);
  fill("accent", suggestion.accent);
  // `ink` is deliberately NOT suggested. The headline reads better as cream
  // derived from the ground than as whatever colour the poster set its own
  // title in — on the Palomazo flyer that is a gold which goes muddy against
  // the brown. The field stays editable; it just is not filled from a read.

  // A date without a time cannot make a datetime-local value, and inventing
  // midnight would put a wrong time on the homepage. Both parts or neither.
  const date = normaliseEventDate(suggestion.month, suggestion.day, suggestion.year, nowMs);
  if (date && suggestion.hour24 !== null && suggestion.minute !== null) {
    fill("startLocal", `${date}T${pad(suggestion.hour24)}:${pad(suggestion.minute)}`);
  }

  // Language has a non-empty default, so `fill` would never touch it. Only
  // override when the admin has not already chosen the other one.
  if (form.lang === "en" && suggestion.lang === "es") {
    next.lang = "es";
    suggested.add("lang");
  }

  return { form: next, suggested };
}
