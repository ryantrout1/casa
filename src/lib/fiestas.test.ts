import { describe, it, expect } from "vitest";
import {
  GRID_LIMIT,
  heroWhen,
  toPhoenixFields,
  fromPhoenixFields,
  phoenixDateOf,
  isCurrent,
  orderFiestas,
  selectGrid,
  selectAll,
  selectHero,
  toFlyer,
  type FiestaRow,
} from "./fiestas";

// Fiestas → Neon (Phase 1). These cover the pure selection logic that drives
// the three website surfaces: hero (one), homepage grid (six, newest-first),
// and the fiestas page (all). Date filtering keeps past dated events off the
// upcoming surfaces while evergreen/undated ones persist.

const TODAY = "2026-07-01";

function row(overrides: Partial<FiestaRow> = {}): FiestaRow {
  return {
    id: overrides.id ?? "id-" + Math.random().toString(36).slice(2),
    image_url: "/api/img/abc",
    alt: "A flyer",
    caption: "A caption",
    event_date: null,
    starts_at: null,
    is_hero: false,
    in_grid: true,
    on_fiestas_page: true,
    is_evergreen: false,
    hero_title: null,
    hero_script: null,
    hero_ribbon: null,
    hero_sub: null,
    hero_lang: "en",
    sort_key: 0,
    ...overrides,
  };
}

// Palomazo: Saturday 29 Aug 2026, 8:00 PM Phoenix. America/Phoenix has no DST,
// so it is a fixed UTC-7 — 8 PM local is 03:00Z the following calendar day.
// That offset is the whole point of these fixtures: a naive UTC read reports
// the wrong date and the wrong day name.
const PALOMAZO_START = "2026-08-30T03:00:00Z";
const phx = (iso: string) => Date.parse(iso);

describe("GRID_LIMIT", () => {
  it("is 6", () => {
    expect(GRID_LIMIT).toBe(6);
  });
});

describe("isCurrent", () => {
  it("keeps a future dated event", () => {
    expect(isCurrent(row({ event_date: "2026-12-31" }), TODAY)).toBe(true);
  });
  it("keeps an event dated today", () => {
    expect(isCurrent(row({ event_date: TODAY }), TODAY)).toBe(true);
  });
  it("drops a past dated event", () => {
    expect(isCurrent(row({ event_date: "2026-06-30" }), TODAY)).toBe(false);
  });
  it("keeps an undated (null) event", () => {
    expect(isCurrent(row({ event_date: null }), TODAY)).toBe(true);
  });
  it("keeps an evergreen event even when its date is in the past", () => {
    expect(
      isCurrent(row({ event_date: "2020-01-01", is_evergreen: true }), TODAY),
    ).toBe(true);
  });
});

describe("orderFiestas", () => {
  it("orders by sort_key descending (newest-announced first)", () => {
    const out = orderFiestas([
      row({ id: "low", sort_key: 1 }),
      row({ id: "high", sort_key: 3 }),
      row({ id: "mid", sort_key: 2 }),
    ]);
    expect(out.map((f) => f.id)).toEqual(["high", "mid", "low"]);
  });
  it("does not mutate the input array", () => {
    const input = [row({ id: "a", sort_key: 1 }), row({ id: "b", sort_key: 2 })];
    orderFiestas(input);
    expect(input.map((f) => f.id)).toEqual(["a", "b"]);
  });
});

describe("selectGrid", () => {
  it("returns at most GRID_LIMIT rows", () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      row({ id: "g" + i, sort_key: i }),
    );
    expect(selectGrid(rows, TODAY)).toHaveLength(GRID_LIMIT);
  });
  it("keeps the six newest and drops the oldest when a seventh is added", () => {
    // seven grid-eligible rows, sort_key 0..6 — the sort_key=0 one must fall off
    const rows = Array.from({ length: 7 }, (_, i) =>
      row({ id: "g" + i, sort_key: i }),
    );
    const ids = selectGrid(rows, TODAY).map((f) => f.id);
    expect(ids).toEqual(["g6", "g5", "g4", "g3", "g2", "g1"]);
    expect(ids).not.toContain("g0");
  });
  it("excludes rows not flagged for the grid", () => {
    const rows = [
      row({ id: "in", in_grid: true, sort_key: 2 }),
      row({ id: "out", in_grid: false, sort_key: 3 }),
    ];
    expect(selectGrid(rows, TODAY).map((f) => f.id)).toEqual(["in"]);
  });
  it("excludes past dated events", () => {
    const rows = [
      row({ id: "past", event_date: "2026-06-01", sort_key: 5 }),
      row({ id: "future", event_date: "2026-08-01", sort_key: 1 }),
    ];
    expect(selectGrid(rows, TODAY).map((f) => f.id)).toEqual(["future"]);
  });
});

