import { describe, it, expect } from "vitest";
import { AA_LARGE, contrastRatio, pickInk } from "./palette";
import {
  heroMotif,
  letterColors,
  MAX_PALETTE,
  MIN_PALETTE,
  type MotifSource,
} from "./heroMotif";

// The governing rule, and the reason almost every case below expects "none":
// a motif is all-or-nothing. A plan that resolves with three of its four parts
// would render a composition with a hole in it — a papel picado strip over an
// empty column, or a title where half the letters are coloured. That reads as a
// broken page, not as a partially-configured one. Anything unusable voids the
// whole plan and the caller falls back to the hero that ships today.

const PALETTE = ["#f7ead0", "#d42b2b", "#2e7d4f", "#6b3fa0", "#e8913c"];

// The section ground is palette[0]; the ink is derived from it. Expressing the
// expected headline colours as the RULE rather than a literal array keeps this
// honest — a hardcoded list would still pass if the gate silently stopped
// running, because most of these colours clear AA against cream anyway.
const GROUND = PALETTE[0];
const INK = pickInk(GROUND);
const gated = (cs: string[]) =>
  cs.map((c) => (contrastRatio(c, GROUND) >= AA_LARGE ? c : INK));

/** The seven colours "LOTERÍA" gets when nothing is stored: cycle, then gate. */
const CYCLED_7 = gated(PALETTE.concat(PALETTE.slice(0, 2)));

function src(over: Partial<MotifSource> = {}): MotifSource {
  return {
    heroMotif: null,
    heroPalette: null,
    heroTitleColors: null,
    heroTokens: null,
    heroTitle: null,
    ...over,
  };
}

function loteria(over: Partial<MotifSource> = {}): MotifSource {
  return src({
    heroMotif: "loteria",
    heroPalette: PALETTE,
    heroTitle: "LOTERÍA",
    heroTokens: { motif: "loteria", cards: ["el_sol", "la_rosa", "la_mano", "la_luna"] },
    ...over,
  });
}

describe("heroMotif — the opted-out majority", () => {
  it("returns none when every motif field is null", () => {
    expect(heroMotif(src())).toEqual({ motif: "none" });
  });

  // Every row in production today. Phase 1 must be provably invisible: the
  // columns exist, nothing sets them, and the homepage renders exactly as it
  // did before. Titles are the real ones so the accented-title path is
  // exercised by live data rather than only by the synthetic case below.
  it.each([
    ["c5ab4502", null],
    ["c28796a9", null],
    ["51f0fd85", null],
    ["6c6524ee", null],
    ["b445fa30", null],
    ["d2520ec1", null],
    ["81d46dd6", null],
    ["a345b276", null],
    ["d08d67a7", null],
    ["1de810e1", null],
    ["020dc45b", null],
    ["39588c66", null],
    ["e0b03fff", null],
    ["07df43aa", "El Palomazo"],
    ["2c6c2743", "LOTERÍA"],
    ["0d099af5", "El Palomazo"],
    ["9ded4807", "LOTERIA"],
  ])("row %s resolves to none", (_id, heroTitle) => {
    expect(heroMotif(src({ heroTitle }))).toEqual({ motif: "none" });
  });

  it("returns none for a motif name that is not in the enum", () => {
    expect(heroMotif(src({ heroMotif: "fireworks", heroPalette: PALETTE }))).toEqual({
      motif: "none",
    });
  });

  it("returns none for a motif name in the wrong case", () => {
    expect(heroMotif(loteria({ heroMotif: "Loteria" }))).toEqual({ motif: "none" });
  });
});

describe("heroMotif — palette validation", () => {
  it("resolves a complete loteria plan", () => {
    expect(heroMotif(loteria())).toEqual({
      motif: "loteria",
      palette: PALETTE,
      ground: GROUND,
      ink: INK,
      titleColors: CYCLED_7,
      cards: ["el_sol", "la_rosa", "la_mano", "la_luna"],
    });
  });

  it("returns none when the palette is shorter than MIN_PALETTE", () => {
    expect(heroMotif(loteria({ heroPalette: PALETTE.slice(0, MIN_PALETTE - 1) }))).toEqual({
      motif: "none",
    });
  });

  it("returns none when the palette is longer than MAX_PALETTE", () => {
    const tooMany = [...PALETTE, "#111111", "#222222"].slice(0, MAX_PALETTE + 1);
    expect(heroMotif(loteria({ heroPalette: tooMany }))).toEqual({ motif: "none" });
  });

  it("returns none when any palette entry is not a 6-digit hex", () => {
    expect(heroMotif(loteria({ heroPalette: ["#f7ead0", "red", "#2e7d4f"] }))).toEqual({
      motif: "none",
    });
    expect(heroMotif(loteria({ heroPalette: ["#f7ead0", "#fff", "#2e7d4f"] }))).toEqual({
      motif: "none",
    });
  });

  it("returns none when the palette is not an array", () => {
    expect(heroMotif(loteria({ heroPalette: "#f7ead0" }))).toEqual({ motif: "none" });
    expect(heroMotif(loteria({ heroPalette: { 0: "#f7ead0" } }))).toEqual({ motif: "none" });
  });
});

