import { describe, it, expect } from "vitest";
import {
  FLYER_SCHEMA,
  parseFlyerResponse,
  normaliseEventDate,
  mergeSuggestions,
  type FlyerSuggestion,
} from "./flyerRead";
import { EMPTY_HERO_FORM, type HeroFormState } from "./heroForm";

// Reading a flyer is a convenience layered on top of a form that already
// works. Every one of these tests exists to protect one rule: a bad read must
// leave the admin exactly where they started, never halfway.

const form = (o: Partial<HeroFormState> = {}): HeroFormState => ({ ...EMPTY_HERO_FORM, ...o });

// A well-formed API response carrying a JSON text block.
function reply(payload: unknown, stop_reason = "end_turn") {
  return { stop_reason, content: [{ type: "text", text: JSON.stringify(payload) }] };
}

const FULL = {
  title: "EL PALOMAZO",
  script: "en Casa",
  ribbon: "UNA NOCHE DE KARAOKE MEXICANO",
  sub: "424 E Monroe Ave · Buckeye",
  caption: "¡ahora nos vamos de PALOMAZO!",
  alt: "El Palomazo en Casa — una noche de karaoke mexicano",
  lang: "es",
  month: 8,
  day: 29,
  year: null,
  hour24: 20,
  minute: 0,
  bg: "#1a1008",
  accent: "#ffbf1f",
  ink: "#f7ecd4",
};

describe("FLYER_SCHEMA", () => {
  it("marks every property required", () => {
    // Structured outputs reorder optional properties and count them against a
    // complexity budget, so the schema uses nullable-required throughout
    // rather than optional fields.
    const props = Object.keys(FLYER_SCHEMA.properties);
    expect(FLYER_SCHEMA.required).toEqual(props);
  });

  it("disallows extra properties", () => {
    expect(FLYER_SCHEMA.additionalProperties).toBe(false);
  });

  it("stays within the structured-output complexity budget", () => {
    // Two documented per-request limits apply to constrained decoding:
    // at most 24 optional parameters, and at most 16 using union types.
    // Every nullable field here is a type array, which counts as a union — so
    // the schema sits close enough to the ceiling that adding fields casually
    // would start returning 400 "schema is too complex" at runtime rather
    // than failing here.
    const props = Object.values(FLYER_SCHEMA.properties) as { type: unknown }[];
    const unions = props.filter((p) => Array.isArray(p.type)).length;
    const optional = Object.keys(FLYER_SCHEMA.properties).length - FLYER_SCHEMA.required.length;

    expect(unions).toBeLessThanOrEqual(16);
    expect(optional).toBeLessThanOrEqual(24);
    // Pin the actual count so growth is a deliberate, visible decision.
    expect(unions).toBe(14);
  });
});

describe("parseFlyerResponse — failure shapes", () => {
  it("returns null for a refusal", () => {
    // The flyer depicts real performers; a prompt drifting toward identity
    // would be refused. The refusal message takes precedence over the schema,
    // so the payload is not parseable.
    expect(parseFlyerResponse({ stop_reason: "refusal", content: [] })).toBeNull();
  });

  it("returns null when the response was truncated", () => {
    // Structured outputs do not guarantee schema compliance when max_tokens
    // is hit — the JSON can be cut mid-object.
    expect(parseFlyerResponse(reply(FULL, "max_tokens"))).toBeNull();
  });

  it("returns null for an empty content array", () => {
    expect(parseFlyerResponse({ stop_reason: "end_turn", content: [] })).toBeNull();
  });

  it("returns null when there is no text block", () => {
    expect(
      parseFlyerResponse({ stop_reason: "end_turn", content: [{ type: "thinking" }] }),
    ).toBeNull();
  });

  it("returns null for unparseable JSON", () => {
    expect(
      parseFlyerResponse({ stop_reason: "end_turn", content: [{ type: "text", text: "{oops" }] }),
    ).toBeNull();
  });

  it("returns null for junk input", () => {
    for (const junk of [null, undefined, "", 0, [], "a string"]) {
      expect(parseFlyerResponse(junk)).toBeNull();
    }
  });

  it("is all-or-nothing — a wrong-typed field voids the whole read", () => {
    // A half-filled form is worse than an empty one: the admin cannot tell
    // which fields were read and which were guessed.
    expect(parseFlyerResponse(reply({ ...FULL, month: "August" }))).toBeNull();
    expect(parseFlyerResponse(reply({ ...FULL, title: 42 }))).toBeNull();
  });

  it("returns null when required keys are missing entirely", () => {
    const { title: _drop, ...rest } = FULL;
    expect(parseFlyerResponse(reply(rest))).toBeNull();
  });
});

