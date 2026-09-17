// Which fiestas are current, which one is the hero, and in what order.
//
// Split out of lib/fiestas so client components can use it: lib/fiestas
// imports the Neon driver, and the /cocina/website manager needs the same
// "what is live" answer the homepage computes. lib/fiestas re-exports all of
// it, so server callers and existing tests are unchanged.
//
// Each function asks only for the columns it reads, so the admin's row type
// and the homepage's row type both fit without a cast.

export type CurrentRow = {
  is_evergreen: boolean;
  starts_at: string | null;
  event_date: string | null;
};
export type OrderRow = { id: string; sort_key: number };
export type LiveRow = { hero_live_at: string | null };
export type HeroRow = CurrentRow & OrderRow & LiveRow & { is_hero: boolean };

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
  f: CurrentRow,
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
export function orderFiestas<T extends OrderRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.sort_key - a.sort_key || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

// Has this fiesta's takeover window opened? Null means "live immediately",
// which is how every row published before hero_live_at existed behaves — so
// adding the column changes nothing for them.
//
// An unparseable value resolves to live, matching isCurrent's posture: a bad
// timestamp must not silently blank a takeover the admin thinks they
// published. Failing visible beats failing invisible.
export function isHeroLive(f: LiveRow, nowMs: number = Date.now()): boolean {
  if (!f.hero_live_at) return true;
  const opens = Date.parse(f.hero_live_at);
  if (!Number.isFinite(opens)) return true;
  return nowMs >= opens;
}

// Hero: the single fiesta that is flagged, still current, and whose go-live
// window has opened. More than one row can be flagged (a queued takeover
// alongside a live one), so the highest sort_key among the *eligible* rows
// wins — the filter runs before the tie-break, not after.
export function selectHero<T extends HeroRow>(
  rows: T[],
  today: string,
  nowMs: number = Date.now(),
): T | null {
  const heroes = orderFiestas(
    rows.filter((f) => f.is_hero && isCurrent(f, today, nowMs) && isHeroLive(f, nowMs)),
  );
  return heroes[0] ?? null;
}