describe("heroMotif — title colours", () => {
  it("uses stored title colours when the count matches the title", () => {
    const colors = ["#2e7d4f", "#d42b2b", "#2e7d4f", "#e8913c", "#6b3fa0", "#d42b2b", "#16a89e"];
    const plan = heroMotif(loteria({ heroTitleColors: colors }));
    expect(plan).toMatchObject({ motif: "loteria", titleColors: gated(colors) });
  });

  // The context-blindness guard. A per-character array applied to a title of a
  // different length either runs out partway or leaves colours unused, and both
  // produce a headline that looks half-styled.
  it("drops title colours whose count disagrees and cycles the palette instead", () => {
    const plan = heroMotif(loteria({ heroTitleColors: ["#2e7d4f", "#d42b2b", "#2e7d4f"] }));
    expect(plan).toMatchObject({ motif: "loteria", titleColors: CYCLED_7 });
  });

  it("drops title colours containing a bad hex rather than colouring part of the word", () => {
    const seven = ["#2e7d4f", "#d42b2b", "#2e7d4f", "nope", "#6b3fa0", "#d42b2b", "#16a89e"];
    const plan = heroMotif(loteria({ heroTitleColors: seven }));
    expect(plan).toMatchObject({ titleColors: CYCLED_7 });
  });

  // "LOTERÍA" is 7 characters, but only if Í is precomposed. A decomposed
  // I + combining acute is 8 code points, which would silently shift every
  // colour after the accent by one. Normalising is what keeps a title typed on
  // a Mac and a title typed on Windows resolve identically.
  it("counts an accented title by NFC code points", () => {
    const decomposed = "LOTERI\u0301A";
    expect(decomposed.length).toBe(8);
    const plan = heroMotif(loteria({ heroTitle: decomposed }));
    expect(plan).toMatchObject({ titleColors: CYCLED_7 });
  });

  it("returns an empty title colour list when there is no title", () => {
    expect(heroMotif(loteria({ heroTitle: null }))).toMatchObject({ titleColors: [] });
    expect(heroMotif(loteria({ heroTitle: "   " }))).toMatchObject({ titleColors: [] });
  });
});

describe("heroMotif — loteria tokens", () => {
  it("returns none when a card name is not in the deck", () => {
    const plan = heroMotif(
      loteria({ heroTokens: { motif: "loteria", cards: ["el_sol", "el_dragon"] } }),
    );
    expect(plan).toEqual({ motif: "none" });
  });

  it("returns none when cards repeat", () => {
    const plan = heroMotif(
      loteria({ heroTokens: { motif: "loteria", cards: ["el_sol", "el_sol"] } }),
    );
    expect(plan).toEqual({ motif: "none" });
  });

  it("returns none for fewer than two or more than four cards", () => {
    expect(
      heroMotif(loteria({ heroTokens: { motif: "loteria", cards: ["el_sol"] } })),
    ).toEqual({ motif: "none" });
    expect(
      heroMotif(
        loteria({
          heroTokens: {
            motif: "loteria",
            cards: ["el_sol", "la_rosa", "la_mano", "la_luna", "la_sirena"],
          },
        }),
      ),
    ).toEqual({ motif: "none" });
  });

  it("accepts two cards", () => {
    const plan = heroMotif(
      loteria({ heroTokens: { motif: "loteria", cards: ["el_gallo", "el_corazon"] } }),
    );
    expect(plan).toMatchObject({ motif: "loteria", cards: ["el_gallo", "el_corazon"] });
  });
});