describe("parseFlyerResponse — success", () => {
  it("reads a complete flyer", () => {
    const s = parseFlyerResponse(reply(FULL))!;
    expect(s.title).toBe("EL PALOMAZO");
    expect(s.script).toBe("en Casa");
    expect(s.lang).toBe("es");
    expect(s.hour24).toBe(20);
  });

  it("accepts nulls for anything the poster does not say", () => {
    const bare = {
      ...FULL, script: null, ribbon: null, sub: null, caption: null, alt: null,
      month: null, day: null, year: null, hour24: null, minute: null,
      bg: null, accent: null, ink: null,
    };
    const s = parseFlyerResponse(reply(bare))!;
    expect(s).not.toBeNull();
    expect(s.script).toBeNull();
    expect(s.month).toBeNull();
  });

  it("drops colours that are not 6-digit hex rather than voiding the read", () => {
    // Colours are cosmetic; a bad one falls back to the CSS default. Dates and
    // text are not, which is why those are strict.
    const s = parseFlyerResponse(reply({ ...FULL, accent: "gold" }))!;
    expect(s.bg).toBe("#1a1008");
    expect(s.accent).toBeNull();
  });

  it("lowercases hex colours", () => {
    expect(parseFlyerResponse(reply({ ...FULL, bg: "#1A1008" }))!.bg).toBe("#1a1008");
  });

  it("rejects an out-of-range clock or calendar value", () => {
    expect(parseFlyerResponse(reply({ ...FULL, hour24: 25 }))).toBeNull();
    expect(parseFlyerResponse(reply({ ...FULL, month: 13 }))).toBeNull();
    expect(parseFlyerResponse(reply({ ...FULL, day: 0 }))).toBeNull();
    expect(parseFlyerResponse(reply({ ...FULL, minute: 60 }))).toBeNull();
  });

  it("falls back to English for an unrecognised language", () => {
    expect(parseFlyerResponse(reply({ ...FULL, lang: "fr" }))!.lang).toBe("en");
  });

  it("trims whitespace off the text fields", () => {
    expect(parseFlyerResponse(reply({ ...FULL, title: "  EL PALOMAZO  " }))!.title).toBe(
      "EL PALOMAZO",
    );
  });
});

