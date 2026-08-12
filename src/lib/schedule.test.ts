import { describe, it, expect } from "vitest";
import {
  parseDraftConfig,
  parseHeroCopy,
  isDraftEmpty,
  phoenixLocalToUtcISO,
  utcToPhoenixLocalInput,
  type DraftConfig,
} from "./schedule";

// Drafts store their intended destinations + flyer as a JSON blob (publish_config).
// parseDraftConfig turns whatever comes back from the DB into a safe, typed shape;
// isDraftEmpty decides whether there's anything worth saving.

describe("parseDraftConfig", () => {
  it("returns empty defaults for null / undefined / junk", () => {
    const empty: DraftConfig = { channels: [], flyer: {} };
    expect(parseDraftConfig(null)).toEqual(empty);
    expect(parseDraftConfig(undefined)).toEqual(empty);
    expect(parseDraftConfig("nonsense")).toEqual(empty);
    expect(parseDraftConfig(42)).toEqual(empty);
  });

  it("keeps only valid channels, in the given order", () => {
    const cfg = parseDraftConfig({ channels: ["email", "grid", "bogus", "hero"], flyer: {} });
    expect(cfg.channels).toEqual(["email", "grid", "hero"]);
  });

  it("passes through flyer fields as strings and drops the rest", () => {
    const cfg = parseDraftConfig({
      channels: ["hero"],
      flyer: { imageUrl: "/api/img/x", caption: "Cap", alt: "Alt", eventDate: "2026-07-04", extra: 9 },
    });
    expect(cfg.flyer).toEqual({
      imageUrl: "/api/img/x",
      caption: "Cap",
      alt: "Alt",
      eventDate: "2026-07-04",
    });
  });

  it("tolerates a missing flyer or missing channels", () => {
    expect(parseDraftConfig({ channels: ["email"] })).toEqual({ channels: ["email"], flyer: {} });
    expect(parseDraftConfig({ flyer: { caption: "hi" } })).toEqual({
      channels: [],
      flyer: { caption: "hi" },
    });
  });

  it("coerces a non-array channels field to empty", () => {
    expect(parseDraftConfig({ channels: "email", flyer: {} }).channels).toEqual([]);
  });
});

describe("isDraftEmpty", () => {
  const noFlyer = {};
  it("is true only when subject, message, image, and flyer are all empty", () => {
    expect(isDraftEmpty("", "", false, noFlyer)).toBe(true);
    expect(isDraftEmpty("   ", "   ", false, noFlyer)).toBe(true);
  });
  it("is false when a subject is present", () => {
    expect(isDraftEmpty("Taco night", "", false, noFlyer)).toBe(false);
  });
  it("is false when the message has text", () => {
    expect(isDraftEmpty("", "come by tonight", false, noFlyer)).toBe(false);
  });
  it("is false when the message has an image", () => {
    expect(isDraftEmpty("", "", true, noFlyer)).toBe(false);
  });
  it("is false when a flyer image is attached", () => {
    expect(isDraftEmpty("", "", false, { imageUrl: "/api/img/x" })).toBe(false);
  });
});

// Phase 2: scheduling. Arizona never observes DST, so Phoenix time is a fixed
// UTC-7 — the composer's datetime-local input converts to/from UTC with these.

describe("phoenixLocalToUtcISO", () => {
  it("converts a Phoenix-local datetime to UTC ISO (+7h)", () => {
    expect(phoenixLocalToUtcISO("2026-07-04T18:00")).toBe("2026-07-05T01:00:00.000Z");
  });

  it("handles midnight and end-of-year boundaries", () => {
    expect(phoenixLocalToUtcISO("2026-12-31T20:30")).toBe("2027-01-01T03:30:00.000Z");
    expect(phoenixLocalToUtcISO("2026-01-15T00:00")).toBe("2026-01-15T07:00:00.000Z");
  });

  it("rejects anything that isn't YYYY-MM-DDTHH:mm", () => {
    expect(phoenixLocalToUtcISO("")).toBeNull();
    expect(phoenixLocalToUtcISO("2026-7-4T18:00")).toBeNull();
    expect(phoenixLocalToUtcISO("2026-07-04 18:00")).toBeNull();
    expect(phoenixLocalToUtcISO("2026-07-04T18:00:00")).toBeNull();
    expect(phoenixLocalToUtcISO("tomorrow at six")).toBeNull();
  });
});

