import { describe, it, expect } from "vitest";
import { GRACE_MS } from "./fiestaSelect";
import { phoenixToday, websiteNow, type WebsiteRow } from "./websiteNow";

// The /cocina/website header answers three questions from the same rows the
// homepage reads: what is showing, what is waiting, and what on the grid has
// already happened. "Showing" must be exactly the homepage's answer, so it is
// selectHero, not a second rule.

const NOW = Date.parse("2026-09-17T19:00:00Z"); // Thu Sep 17, 12:00 PM Phoenix
const TODAY = "2026-09-17";

let n = 0;
function row(o: Partial<WebsiteRow> = {}): WebsiteRow {
  n += 1;
  return {
    id: `r${String(n).padStart(3, "0")}`,
    sort_key: n,
    is_hero: false,
    in_grid: false,
    is_evergreen: false,
    starts_at: null,
    event_date: null,
    hero_live_at: null,
    ...o,
  };
}

describe("phoenixToday", () => {
  it("is the Arizona calendar date, not UTC", () => {
    // 2026-09-18 03:00 UTC is still Sep 17 in Phoenix.
    expect(phoenixToday(Date.parse("2026-09-18T03:00:00Z"))).toBe("2026-09-17");
    expect(phoenixToday(NOW)).toBe("2026-09-17");
  });
});

describe("websiteNow: live", () => {
  it("is the homepage hero: newest eligible row", () => {
    const old = row({ is_hero: true, starts_at: "2026-09-20T03:00:00Z", sort_key: 1 });
    const fresh = row({ is_hero: true, starts_at: "2026-09-20T03:00:00Z", sort_key: 9 });
    const w = websiteNow([old, fresh], TODAY, NOW);
    expect(w.live?.id).toBe(fresh.id);
  });

  it("is null when nothing is eligible", () => {
    expect(websiteNow([row({ is_hero: false })], TODAY, NOW).live).toBeNull();
  });

  it("reports when a timed hero comes down", () => {
    const h = row({ is_hero: true, starts_at: "2026-09-20T03:00:00Z" });
    expect(websiteNow([h], TODAY, NOW).liveUntilMs).toBe(Date.parse("2026-09-20T03:00:00Z") + GRACE_MS);
  });

  it("has no end time for an undated or evergreen hero", () => {
    expect(websiteNow([row({ is_hero: true })], TODAY, NOW).liveUntilMs).toBeNull();
    expect(
      websiteNow([row({ is_hero: true, is_evergreen: true, starts_at: "2020-01-01T00:00:00Z" })], TODAY, NOW)
        .liveUntilMs,
    ).toBeNull();
  });
});

describe("websiteNow: queued", () => {
  it("lists every other current hero, soonest go-live first, then newest", () => {
    const live = row({ is_hero: true, starts_at: "2026-09-20T03:00:00Z", sort_key: 50 });
    const later = row({ is_hero: true, starts_at: "2026-10-01T03:00:00Z", hero_live_at: "2026-09-28T00:00:00Z", sort_key: 60 });
    const sooner = row({ is_hero: true, starts_at: "2026-10-01T03:00:00Z", hero_live_at: "2026-09-25T00:00:00Z", sort_key: 55 });
    const shadowed = row({ is_hero: true, starts_at: "2026-09-20T03:00:00Z", sort_key: 10 });
    const w = websiteNow([shadowed, later, live, sooner], TODAY, NOW);
    expect(w.live?.id).toBe(live.id);
    expect(w.queued.map((r) => r.id)).toEqual([sooner.id, later.id, shadowed.id]);
  });

  it("leaves out ended heroes and rows not flagged hero", () => {
    const ended = row({ is_hero: true, starts_at: "2026-09-10T03:00:00Z" });
    const notHero = row({ is_hero: false, starts_at: "2026-10-01T03:00:00Z" });
    expect(websiteNow([ended, notHero], TODAY, NOW).queued).toEqual([]);
  });
});

describe("websiteNow: pastInGrid", () => {
  it("lists grid rows whose event is over, newest first", () => {
    const a = row({ in_grid: true, starts_at: "2026-08-30T03:00:00Z", sort_key: 5 });
    const b = row({ in_grid: true, event_date: "2026-07-05", sort_key: 7 });
    const w = websiteNow([a, b], TODAY, NOW);
    expect(w.pastInGrid.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it("keeps evergreen, undated, upcoming and off-grid rows out", () => {
    const rows = [
      row({ in_grid: true, is_evergreen: true, event_date: "2020-01-01" }),
      row({ in_grid: true }),
      row({ in_grid: true, starts_at: "2026-10-01T03:00:00Z" }),
      row({ in_grid: false, event_date: "2020-01-01" }),
    ];
    expect(websiteNow(rows, TODAY, NOW).pastInGrid).toEqual([]);
  });

  it("does not call an event past during its six-hour grace window", () => {
    const tonight = row({ in_grid: true, starts_at: "2026-09-17T17:00:00Z" }); // started 2h ago
    expect(websiteNow([tonight], TODAY, NOW).pastInGrid).toEqual([]);
  });
});