describe("normaliseEventDate — the year the poster does not print", () => {
  // Aug 12 2026, Phoenix.
  const NOW = Date.parse("2026-08-12T19:00:00Z");

  it("uses the printed year when the poster gives one", () => {
    expect(normaliseEventDate(8, 29, 2027, NOW)).toBe("2027-08-29");
  });

  it("infers the current year for a date still ahead", () => {
    expect(normaliseEventDate(8, 29, null, NOW)).toBe("2026-08-29");
  });

  it("rolls to next year for a date already past", () => {
    // A poster read in August saying "MARCH 3" means next March.
    expect(normaliseEventDate(3, 3, null, NOW)).toBe("2027-03-03");
  });

  it("treats today as still ahead", () => {
    expect(normaliseEventDate(8, 12, null, NOW)).toBe("2026-08-12");
  });

  it("crosses the December boundary correctly", () => {
    const dec = Date.parse("2026-12-28T19:00:00Z");
    expect(normaliseEventDate(1, 3, null, dec)).toBe("2027-01-03");
    expect(normaliseEventDate(12, 31, null, dec)).toBe("2026-12-31");
  });

  it("uses the Phoenix calendar date, not the UTC one", () => {
    // 01:00Z on the 13th is still 6 PM on the 12th in Phoenix. A UTC read
    // would roll "AUGUST 12" forward a whole year.
    const lateUtc = Date.parse("2026-08-13T01:00:00Z");
    expect(normaliseEventDate(8, 12, null, lateUtc)).toBe("2026-08-12");
  });

  it("returns null when the poster gives no date", () => {
    expect(normaliseEventDate(null, null, null, NOW)).toBeNull();
    expect(normaliseEventDate(8, null, null, NOW)).toBeNull();
    expect(normaliseEventDate(null, 29, null, NOW)).toBeNull();
  });

  it("returns null for a date that does not exist", () => {
    expect(normaliseEventDate(2, 30, null, NOW)).toBeNull();
    expect(normaliseEventDate(4, 31, null, NOW)).toBeNull();
  });

  it("handles a leap day by finding the next leap year", () => {
    expect(normaliseEventDate(2, 29, null, NOW)).toBe("2028-02-29");
  });
});

describe("mergeSuggestions", () => {
  const suggestion: FlyerSuggestion = parseFlyerResponse(reply(FULL))!;
  const NOW = Date.parse("2026-08-12T19:00:00Z");

  it("fills empty fields and marks them suggested", () => {
    const { form: next, suggested } = mergeSuggestions(form(), suggestion, NOW);
    expect(next.title).toBe("EL PALOMAZO");
    expect(next.ribbon).toBe("UNA NOCHE DE KARAOKE MEXICANO");
    expect(next.bg).toBe("#1a1008");
    expect(suggested).toContain("title");
    expect(suggested).toContain("bg");
  });

  it("never overwrites something the admin already typed", () => {
    const { form: next, suggested } = mergeSuggestions(
      form({ title: "MY OWN HEADLINE" }),
      suggestion,
      NOW,
    );
    expect(next.title).toBe("MY OWN HEADLINE");
    expect(suggested).not.toContain("title");
  });

  it("builds the Phoenix wall-clock start from date plus time", () => {
    const { form: next } = mergeSuggestions(form(), suggestion, NOW);
    expect(next.startLocal).toBe("2026-08-29T20:00");
  });

  it("leaves the start blank when the poster has a date but no time", () => {
    const noTime = { ...suggestion, hour24: null, minute: null };
    const { form: next, suggested } = mergeSuggestions(form(), noTime, NOW);
    expect(next.startLocal).toBe("");
    expect(suggested).not.toContain("startLocal");
  });

  it("never suggests a go-live time — that is the admin's call", () => {
    const { form: next, suggested } = mergeSuggestions(form(), suggestion, NOW);
    expect(next.liveLocal).toBe("");
    expect(suggested).not.toContain("liveLocal");
  });

  it("never suggests a crop — the flyer cannot say where to crop itself", () => {
    const { form: next, suggested } = mergeSuggestions(form(), suggestion, NOW);
    expect(next.focus).toBe("");
    expect(suggested).not.toContain("focus");
  });

  it("skips null fields rather than blanking them", () => {
    const sparse = { ...suggestion, ribbon: null, accent: null };
    const { form: next, suggested } = mergeSuggestions(
      form({ ribbon: "KEEP ME" }),
      sparse,
      NOW,
    );
    expect(next.ribbon).toBe("KEEP ME");
    expect(suggested).not.toContain("accent");
  });

  it("returns an empty suggested set when the suggestion is null", () => {
    const { form: next, suggested } = mergeSuggestions(form({ title: "X" }), null, NOW);
    expect(next).toEqual(form({ title: "X" }));
    expect(suggested.size).toBe(0);
  });

  it("does not mutate the form it was given", () => {
    const original = form();
    mergeSuggestions(original, suggestion, NOW);
    expect(original.title).toBe("");
  });
});