describe("utcToPhoenixLocalInput", () => {
  it("converts a UTC ISO timestamp back to a Phoenix datetime-local value (-7h)", () => {
    expect(utcToPhoenixLocalInput("2026-07-05T01:00:00.000Z")).toBe("2026-07-04T18:00");
  });

  it("handles the year boundary going backwards", () => {
    expect(utcToPhoenixLocalInput("2027-01-01T03:30:00.000Z")).toBe("2026-12-31T20:30");
  });

  it("returns empty string for junk", () => {
    expect(utcToPhoenixLocalInput("")).toBe("");
    expect(utcToPhoenixLocalInput("not a date")).toBe("");
  });

  it("round-trips with phoenixLocalToUtcISO", () => {
    const local = "2026-07-04T18:00";
    expect(utcToPhoenixLocalInput(phoenixLocalToUtcISO(local)!)).toBe(local);
  });
});

// Hero copy rides along inside the flyer blob. Two publish paths read it —
// the immediate route and the cron drain — so the parser is the single seam
// that keeps them from disagreeing.
describe("parseHeroCopy", () => {
  const FULL = {
    startsAt: "2026-08-30T03:00:00Z",
    title: "EL PALOMAZO",
    script: "en Casa",
    ribbon: "UNA NOCHE DE KARAOKE MEXICANO",
    sub: "Canta los éxitos de tus ídolos",
    lang: "es",
  };

  it("round-trips a complete hero copy block", () => {
    expect(parseHeroCopy(FULL)).toEqual(FULL);
  });

  it("returns undefined when there is nothing to carry", () => {
    expect(parseHeroCopy(undefined)).toBeUndefined();
    expect(parseHeroCopy(null)).toBeUndefined();
    expect(parseHeroCopy("nonsense")).toBeUndefined();
    expect(parseHeroCopy({})).toBeUndefined();
  });

  it("keeps a partial block", () => {
    expect(parseHeroCopy({ title: "LOTERÍA NIGHT" })).toEqual({ title: "LOTERÍA NIGHT" });
  });

  it("drops an invalid language rather than passing it to the CHECK constraint", () => {
    expect(parseHeroCopy({ title: "X", lang: "fr" })).toEqual({ title: "X" });
    expect(parseHeroCopy({ title: "X", lang: 7 })).toEqual({ title: "X" });
  });

  it("keeps both valid languages", () => {
    expect(parseHeroCopy({ title: "X", lang: "en" })?.lang).toBe("en");
    expect(parseHeroCopy({ title: "X", lang: "es" })?.lang).toBe("es");
  });

  it("ignores non-string fields", () => {
    expect(parseHeroCopy({ title: 42, ribbon: "OK" })).toEqual({ ribbon: "OK" });
  });
});

