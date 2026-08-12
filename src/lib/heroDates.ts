// Phoenix date/time helpers for the hero and the admin forms. These live apart
// from lib/fiestas on purpose: fiestas imports the Neon driver, and both the
// fiesta manager and the campaign composer are client components — importing
// fiestas there ships the driver to the browser. Nothing here touches the
// database.
//
// lib/fiestas re-exports everything below, so server-side callers are
// unaffected.

import type { HeroLang } from "./publish";

// --- hero date line -------------------------------------------------------
// Name tables are spelled out rather than pulled from Intl locale data so the
// output is identical everywhere and does not depend on which ICU set the
// runtime shipped with.
const DAY_NAMES: Record<HeroLang, readonly string[]> = {
  en: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
  es: ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"],
};

const MONTH_NAMES: Record<HeroLang, readonly string[]> = {
  en: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
       "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
  es: ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO",
       "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"],
};

export type HeroWhen = { day: string; date: string; time: string | null };

type Parts = { y: number; m: number; d: number; h: number; min: number };

// Project an absolute instant onto the Phoenix wall clock. Formatting through
// Intl is what makes this timezone-correct; reading getUTC*/getMonth off the
// Date directly is the day-shift bug.
function phoenixParts(ms: number): Parts | null {
  if (!Number.isFinite(ms)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  // Some ICU builds render local midnight as hour "24"; normalise it.
  const p = { y: get("year"), m: get("month"), d: get("day"), h: get("hour") % 24, min: get("minute") };
  return Object.values(p).every(Number.isFinite) ? p : null;
}

// 'YYYY-MM-DD' split into components — never `new Date(str)`, which parses a
// bare date as UTC midnight and lands on the previous day in Phoenix.
function dateParts(d: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return null;
  const p = { y: +m[1], m: +m[2], d: +m[3], h: 0, min: 0 };
  if (p.m < 1 || p.m > 12 || p.d < 1 || p.d > 31) return null;
  return p;
}

function weekdayIndex({ y, m, d }: Parts): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function clockLabel({ h, min }: Parts): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return min === 0
    ? `${hour12} ${suffix}`
    : `${hour12}:${String(min).padStart(2, "0")} ${suffix}`;
}

// The hero's date line. Prefers the precise `starts_at` (gives a time), falls
// back to the date-only `event_date`, and returns null when neither is usable
// so the caller can render the evergreen hero instead.
export function heroWhen(
  startsAt: string | null,
  eventDate: string | null,
  lang: HeroLang,
): HeroWhen | null {
  const fromStart = startsAt ? phoenixParts(Date.parse(startsAt)) : null;
  const p = fromStart ?? (eventDate ? dateParts(eventDate) : null);
  if (!p) return null;

  const day = DAY_NAMES[lang][weekdayIndex(p)];
  const month = MONTH_NAMES[lang][p.m - 1];
  if (!day || !month) return null;

  return {
    day,
    date: lang === "es" ? `${p.d} DE ${month}` : `${month} ${p.d}`,
    time: fromStart ? clockLabel(p) : null,
  };
}


// --- admin form round-trip ------------------------------------------------
// The admin thinks in Phoenix wall-clock ("29 Aug, 8:00 PM"); the column is
// timestamptz. These two convert between the pair of form fields and the stored
// instant. America/Phoenix observes no DST, so the -07:00 offset is fixed and
// safe to hardcode — this is NOT true of a generic timezone.
const PHOENIX_OFFSET = "-07:00";

// Stored instant → the two <input> values. Empty strings when unset, which is
// what an uncontrolled-to-controlled React input needs.
export function toPhoenixFields(startsAt: string | null): { date: string; time: string } {
  const p = startsAt ? phoenixParts(Date.parse(startsAt)) : null;
  if (!p) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p.y}-${pad(p.m)}-${pad(p.d)}`,
    time: `${pad(p.h)}:${pad(p.min)}`,
  };
}

// The two <input> values → an ISO UTC instant for storage. Returns null when
// either field is blank (meaning "no start time") or malformed, so a typo
// clears the time rather than writing a garbage instant.
export function fromPhoenixFields(date: string, time: string): string | null {
  if (!date || !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  if (!dateParts(date)) return null;
  const [h, min] = time.split(":").map(Number);
  if (h > 23 || min > 59) return null;
  const ms = Date.parse(`${date}T${time}:00${PHOENIX_OFFSET}`);
  return Number.isFinite(ms) ? new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z") : null;
}

// The Phoenix calendar date an instant falls on. Keeps `event_date` (which
// drives grid ordering and the admin's date column) consistent with a
// `starts_at` set through the admin form.
export function phoenixDateOf(startsAt: string | null): string | null {
  return toPhoenixFields(startsAt).date || null;
}
