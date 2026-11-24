// Days Casa is closed on top of its regular Monday closing, and the notice the
// site shows in the days before.
//
// Pure and client-safe: the sitewide banner is a client component, and vitest
// pins every date decision here. Dates are Phoenix calendar dates,
// 'YYYY-MM-DD', so every comparison is a plain string comparison. Use
// phoenixToday (lib/websiteNow) to get "today".
//
// To add a holiday, add an entry. Everything turns itself on at announceFrom
// and off the day after the last closed date; nothing needs to be removed.

export type ClosureArt = { src: string; alt: string };

export type Closure = {
  id: string;
  /** "Thanksgiving". Read in "Closed for Thanksgiving". */
  name: string;
  /** Closed days, ascending. */
  dates: string[];
  /** First day the notice shows. */
  announceFrom: string;
  /** The closed days for the banner, e.g. "Thursday & Friday, Nov 26 & 27". */
  daysLabel: string;
  /** The closed days for the hours list, e.g. "Thu 11/26 & Fri 11/27". */
  shortDays: string;
  /** When Casa opens again, one sentence. */
  reopen: string;
  /** Stephanie's graphic, shown in the homepage hero while the notice is up. */
  art?: ClosureArt;
};

export const CLOSURES: Closure[] = [
  {
    id: "thanksgiving-2026",
    name: "Thanksgiving",
    dates: ["2026-11-26", "2026-11-27"],
    announceFrom: "2026-11-19",
    daysLabel: "Thursday & Friday, Nov 26 & 27",
    shortDays: "Thu 11/26 & Fri 11/27",
    reopen: "Back Saturday at 10 AM for brunch.",
    art: {
      src: "/images/HOLIDAY_THANKSGIVING_2026.jpg",
      alt:
        "Casa de Leyva holiday hours. Giving thanks: we will be closed Thursday, November 26, " +
        "Thanksgiving Day, and Friday, November 27. Grateful for our family, our team and you. " +
        "Happy Thanksgiving!",
    },
  },
];

function lastDate(c: Closure): string {
  return c.dates[c.dates.length - 1];
}

/** The closure that has Casa closed on this date, or null. */
export function closedOn(today: string, list: Closure[] = CLOSURES): Closure | null {
  return list.find((c) => c.dates.includes(today)) ?? null;
}

/**
 * The closure the site should be announcing today: from announceFrom through
 * the last closed date. When two overlap, the one that starts first wins.
 */
export function noticeFor(today: string, list: Closure[] = CLOSURES): Closure | null {
  const live = list
    .filter((c) => c.dates.length > 0 && c.announceFrom <= today && today <= lastDate(c))
    .sort((a, b) => (a.dates[0] < b.dates[0] ? -1 : a.dates[0] > b.dates[0] ? 1 : 0));
  return live[0] ?? null;
}

/** The banner's two lines for this closure on this date. */
export function bannerLines(c: Closure, today: string): { lead: string; reopen: string } {
  const lead = c.dates.includes(today)
    ? `Closed today for ${c.name}.`
    : `Closed for ${c.name}: ${c.daysLabel}.`;
  return { lead, reopen: c.reopen };
}