describe("parseDraftConfig — hero copy", () => {
  it("carries hero copy through the scheduled path", () => {
    const cfg = parseDraftConfig({
      channels: ["hero"],
      flyer: {
        imageUrl: "/api/img/x",
        caption: "Palomazo",
        hero: { title: "EL PALOMAZO", lang: "es", startsAt: "2026-08-30T03:00:00Z" },
      },
    });
    expect(cfg.flyer.hero).toEqual({
      title: "EL PALOMAZO",
      lang: "es",
      startsAt: "2026-08-30T03:00:00Z",
    });
  });

  it("leaves hero undefined on a legacy draft saved before this field existed", () => {
    const cfg = parseDraftConfig({
      channels: ["grid"],
      flyer: { imageUrl: "/api/img/x", caption: "Old", eventDate: "2026-07-30" },
    });
    expect(cfg.flyer.hero).toBeUndefined();
    expect(cfg.flyer.caption).toBe("Old");
  });

  it("stays total when hero is garbage", () => {
    expect(() =>
      parseDraftConfig({ channels: [], flyer: { hero: "not-an-object" } }),
    ).not.toThrow();
    expect(parseDraftConfig({ channels: [], flyer: { hero: 42 } }).flyer.hero).toBeUndefined();
  });
});

// --- Phase 2: hero focus, go-live, and colours in the draft blob ------------
// These ride inside HeroCopy so both publish paths — the immediate route and
// the cron drain — parse them through parseHeroCopy and cannot end up
// supporting different subsets.

describe("parseHeroCopy — Phase 2 fields", () => {
  it("carries focus, liveAt, and the three colours", () => {
    expect(
      parseHeroCopy({
        focus: 38,
        liveAt: "2026-08-25T07:00:00Z",
        bg: "#1a1008",
        accent: "#ffbf1f",
        ink: "#f7ecd4",
      }),
    ).toEqual({
      focus: 38,
      liveAt: "2026-08-25T07:00:00Z",
      bg: "#1a1008",
      accent: "#ffbf1f",
      ink: "#f7ecd4",
    });
  });

  it("keeps focus 0 — it is a real value, not an absence", () => {
    // The falsy trap: the existing str() helper drops empty/zero values, and
    // reusing it here would silently discard a top-of-flyer crop.
    expect(parseHeroCopy({ focus: 0 })).toEqual({ focus: 0 });
  });

  it("accepts a numeric string from the form input", () => {
    expect(parseHeroCopy({ focus: "38" })).toEqual({ focus: 38 });
  });

  it("clamps out-of-range focus rather than failing the DB CHECK", () => {
    expect(parseHeroCopy({ focus: 250 })).toEqual({ focus: 100 });
    expect(parseHeroCopy({ focus: -5 })).toEqual({ focus: 0 });
  });

  it("drops a non-numeric focus", () => {
    expect(parseHeroCopy({ focus: "abc" })).toBeUndefined();
    expect(parseHeroCopy({ focus: null })).toBeUndefined();
  });

  it("drops colours that are not 6-digit hex", () => {
    // hero_colors_hex would reject these at insert time and fail the whole
    // publish; dropping them here degrades to the CSS fallback instead.
    expect(parseHeroCopy({ bg: "red" })).toBeUndefined();
    expect(parseHeroCopy({ bg: "#fff" })).toBeUndefined();
    expect(parseHeroCopy({ accent: "e0218a" })).toBeUndefined();
    expect(parseHeroCopy({ ink: "#gggggg" })).toBeUndefined();
  });

  it("normalises hex to lowercase", () => {
    expect(parseHeroCopy({ bg: "#1A1008" })).toEqual({ bg: "#1a1008" });
  });

  it("keeps valid fields when a sibling is invalid", () => {
    expect(parseHeroCopy({ bg: "#1a1008", accent: "nope", focus: 40 })).toEqual({
      bg: "#1a1008",
      focus: 40,
    });
  });

  it("still returns undefined for a blob with nothing usable", () => {
    expect(parseHeroCopy({ focus: "abc", bg: "red" })).toBeUndefined();
  });
});

describe("parseDraftConfig — Phase 2 fields survive the round trip", () => {
  it("carries the new hero fields through the draft blob", () => {
    const parsed = parseDraftConfig({
      channels: ["hero"],
      flyer: { imageUrl: "/api/img/x", hero: { focus: 38, bg: "#1a1008" } },
    });
    expect(parsed.flyer.hero).toEqual({ focus: 38, bg: "#1a1008" });
  });
});
