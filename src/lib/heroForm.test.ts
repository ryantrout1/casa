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
    // Alt copy alone is a real edit: the admin may be adding the translation
    // to a fiesta whose primary copy is already stored.
    ["an alt headline", { titleAlt: "LOTERÍA" }],
    ["an alt script line", { scriptAlt: "¡Noche de!" }],
    ["an alt ribbon", { ribbonAlt: "¡DIVERSIÓN!" }],
    ["an alt sub-line", { subAlt: "Para toda la familia" }],
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

describe("heroPayloadFrom — the other language", () => {
  // The four _alt fields carry the translation the rotating hero alternates
  // to. They ride the same payload as the primary copy so both publish paths
  // — the immediate route and the cron drain — parse them through the one
  // parseHeroCopy, and cannot end up supporting different subsets.

  it("carries all four alt fields into the payload", () => {
    const p = heroPayloadFrom(
      form({
        title: "LOTERÍA",
        script: "Night!",
        ribbon: "FUN! ★ PRIZES! ★ COMMUNITY!",
        sub: "All ages",
        titleAlt: "LOTERÍA",
        scriptAlt: "¡Noche de!",
        ribbonAlt: "¡DIVERSIÓN! ★ ¡PREMIOS! ★ ¡COMUNIDAD!",
        subAlt: "Para toda la familia",
      }),
    );
    expect(p?.titleAlt).toBe("LOTERÍA");
    expect(p?.scriptAlt).toBe("¡Noche de!");
    expect(p?.ribbonAlt).toBe("¡DIVERSIÓN! ★ ¡PREMIOS! ★ ¡COMUNIDAD!");
    expect(p?.subAlt).toBe("Para toda la familia");
  });

  it("trims alt copy the way it trims the primary", () => {
    const p = heroPayloadFrom(form({ titleAlt: "  LOTERÍA  " }));
    expect(p?.titleAlt).toBe("LOTERÍA");
  });

  it("omits blank alt fields rather than sending empty strings", () => {
    // An empty string would be stored as an empty string, and heroAlt treats
    // absent and blank alike — but the payload should not carry noise.
    const p = heroPayloadFrom(form({ title: "LOTERÍA", scriptAlt: "   " }));
    expect(p).toBeDefined();
    expect(p).not.toHaveProperty("scriptAlt");
  });

  it("still returns undefined when only whitespace alt copy is present", () => {
    // The untouched-form contract has to survive four new fields.
    expect(
      heroPayloadFrom(form({ titleAlt: " ", scriptAlt: "\t", ribbonAlt: "", subAlt: "  " })),
    ).toBeUndefined();
  });

  it("produces alt copy parseHeroCopy accepts unchanged", () => {
    // The round-trip that matters: what the form emits has to survive the
    // publish_config blob and come back identical.
    const p = heroPayloadFrom(
      form({ title: "LOTERÍA", titleAlt: "LOTERÍA", ribbonAlt: "¡DIVERSIÓN!" }),
    );
    const parsed = parseHeroCopy(JSON.parse(JSON.stringify(p)));
    expect(parsed?.titleAlt).toBe("LOTERÍA");
    expect(parsed?.ribbonAlt).toBe("¡DIVERSIÓN!");
  });
});

// ---------------------------------------------------------------------------

import {
  EMPTY_MOTIF_DRAFT,
  NO_MOTIF_COLUMNS,
  formatHexList,
  motifColumnsFrom,
  parseHexList,
  type MotifDraft,
} from "./heroForm";
import { heroMotif } from "./heroMotif";

const motifDraft = (o: Partial<MotifDraft> = {}): MotifDraft => ({
  ...EMPTY_MOTIF_DRAFT,
  ...o,
});

const LOTERIA_DRAFT = motifDraft({
  motif: "loteria",
  palette: "#f7ead0, #d42b2b, #2e7d4f, #6b3fa0",
  cards: ["el_sol", "la_rosa"],
});

