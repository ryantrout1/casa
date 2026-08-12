import { db } from "./db";
import { isHex, pickInk } from "./palette";
import type { HeroLang } from "./publish";

// A fiesta row as read from Neon. `sort_key` is derived at query time
// (epoch of featured_at, falling back to created_at) so ordering is a plain
// numeric comparison — deterministic and unit-testable. `event_date` is cast
// to text ('YYYY-MM-DD') so date checks are string comparisons, independent of
// how the driver hydrates a `date` column.
export type FiestaRow = {
  id: string;
  image_url: string;
  alt: string;
  caption: string | null;
  event_date: string | null;
  // ISO-8601 UTC ('YYYY-MM-DDTHH:MM:SSZ'), cast in SQL so the driver can never
  // hand back a bare local-looking string. Null for undated/evergreen fiestas.
  starts_at: string | null;
  is_hero: boolean;
  in_grid: boolean;
  on_fiestas_page: boolean;
  is_evergreen: boolean;
  hero_title: string | null;
  hero_script: string | null;
  hero_ribbon: string | null;
  hero_sub: string | null;
  hero_lang: HeroLang;
  // Crop position for the flyer, 0–100. The cover window's height varies with
  // viewport (fluid art width against a fixed hero height), so the right crop
  // depends on where the faces sit in each individual flyer. Null → 50%.
  hero_focus: number | null;
  // When the takeover starts showing. Null → immediately, which is what every
  // row published before this column existed does. Distinct from starts_at
  // (the event) and from the campaign's scheduled_for (the email send).
  hero_live_at: string | null;
  // Section colours sampled from the flyer. Null → the CSS fallbacks, i.e.
  // exactly what the hero looked like before this column existed.
  hero_bg: string | null;
  hero_accent: string | null;
  hero_ink: string | null;
  sort_key: number;
};

// Which language the *generated* date line is written in. The free-text hero
// fields are whatever Stephanie's flyer says, so a Spanish date line above an
// English ribbon is a supported combination, not a bug. Declared in lib/publish
// (client-safe) and re-exported here for callers already importing it.
export type { HeroLang };

// The presentational shape FiestaGallery consumes. Structurally identical to
// FiestaGallery's FlyerItem; kept separate to avoid importing a client
// component (and its non-server deps) into this server module.
export type Flyer = {
  src: string;
  alt: string;
  cap?: string;
  startsAt: string | null;
  eventDate: string | null;
  heroTitle: string | null;
  heroScript: string | null;
  heroRibbon: string | null;
  heroSub: string | null;
  heroLang: HeroLang;
  heroFocus: number | null;
  heroLiveAt: string | null;
  heroBg: string | null;
  heroAccent: string | null;
  heroInk: string | null;
};

// The homepage grid shows at most this many fiestas.
export const GRID_LIMIT = 6;

// How long a fiesta stays live past its start time. An evening event runs past
// local midnight, so expiring on the calendar date would pull the hero down
// mid-event. Six hours covers an 8 PM start through last call.
export const GRACE_MS = 6 * 60 * 60 * 1000;

// Is this fiesta live for the "upcoming" surfaces (hero + grid)?
// Evergreen (recurring) and undated fiestas always are. When `starts_at` is
// known it is authoritative and measured against real elapsed time; otherwise
// we fall back to the coarser calendar-date comparison. `nowMs` is injectable
// so the window is testable without faking the clock.
export function isCurrent(
  f: FiestaRow,
  today: string,
  nowMs: number = Date.now(),
): boolean {
  if (f.is_evergreen) return true;
  if (f.starts_at) {
    const start = Date.parse(f.starts_at);
    // An unparseable timestamp must not silently drop the fiesta; fall through
    // to the date comparison below instead.
    if (Number.isFinite(start)) return nowMs < start + GRACE_MS;
  }
  if (!f.event_date) return true;
  return f.event_date >= today;
}

// Newest-announced first: higher sort_key leads. Pure, non-mutating.
export function orderFiestas(rows: FiestaRow[]): FiestaRow[] {
  return [...rows].sort((a, b) => b.sort_key - a.sort_key);
}