describe("selectAll", () => {
  it("includes every row flagged for the fiestas page, ordered", () => {
    const rows = [
      row({ id: "a", on_fiestas_page: true, sort_key: 1 }),
      row({ id: "b", on_fiestas_page: true, sort_key: 3 }),
      row({ id: "c", on_fiestas_page: true, sort_key: 2 }),
    ];
    expect(selectAll(rows).map((f) => f.id)).toEqual(["b", "c", "a"]);
  });
  it("does NOT apply the date filter — keeps past dated events as archive", () => {
    const rows = [
      row({ id: "past", on_fiestas_page: true, event_date: "2020-01-01", sort_key: 1 }),
    ];
    expect(selectAll(rows).map((f) => f.id)).toEqual(["past"]);
  });
  it("excludes rows not flagged for the fiestas page", () => {
    const rows = [
      row({ id: "on", on_fiestas_page: true, sort_key: 1 }),
      row({ id: "off", on_fiestas_page: false, sort_key: 2 }),
    ];
    expect(selectAll(rows).map((f) => f.id)).toEqual(["on"]);
  });
});

describe("surface independence", () => {
  it("a row on the fiestas page but not the grid appears only on the page", () => {
    const rows = [
      row({ id: "pageonly", in_grid: false, on_fiestas_page: true, sort_key: 1 }),
    ];
    expect(selectGrid(rows, TODAY).map((f) => f.id)).toEqual([]);
    expect(selectAll(rows).map((f) => f.id)).toEqual(["pageonly"]);
  });
});

describe("selectHero", () => {
  it("returns the single current hero", () => {
    const rows = [
      row({ id: "hero", is_hero: true, sort_key: 5 }),
      row({ id: "other", is_hero: false, sort_key: 9 }),
    ];
    expect(selectHero(rows, TODAY)?.id).toBe("hero");
  });
  it("returns null when no hero is flagged", () => {
    expect(selectHero([row({ is_hero: false })], TODAY)).toBeNull();
  });
  it("returns null when the only hero is a past dated event", () => {
    const rows = [row({ id: "h", is_hero: true, event_date: "2026-06-01" })];
    expect(selectHero(rows, TODAY)).toBeNull();
  });
  it("picks the highest sort_key when more than one is flagged (defensive)", () => {
    const rows = [
      row({ id: "old", is_hero: true, sort_key: 1 }),
      row({ id: "new", is_hero: true, sort_key: 2 }),
    ];
    expect(selectHero(rows, TODAY)?.id).toBe("new");
  });
});

describe("toFlyer", () => {
  it("maps image_url→src, alt→alt, caption→cap", () => {
    expect(
      toFlyer(row({ image_url: "/images/FLY_X.jpg", alt: "Alt", caption: "Cap" })),
    ).toMatchObject({ src: "/images/FLY_X.jpg", alt: "Alt", cap: "Cap" });
  });
  it("omits cap when caption is null", () => {
    expect(toFlyer(row({ caption: null })).cap).toBeUndefined();
  });
});

describe("isCurrent — starts_at grace window", () => {
  // The bug this replaces: gating on `event_date >= today` flips the hero at
  // Phoenix midnight, which for an 8 PM event lands mid-party. The grace window
  // measures from the actual start instead.
  const ev = row({ event_date: "2026-08-29", starts_at: PALOMAZO_START });

  it("keeps the event live during it (11 PM local, 3h in)", () => {
    expect(isCurrent(ev, "2026-08-29", phx("2026-08-30T06:00:00Z"))).toBe(true);
  });

  it("keeps the event live past local midnight (1 AM local, 5h in)", () => {
    expect(isCurrent(ev, "2026-08-30", phx("2026-08-30T08:00:00Z"))).toBe(true);
  });

  it("drops the event once the 6h grace expires (3 AM local, 7h in)", () => {
    expect(isCurrent(ev, "2026-08-30", phx("2026-08-30T10:00:00Z"))).toBe(false);
  });

  it("keeps the event before it starts", () => {
    expect(isCurrent(ev, "2026-08-01", phx("2026-08-01T12:00:00Z"))).toBe(true);
  });

  it("ignores event_date entirely when starts_at is set", () => {
    // event_date is stale/wrong here; starts_at must win.
    const stale = row({ event_date: "2020-01-01", starts_at: PALOMAZO_START });
    expect(isCurrent(stale, "2026-08-29", phx("2026-08-30T06:00:00Z"))).toBe(true);
  });

  it("still honours evergreen ahead of starts_at", () => {
    const forever = row({ starts_at: PALOMAZO_START, is_evergreen: true });
    expect(isCurrent(forever, "2027-01-01", phx("2027-01-01T00:00:00Z"))).toBe(true);
  });

  it("falls back to event_date when starts_at is null", () => {
    expect(isCurrent(row({ event_date: "2026-08-29" }), "2026-08-30")).toBe(false);
    expect(isCurrent(row({ event_date: "2026-08-29" }), "2026-08-29")).toBe(true);
  });
});