describe("parseHexList", () => {
  it("splits on commas, whitespace, or both", () => {
    expect(parseHexList("#f7ead0,#d42b2b")).toEqual(["#f7ead0", "#d42b2b"]);
    expect(parseHexList("#f7ead0 #d42b2b")).toEqual(["#f7ead0", "#d42b2b"]);
    expect(parseHexList("  #f7ead0 ,  #d42b2b  ")).toEqual(["#f7ead0", "#d42b2b"]);
  });

  it("lowercases so a colour typed in caps matches one picked from a swatch", () => {
    expect(parseHexList("#F7EAD0")).toEqual(["#f7ead0"]);
  });

  it("returns null for an empty or whitespace-only field", () => {
    expect(parseHexList("")).toBeNull();
    expect(parseHexList("   ")).toBeNull();
    expect(parseHexList(" , , ")).toBeNull();
  });

  // All-or-nothing. A partially-parsed palette would draw the composition in
  // colours the admin did not choose, with no way to tell which were dropped.
  it("returns null when any entry is malformed, not a shorter list", () => {
    expect(parseHexList("#f7ead0, red, #2e7d4f")).toBeNull();
    expect(parseHexList("#f7ead0, #fff")).toBeNull();
    expect(parseHexList("#f7ead0, f7ead0")).toBeNull();
  });
});

describe("formatHexList", () => {
  it("round-trips a stored palette back into the text field", () => {
    const stored = ["#f7ead0", "#d42b2b", "#2e7d4f"];
    expect(parseHexList(formatHexList(stored))).toEqual(stored);
  });

  it("yields an empty field for anything that is not an array of strings", () => {
    expect(formatHexList(null)).toBe("");
    expect(formatHexList(undefined)).toBe("");
    expect(formatHexList("#f7ead0")).toBe("");
    expect(formatHexList({ 0: "#f7ead0" })).toBe("");
    expect(formatHexList([1, 2])).toBe("");
  });
});

describe("motifColumnsFrom — clearing", () => {
  it("clears all four columns when no motif is chosen", () => {
    expect(motifColumnsFrom(EMPTY_MOTIF_DRAFT)).toEqual(NO_MOTIF_COLUMNS);
  });

  // Leaving a stale palette behind after switching the dropdown to "none"
  // would mean the next motif silently inherited the previous event's colours.
  it("clears the palette and tokens too, not just the name", () => {
    const cols = motifColumnsFrom({ ...LOTERIA_DRAFT, motif: "" });
    expect(cols).toEqual(NO_MOTIF_COLUMNS);
  });

  it("clears everything for a motif name outside the enum", () => {
    expect(motifColumnsFrom({ ...LOTERIA_DRAFT, motif: "fireworks" })).toEqual(
      NO_MOTIF_COLUMNS,
    );
  });

  it("clears everything when the palette will not parse", () => {
    expect(motifColumnsFrom({ ...LOTERIA_DRAFT, palette: "#f7ead0, nope" })).toEqual(
      NO_MOTIF_COLUMNS,
    );
  });

  // A motif with a name and a palette but no tokens can never render. Storing
  // it would leave a row that looks configured in /cocina and does nothing on
  // the site — the exact gap the status badge exists to close.
  it("clears everything when no tokens can be built", () => {
    expect(motifColumnsFrom({ ...LOTERIA_DRAFT, cards: [] })).toEqual(NO_MOTIF_COLUMNS);
    expect(
      motifColumnsFrom(
        motifDraft({ motif: "photo_band", palette: LOTERIA_DRAFT.palette, bandTop: "32" }),
      ),
    ).toEqual(NO_MOTIF_COLUMNS);
  });
});

