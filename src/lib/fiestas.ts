import { db } from "./db";
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
//
// The id tiebreaker matters more than it looks. loadFiestas has no ORDER BY,
// so equal sort_keys would otherwise resolve to whatever order Postgres
// returned rows in — stable in practice, guaranteed by nothing. While
// only_one_hero existed a tie between two heroes was impossible; without it,
// two rows sharing a featured_at (or both falling back to the same created_at)
// would make the rendered hero depend on the query plan.
export function orderFiestas(rows: FiestaRow[]): FiestaRow[] {
  return [...rows].sort(
    (a, b) => b.sort_key - a.sort_key || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
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

// Hero presentation helpers live in lib/heroTheme (pure, client-safe) so the
// composer's live preview can import them without pulling the Neon driver into
// the browser bundle. Re-exported here because every server-side caller — and
// every existing test — imports them from this module.
export { heroFocusCss, heroStyleVars } from "./heroTheme";

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

// Date helpers live in lib/heroDates (pure, client-safe). lib/fiestas imports
// the Neon driver, and both the fiesta manager and the campaign composer are
// client components — importing this module there ships the driver to the
// browser. Re-exported so existing server-side imports keep working.
export {
  heroWhen,
  toPhoenixFields,
  fromPhoenixFields,
  phoenixDateOf,
  type HeroWhen,
} from "./heroDates";

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
