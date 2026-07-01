import { describe, it, expect } from "vitest";
import {
  GRID_LIMIT,
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
    is_hero: false,
    in_grid: true,
    on_fiestas_page: true,
    is_evergreen: false,
    sort_key: 0,
    ...overrides,
  };
}

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
    ).toEqual({ src: "/images/FLY_X.jpg", alt: "Alt", cap: "Cap" });
  });
  it("omits cap when caption is null", () => {
    expect(toFlyer(row({ caption: null })).cap).toBeUndefined();
  });
});