describe("motifColumnsFrom — building", () => {
  it("builds a loteria record", () => {
    expect(motifColumnsFrom(LOTERIA_DRAFT)).toEqual({
      motif: "loteria",
      palette: ["#f7ead0", "#d42b2b", "#2e7d4f", "#6b3fa0"],
      titleColors: null,
      tokens: { motif: "loteria", cards: ["el_sol", "la_rosa"] },
    });
  });

  it("drops unknown and duplicate card names before storing", () => {
    const cols = motifColumnsFrom({
      ...LOTERIA_DRAFT,
      cards: ["el_sol", "el_dragon", "el_sol", "la_luna"],
    });
    expect(cols.tokens).toEqual({ motif: "loteria", cards: ["el_sol", "la_luna"] });
  });

  it("keeps icons to the set belonging to the chosen motif", () => {
    const cols = motifColumnsFrom(
      motifDraft({
        motif: "cantina",
        palette: LOTERIA_DRAFT.palette,
        icons: ["mic", "chinelos", "drinks"],
      }),
    );
    expect(cols.tokens).toEqual({ motif: "cantina", icons: ["mic", "drinks"] });
  });

  it("rounds and clamps band percentages", () => {
    const cols = motifColumnsFrom(
      motifDraft({
        motif: "photo_band",
        palette: LOTERIA_DRAFT.palette,
        bandTop: "31.6",
        bandHeight: "140",
      }),
    );
    expect(cols.tokens).toEqual({ motif: "photo_band", bandTop: 32, bandHeight: 100 });
  });

  it("stores title colours when given, and null when blank", () => {
    expect(motifColumnsFrom(LOTERIA_DRAFT).titleColors).toBeNull();
    expect(
      motifColumnsFrom({ ...LOTERIA_DRAFT, titleColors: "#111111 #222222" }).titleColors,
    ).toEqual(["#111111", "#222222"]);
  });

  // A bad colour array has a good default (cycle the palette); a bad card name
  // does not. So this drops to null rather than voiding the whole motif.
  it("drops unparseable title colours without voiding the motif", () => {
    const cols = motifColumnsFrom({ ...LOTERIA_DRAFT, titleColors: "#111111, nope" });
    expect(cols.motif).toBe("loteria");
    expect(cols.titleColors).toBeNull();
  });
});

// The round-trip that matters: what the admin types must survive the column
// builder AND heroMotif's re-validation on the way back out. These are the two
// halves of the same guard, and a value that clears one but not the other would
// save cleanly in /cocina and render nothing on the homepage.
describe("motifColumnsFrom → heroMotif round-trip", () => {
  function planFor(d: MotifDraft, heroTitle: string | null) {
    const c = motifColumnsFrom(d);
    return heroMotif({
      heroMotif: c.motif,
      heroPalette: c.palette,
      heroTitleColors: c.titleColors,
      heroTokens: c.tokens,
      heroTitle,
    });
  }

  it("a saveable loteria draft renders", () => {
    expect(planFor(LOTERIA_DRAFT, "LOTERÍA")).toMatchObject({
      motif: "loteria",
      cards: ["el_sol", "la_rosa"],
    });
  });

  // motifColumnsFrom is deliberately MORE permissive than heroMotif. It
  // validates format — is this a hex, is this a real card name — while
  // heroMotif validates renderability: are there 3-6 colours, are there 2-4
  // cards. The gap is on purpose. If saving cleared a palette that was one
  // colour short, the admin would reopen the editor to find their work gone;
  // storing it means the badge tells them what is missing and they add one
  // colour. Work in progress survives a save.
  //
  // What must NOT differ is the verdict, and the /cocina badge runs both
  // halves so the admin always sees heroMotif's answer, not this one's.
  it("stores a two-colour palette but does not render it", () => {
    const d = { ...LOTERIA_DRAFT, palette: "#f7ead0, #d42b2b" };
    expect(motifColumnsFrom(d).palette).toEqual(["#f7ead0", "#d42b2b"]);
    expect(planFor(d, "LOTERÍA")).toEqual({ motif: "none" });
  });

  it("renders once the palette reaches three colours", () => {
    const d = { ...LOTERIA_DRAFT, palette: "#f7ead0, #d42b2b, #2e7d4f" };
    expect(planFor(d, "LOTERÍA")).toMatchObject({ motif: "loteria" });
  });

  // Five saved cards pass the column builder — it only filters unknown names —
  // and are then rejected by heroMotif's 2-4 rule. Pinning it here so the
  // /cocina badge, which runs both, is what surfaces the mismatch.
  it("five cards save but do not render, and the badge sees it", () => {
    const d = {
      ...LOTERIA_DRAFT,
      cards: ["el_sol", "la_rosa", "la_luna", "la_mano", "el_gallo"],
    };
    expect(motifColumnsFrom(d).tokens).not.toBeNull();
    expect(planFor(d, "LOTERÍA")).toEqual({ motif: "none" });
  });
});
