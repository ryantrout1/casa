import { describe, it, expect } from "vitest";
import { heroPayloadFrom, EMPTY_HERO_FORM, type HeroFormState } from "./heroForm";
import { parseHeroCopy } from "./schedule";

// The contract that matters most here is the `undefined` return. Drafts saved
// before the hero panel existed carry no `hero` key, and the cron drain parses
// those blobs — so an untouched form has to stay indistinguishable from "this
// feature does not exist".

const form = (o: Partial<HeroFormState> = {}): HeroFormState => ({ ...EMPTY_HERO_FORM, ...o });

describe("heroPayloadFrom — the untouched-form contract", () => {
  it("returns undefined for a completely empty form", () => {
    expect(heroPayloadFrom(form())).toBeUndefined();
  });

  it("returns undefined when fields hold only whitespace", () => {
    expect(
      heroPayloadFrom(form({ title: "   ", script: "\t", ribbon: " ", sub: "  " })),
    ).toBeUndefined();
  });

  it("returns undefined when only the language is set", () => {
    // Language has a non-empty default, so it must not count as "touched" —
    // otherwise every draft in the system gains a hero key.
    expect(heroPayloadFrom(form({ lang: "es" }))).toBeUndefined();
  });

  it("returns undefined when colours are present but malformed", () => {
    expect(heroPayloadFrom(form({ bg: "red", accent: "#fff", ink: "nope" }))).toBeUndefined();
  });
});

describe("heroPayloadFrom — what counts as touched", () => {
  const cases: [string, Partial<HeroFormState>][] = [
    ["a headline", { title: "EL PALOMAZO" }],
    ["a script line", { script: "en Casa" }],
    ["a ribbon", { ribbon: "KARAOKE" }],
    ["a sub-line", { sub: "424 E Monroe Ave" }],
    ["an event start", { startLocal: "2026-08-29T20:00" }],
    ["a go-live time", { liveLocal: "2026-08-25T00:00" }],
    ["a crop", { focus: "38" }],
    ["a crop of zero", { focus: "0" }],
    ["a background", { bg: "#1a1008" }],
    ["an accent", { accent: "#ffbf1f" }],
    ["an ink", { ink: "#f7ecd4" }],
  ];

  for (const [label, patch] of cases) {
    it(`emits a payload for ${label}`, () => {
      expect(heroPayloadFrom(form(patch))).toBeDefined();
    });
  }
});

describe("heroPayloadFrom — conversion", () => {
  it("converts Phoenix wall-clock to UTC for both timestamps", () => {
    // Arizona is a fixed UTC-7, so 8 PM local on the 29th is 03:00Z on the 30th.
    const p = heroPayloadFrom(
      form({ startLocal: "2026-08-29T20:00", liveLocal: "2026-08-25T00:00" }),
    );
    expect(p!.startsAt).toBe("2026-08-30T03:00:00.000Z");
    expect(p!.liveAt).toBe("2026-08-25T07:00:00.000Z");
  });

  it("keeps a crop of 0 rather than dropping it", () => {
    expect(heroPayloadFrom(form({ focus: "0" }))!.focus).toBe(0);
  });

  it("clamps and rounds the crop", () => {
    expect(heroPayloadFrom(form({ focus: "137" }))!.focus).toBe(100);
    expect(heroPayloadFrom(form({ focus: "-4" }))!.focus).toBe(0);
    expect(heroPayloadFrom(form({ focus: "37.6" }))!.focus).toBe(38);
  });

  it("drops a non-numeric crop without emitting a payload", () => {
    expect(heroPayloadFrom(form({ focus: "abc" }))).toBeUndefined();
  });

  it("lowercases hex colours", () => {
    expect(heroPayloadFrom(form({ bg: "#1A1008" }))!.bg).toBe("#1a1008");
  });

  it("keeps the valid colours when a sibling is malformed", () => {
    const p = heroPayloadFrom(form({ bg: "#1a1008", accent: "nope" }));
    expect(p!.bg).toBe("#1a1008");
    expect(p!.accent).toBeUndefined();
  });

  it("omits absent optional fields rather than sending empty strings", () => {
    const p = heroPayloadFrom(form({ title: "EL PALOMAZO" }));
    expect(p).toEqual({ startsAt: null, title: "EL PALOMAZO", lang: "en" });
  });
});

describe("heroPayloadFrom — survives the wire", () => {
  it("produces a payload parseHeroCopy accepts unchanged", () => {
    // The composer is not the validator; parseHeroCopy is. Anything the form
    // emits must survive that round trip, or the publish silently loses fields.
    const p = heroPayloadFrom(
      form({
        startLocal: "2026-08-29T20:00",
        liveLocal: "2026-08-25T00:00",
        title: "EL PALOMAZO",
        script: "en Casa",
        ribbon: "KARAOKE",
        sub: "424 E Monroe Ave",
        lang: "es",
        focus: "38",
        bg: "#1a1008",
        accent: "#ffbf1f",
        ink: "#f7ecd4",
      }),
    );
    expect(parseHeroCopy(p)).toEqual(p);
  });
});
