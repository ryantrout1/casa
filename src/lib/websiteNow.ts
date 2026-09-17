import { GRACE_MS, isCurrent, orderFiestas, selectHero, type HeroRow } from "./fiestaSelect";

// What the website is showing, for the /cocina/website header.
//
// Pure and client-safe. The live hero is selectHero itself, so the admin can
// never describe a different hero than the homepage renders.

export type WebsiteRow = HeroRow & { in_grid: boolean };

export type WebsiteNow<T> = {
  /** The row the homepage hero shows right now, or null for the brand hero. */
  live: T | null;
  /** When the live hero comes down (start + grace), or null when it has no end. */
  liveUntilMs: number | null;
  /** Other hero-flagged rows that are still current, in the order they would show. */
  queued: T[];
  /** Grid rows whose event is over. They still show until someone removes them. */
  pastInGrid: T[];
};

/** Today's date in Arizona, 'YYYY-MM-DD'. Arizona has no DST. */
export function phoenixToday(nowMs: number): string {
  return new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
}

function liveAt(r: WebsiteRow): number | null {
  if (!r.hero_live_at) return null;
  const t = Date.parse(r.hero_live_at);
  return Number.isFinite(t) ? t : null;
}

export function websiteNow<T extends WebsiteRow>(
  rows: T[],
  today: string,
  nowMs: number,
): WebsiteNow<T> {
  const live = selectHero(rows, today, nowMs);

  let liveUntilMs: number | null = null;
  if (live && !live.is_evergreen && live.starts_at) {
    const start = Date.parse(live.starts_at);
    if (Number.isFinite(start)) liveUntilMs = start + GRACE_MS;
  }

  // Waiting rows: a future go-live comes first, soonest first, because those
  // are the ones that will take over on their own. The rest are shadowed by a
  // newer hero and only show if it is removed, newest first as selectHero
  // would pick them.
  const waiting = orderFiestas(
    rows.filter((r) => r.is_hero && r !== live && isCurrent(r, today, nowMs)),
  );
  const timed = waiting
    .filter((r) => {
      const t = liveAt(r);
      return t !== null && t > nowMs;
    })
    .sort((a, b) => (liveAt(a) ?? 0) - (liveAt(b) ?? 0));
  const queued = [...timed, ...waiting.filter((r) => !timed.includes(r))];

  const pastInGrid = orderFiestas(
    rows.filter(
      (r) =>
        r.in_grid &&
        !r.is_evergreen &&
        (r.starts_at !== null || r.event_date !== null) &&
        !isCurrent(r, today, nowMs),
    ),
  );

  return { live, liveUntilMs, queued, pastInGrid };
}