describe("heroWhen", () => {
  it("formats a Spanish event from starts_at", () => {
    expect(heroWhen(PALOMAZO_START, "2026-08-29", "es")).toEqual({
      day: "SÁBADO",
      date: "29 DE AGOSTO",
      time: "8 PM",
    });
  });

  it("formats an English event with month-first word order", () => {
    expect(heroWhen(PALOMAZO_START, "2026-08-29", "en")).toEqual({
      day: "SATURDAY",
      date: "AUGUST 29",
      time: "8 PM",
    });
  });

  it("does not day-shift across the UTC boundary", () => {
    // 03:00Z on the 30th is still the 29th in Phoenix. A naive UTC read would
    // say SUNDAY / 30 — that is the failure this pins.
    const w = heroWhen(PALOMAZO_START, null, "es");
    expect(w?.day).toBe("SÁBADO");
    expect(w?.date).toBe("29 DE AGOSTO");
  });

  it("includes minutes only when non-zero", () => {
    // 6:30 PM Phoenix = 01:30Z next day.
    expect(heroWhen("2026-06-25T01:30:00Z", null, "en")?.time).toBe("6:30 PM");
  });

  it("renders local midnight as 12 AM", () => {
    expect(heroWhen("2026-06-25T07:00:00Z", null, "en")?.time).toBe("12 AM");
  });

  it("renders local noon as 12 PM", () => {
    expect(heroWhen("2026-06-25T19:00:00Z", null, "en")?.time).toBe("12 PM");
  });

  it("falls back to event_date with no time when starts_at is null", () => {
    expect(heroWhen(null, "2026-08-29", "es")).toEqual({
      day: "SÁBADO",
      date: "29 DE AGOSTO",
      time: null,
    });
  });

  it("component-parses the event_date fallback without shifting", () => {
    // new Date("2026-08-01") is UTC midnight, which is 31 July in Phoenix.
    // Component parsing must keep it on the 1st.
    expect(heroWhen(null, "2026-08-01", "es")?.date).toBe("1 DE AGOSTO");
    expect(heroWhen(null, "2026-08-01", "en")?.day).toBe("SATURDAY");
  });

  it("returns null when there is no date at all", () => {
    expect(heroWhen(null, null, "es")).toBeNull();
  });

  it("returns null for an unparseable value rather than throwing", () => {
    expect(heroWhen("not-a-date", null, "en")).toBeNull();
    expect(heroWhen(null, "2026-13", "en")).toBeNull();
  });
});

describe("toFlyer — hero copy passthrough", () => {
  it("carries starts_at and the hero copy fields", () => {
    const f = toFlyer(
      row({
        starts_at: PALOMAZO_START,
        event_date: "2026-08-29",
        hero_title: "EL PALOMAZO",
        hero_script: "en Casa",
        hero_ribbon: "UNA NOCHE DE KARAOKE MEXICANO",
        hero_sub: "Canta los éxitos de tus ídolos",
        hero_lang: "es",
      }),
    );
    expect(f.startsAt).toBe(PALOMAZO_START);
    expect(f.eventDate).toBe("2026-08-29");
    expect(f.heroTitle).toBe("EL PALOMAZO");
    expect(f.heroScript).toBe("en Casa");
    expect(f.heroRibbon).toBe("UNA NOCHE DE KARAOKE MEXICANO");
    expect(f.heroSub).toBe("Canta los éxitos de tus ídolos");
    expect(f.heroLang).toBe("es");
  });

  it("leaves hero copy undefined when unset", () => {
    const f = toFlyer(row());
    expect(f.startsAt).toBeNull();
    expect(f.heroTitle).toBeNull();
  });
});

describe("Phoenix admin field round-trip", () => {
  it("splits a stored instant into Phoenix date and time fields", () => {
    expect(toPhoenixFields(PALOMAZO_START)).toEqual({
      date: "2026-08-29",
      time: "20:00",
    });
  });

  it("returns empty fields when there is no start time", () => {
    expect(toPhoenixFields(null)).toEqual({ date: "", time: "" });
    expect(toPhoenixFields("nonsense")).toEqual({ date: "", time: "" });
  });

  it("builds a UTC instant from Phoenix form fields", () => {
    expect(fromPhoenixFields("2026-08-29", "20:00")).toBe(PALOMAZO_START);
  });

  it("round-trips without drift", () => {
    const f = toPhoenixFields(PALOMAZO_START);
    expect(fromPhoenixFields(f.date, f.time)).toBe(PALOMAZO_START);
  });

  it("handles a morning time that stays on the same UTC day", () => {
    expect(fromPhoenixFields("2026-08-29", "09:30")).toBe("2026-08-29T16:30:00Z");
  });

  it("returns null for blank or malformed input", () => {
    expect(fromPhoenixFields("", "20:00")).toBeNull();
    expect(fromPhoenixFields("2026-08-29", "")).toBeNull();
    expect(fromPhoenixFields("29-08-2026", "20:00")).toBeNull();
    expect(fromPhoenixFields("2026-08-29", "8pm")).toBeNull();
    expect(fromPhoenixFields("2026-13-01", "20:00")).toBeNull();
    expect(fromPhoenixFields("2026-08-29", "25:00")).toBeNull();
  });

  it("derives the Phoenix calendar date, not the UTC one", () => {
    // The instant is 30 Aug in UTC but 29 Aug in Phoenix.
    expect(phoenixDateOf(PALOMAZO_START)).toBe("2026-08-29");
    expect(phoenixDateOf(null)).toBeNull();
  });
});