// The contract/shape-mismatch guard. hero_motif and hero_tokens are two
// columns that can disagree — an admin switching the dropdown without clearing
// the token editor is the obvious way. Trusting hero_motif and coercing the
// tokens would render a cantina composition holding lotería cards.
describe("heroMotif — motif and tokens must agree", () => {
  it("returns none when the token discriminant names a different motif", () => {
    expect(heroMotif(loteria({ heroMotif: "cantina" }))).toEqual({ motif: "none" });
  });

  it("returns none when tokens are missing entirely", () => {
    expect(heroMotif(loteria({ heroTokens: null }))).toEqual({ motif: "none" });
  });

  it("returns none when tokens are not an object", () => {
    expect(heroMotif(loteria({ heroTokens: "loteria" }))).toEqual({ motif: "none" });
    expect(heroMotif(loteria({ heroTokens: ["el_sol"] }))).toEqual({ motif: "none" });
  });
});

describe("heroMotif — patrias and cantina tokens", () => {
  it("resolves a patrias plan", () => {
    const plan = heroMotif(
      src({
        heroMotif: "patrias",
        heroPalette: PALETTE,
        heroTitle: "PATRIAS",
        heroTokens: { motif: "patrias", icons: ["music", "dancers", "crown"] },
      }),
    );
    expect(plan).toMatchObject({ motif: "patrias", icons: ["music", "dancers", "crown"] });
  });

  it("resolves a cantina plan", () => {
    const plan = heroMotif(
      src({
        heroMotif: "cantina",
        heroPalette: PALETTE,
        heroTitle: "Palomazo",
        heroTokens: { motif: "cantina", icons: ["mic", "drinks", "food", "music", "star"] },
      }),
    );
    expect(plan).toMatchObject({ motif: "cantina" });
  });

  it("returns none for an icon outside its motif's set", () => {
    expect(
      heroMotif(
        src({
          heroMotif: "cantina",
          heroPalette: PALETTE,
          heroTitle: "Palomazo",
          heroTokens: { motif: "cantina", icons: ["mic", "chinelos"] },
        }),
      ),
    ).toEqual({ motif: "none" });
  });

  it("returns none for an empty icon list", () => {
    expect(
      heroMotif(
        src({
          heroMotif: "patrias",
          heroPalette: PALETTE,
          heroTitle: "PATRIAS",
          heroTokens: { motif: "patrias", icons: [] },
        }),
      ),
    ).toEqual({ motif: "none" });
  });
});

describe("heroMotif — photo_band tokens", () => {
  function band(over: Record<string, unknown> = {}): MotifSource {
    return src({
      heroMotif: "photo_band",
      heroPalette: PALETTE,
      heroTitle: "El Palomazo",
      heroTokens: { motif: "photo_band", bandTop: 32, bandHeight: 38, ...over },
    });
  }

  it("resolves a band and carries no title colours", () => {
    expect(heroMotif(band())).toEqual({
      motif: "photo_band",
      palette: PALETTE,
      ground: GROUND,
      ink: INK,
      bandTop: 32,
      bandHeight: 38,
    });
  });

  it("returns none when the band runs past the bottom of the flyer", () => {
    expect(heroMotif(band({ bandTop: 80, bandHeight: 30 }))).toEqual({ motif: "none" });
  });

  it("accepts a band that ends exactly at the bottom edge", () => {
    expect(heroMotif(band({ bandTop: 70, bandHeight: 30 }))).toMatchObject({
      motif: "photo_band",
    });
  });

  it("returns none for a zero-height or negative band", () => {
    expect(heroMotif(band({ bandHeight: 0 }))).toEqual({ motif: "none" });
    expect(heroMotif(band({ bandHeight: -10 }))).toEqual({ motif: "none" });
  });

  it("returns none for a non-integer or out-of-range band", () => {
    expect(heroMotif(band({ bandTop: 12.5 }))).toEqual({ motif: "none" });
    expect(heroMotif(band({ bandTop: -1 }))).toEqual({ motif: "none" });
  });
});

// ---------------------------------------------------------------------------
// Phase 3: the ground, the ink, and readable letters
// ---------------------------------------------------------------------------
//
// The gap Phase 1's code review left open. Phase 1 validated that title colours
// were well-formed hex; it could not check them for READABILITY because the
// ground the letters sit on was not known until the composition rendered. It is
// known here: palette[0] is the flyer's most prominent colour and is what the
// section is painted with, so every letter can now be gated against it.
//
// heroStyleVars already refuses an accent that cannot be read against the
// ground. This is the same rule applied per letter.