export function toFlyer(f: FiestaRow): Flyer {
  return {
    src: f.image_url,
    alt: f.alt,
    cap: f.caption ?? undefined,
    startsAt: f.starts_at,
    eventDate: f.event_date,
    heroTitle: f.hero_title,
    heroScript: f.hero_script,
    heroRibbon: f.hero_ribbon,
    heroSub: f.hero_sub,
    heroLang: f.hero_lang,
    heroFocus: f.hero_focus,
    heroLiveAt: f.hero_live_at,
    heroBg: f.hero_bg,
    heroAccent: f.hero_accent,
    heroInk: f.hero_ink,
  };
}

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

// Homepage grid: grid-flagged, still current, newest first, capped at 6.
export function selectGrid(rows: FiestaRow[], today: string): FiestaRow[] {
  return orderFiestas(
    rows.filter((f) => f.in_grid && isCurrent(f, today)),
  ).slice(0, GRID_LIMIT);
}

// Fiestas page: everything flagged for it, newest first, no date filter.
export function selectAll(rows: FiestaRow[]): FiestaRow[] {
  return orderFiestas(rows.filter((f) => f.on_fiestas_page));
}

// Has this fiesta's takeover window opened? Null means "live immediately",
// which is how every row published before hero_live_at existed behaves — so
// adding the column changes nothing for them.
//
// An unparseable value resolves to live, matching isCurrent's posture: a bad
// timestamp must not silently blank a takeover the admin thinks they
// published. Failing visible beats failing invisible.
export function isHeroLive(f: FiestaRow, nowMs: number = Date.now()): boolean {
  if (!f.hero_live_at) return true;
  const opens = Date.parse(f.hero_live_at);
  if (!Number.isFinite(opens)) return true;
  return nowMs >= opens;
}

// The object-position the flyer should be cropped at. Clamped and rounded here
// rather than trusted from the row, because this value lands in an inline
// style — the DB CHECK is the other half of the same guard.
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

// Hero: the single fiesta that is flagged, still current, and whose go-live
// window has opened. More than one row can be flagged (a queued takeover
// alongside a live one), so the highest sort_key among the *eligible* rows
// wins — the filter runs before the tie-break, not after.
export function selectHero(
  rows: FiestaRow[],
  today: string,
  nowMs: number = Date.now(),
): FiestaRow | null {
  const heroes = orderFiestas(
    rows.filter((f) => f.is_hero && isCurrent(f, today, nowMs) && isHeroLive(f, nowMs)),
  );
  return heroes[0] ?? null;
}

// America/Phoenix has no DST, so a fixed offset is safe. en-CA yields ISO
// 'YYYY-MM-DD', matching the event_date cast for direct string comparison.
function phoenixToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
}

async function loadFiestas(): Promise<FiestaRow[]> {
  try {
    const sql = db();
    return (await sql`
      select
        id,
        image_url,
        alt,
        caption,
        event_date::text as event_date,
        to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as starts_at,
        is_hero,
        in_grid,
        on_fiestas_page,
        is_evergreen,
        hero_title,
        hero_script,
        hero_ribbon,
        hero_sub,
        hero_lang,
        hero_focus,
        to_char(hero_live_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hero_live_at,
        hero_bg,
        hero_accent,
        hero_ink,
        extract(epoch from coalesce(featured_at, created_at))::float8 as sort_key
      from fiestas
    `) as FiestaRow[];
  } catch {
    // Never let a DB hiccup blank the homepage — callers fall back gracefully.
    return [];
  }
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

export async function getGridFiestas(): Promise<Flyer[]> {
  const rows = await loadFiestas();
  return selectGrid(rows, phoenixToday()).map(toFlyer);
}

export async function getAllFiestas(): Promise<Flyer[]> {
  const rows = await loadFiestas();
  return selectAll(rows).map(toFlyer);
}

export async function getHeroFiesta(): Promise<Flyer | null> {
  const rows = await loadFiestas();
  const hero = selectHero(rows, phoenixToday());
  return hero ? toFlyer(hero) : null;
}