describe("heroMotif — ground and ink", () => {
  it("paints the section with the most prominent palette colour", () => {
    expect(heroMotif(loteria())).toMatchObject({ ground: PALETTE[0], ink: pickInk(PALETTE[0]) });
  });

  it("derives cream ink on a dark ground and navy on a light one", () => {
    const dark = ["#1a0d07", "#e8557f", "#2a6b6b", "#f0dfa8"];
    expect(heroMotif(loteria({ heroPalette: dark }))).toMatchObject({
      motif: "loteria",
      ground: "#1a0d07",
      ink: pickInk("#1a0d07"),
    });
    expect(heroMotif(loteria())).toMatchObject({ ink: pickInk("#f7ead0") });
  });
});

describe("heroMotif — every letter is readable", () => {
  const GROUNDS: Array<[string, string[]]> = [
    ["cream Lotería", ["#f5e6c8", "#d42b2b", "#2e7d4f", "#6b3fa0", "#e8913c"]],
    ["navy paint Lotería", ["#1b2a4a", "#e8437c", "#f5c518", "#3fbfb5", "#f28c28"]],
    ["cantina black", ["#1a0d07", "#e8557f", "#2a6b6b", "#f0dfa8"]],
    ["parchment Patrias", ["#f2e6c9", "#0f3d2c", "#c0392b", "#d4a017"]],
    ["adversarial mid grey", ["#808080", "#7a7a7a", "#888888", "#909090"]],
  ];

  it.each(GROUNDS)("%s — no letter falls below AA large", (_label, palette) => {
    const plan = heroMotif(loteria({ heroPalette: palette }));
    expect(plan.motif).toBe("loteria");
    if (plan.motif === "none" || plan.motif === "photo_band") throw new Error("unreachable");
    expect(plan.titleColors.length).toBeGreaterThan(0);
    for (const c of plan.titleColors) {
      expect(contrastRatio(c, plan.ground)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  // The most likely real failure: palette[0] is both the ground AND the first
  // colour the cycle hands to the headline, so letter one would be painted the
  // same colour as the surface behind it and simply disappear.
  it("never paints a letter in the ground colour", () => {
    const plan = heroMotif(loteria());
    if (plan.motif !== "loteria") throw new Error("unreachable");
    expect(plan.titleColors).not.toContain(plan.ground);
  });

  it("gates stored title colours too, not just cycled ones", () => {
    // Seven colours for "LOTERÍA", all of them the ground colour.
    const unreadable = Array(7).fill("#f7ead0");
    const plan = heroMotif(loteria({ heroTitleColors: unreadable }));
    if (plan.motif !== "loteria") throw new Error("unreachable");
    expect(plan.titleColors).toEqual(Array(7).fill(plan.ink));
  });

  it("leaves readable stored colours untouched", () => {
    // All seven clear 3:1 against cream. Red (4.22) and green (4.24) sit in the
    // gap between AA_LARGE and AA_CONTRAST and are exactly why the headline is
    // gated at the large-text threshold rather than the normal-text one.
    const readable = ["#1f3a63", "#d42b2b", "#2e7d4f", "#6b3fa0", "#8a4b18", "#1f3a63", "#d42b2b"];
    const plan = heroMotif(loteria({ heroTitleColors: readable }));
    expect(plan).toMatchObject({ titleColors: readable });
  });
});

// The rotating hero shows a second language whose headline is a different
// length. Reusing the primary's colour array would run out or leave a tail.
describe("letterColors — the other language", () => {
  it("returns one gated colour per character of any title", () => {
    const plan = heroMotif(loteria());
    const colors = letterColors("¡Noche de Lotería!", plan);
    expect(colors).toHaveLength([..."¡Noche de Lotería!"].length);
    for (const c of colors) {
      expect(contrastRatio(c, "#f7ead0")).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it("counts by NFC code points, like the primary title does", () => {
    const plan = heroMotif(loteria());
    expect(letterColors("LOTERI\u0301A", plan)).toHaveLength(7);
  });

  it("returns nothing for a plan that draws no lettering", () => {
    expect(letterColors("LOTERÍA", { motif: "none" })).toEqual([]);
    const band = heroMotif(
      src({
        heroMotif: "photo_band",
        heroPalette: PALETTE,
        heroTitle: "El Palomazo",
        heroTokens: { motif: "photo_band", bandTop: 32, bandHeight: 38 },
      }),
    );
    expect(letterColors("El Palomazo", band)).toEqual([]);
  });

  it("returns nothing for an empty title", () => {
    expect(letterColors(null, heroMotif(loteria()))).toEqual([]);
    expect(letterColors("  ", heroMotif(loteria()))).toEqual([]);
  });
});
