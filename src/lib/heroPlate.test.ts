import { describe, it, expect } from "vitest";
import { AA_CONTRAST, AA_LARGE, contrastRatio } from "./palette";
import { heroViews, type HeroViewSource } from "./heroViews";
import { heroMotif, type MotifSource } from "./heroMotif";
import {
  FLYER_CLOSE_LABEL,
  FLYER_LABEL,
  PLATE_BREAKPOINT,
  PLATE_GROUND,
  PLATE_INK,
  PLATE_SHADE,
  PLATE_SHADE_MIN,
  heroTier,
  plateFocusCss,
  platePath,
  plateSources,
  plateStyleVars,
  type PlateSource,
} from "./heroPlate";

// A fiesta can carry a text-free background plate. When it does, the hero goes
// full-bleed with live copy over it. When it does not, NOTHING changes: every
// row in production today has no plate and must resolve to the tier it
// rendered before this module existed.

const ID = "72dcee08-9888-409c-a4eb-d0cd7e1b1b68";
const ID2 = "33350609-061e-4718-97c1-18e8fc2f2e9c";

type Row = PlateSource & MotifSource & HeroViewSource;

function row(over: Partial<Row> = {}): Row {
  return {
    heroPlateUrl: null,
    heroPlateMobileUrl: null,
    heroPlateFocus: null,
    heroMotif: null,
    heroPalette: null,
    heroTitleColors: null,
    heroTokens: null,
    heroTitle: null,
    heroScript: null,
    heroRibbon: null,
    heroSub: null,
    heroLang: "en",
    heroTitleAlt: null,
    heroScriptAlt: null,
    heroRibbonAlt: null,
    heroSubAlt: null,
    startsAt: null,
    eventDate: null,
    ...over,
  };
}

// The tier expression Hero.tsx used before plates existed, kept verbatim so
// the equivalence below is against the real old behaviour, not a paraphrase.
function legacyTier(f: Row): "motif" | "flyer" | "brand" {
  const views = heroViews(f);
  if (views.length > 0 && views[0].when) {
    return heroMotif(f).motif !== "none" ? "motif" : "flyer";
  }
  return "brand";
}

describe("platePath: stored plates are same-origin paths only", () => {
  it("keeps a bare /api/img path", () => {
    expect(platePath(`/api/img/${ID}`)).toBe(`/api/img/${ID}`);
  });

  it("strips any host, including a preview host, down to the path", () => {
    expect(platePath(`https://www.casadeleyva.com/api/img/${ID}`)).toBe(`/api/img/${ID}`);
    expect(platePath(`https://casa-git-x-ryan.vercel.app/api/img/${ID}`)).toBe(`/api/img/${ID}`);
  });

  it("lowercases the id so the DB CHECK and this module agree", () => {
    expect(platePath(`/api/img/${ID.toUpperCase()}`)).toBe(`/api/img/${ID}`);
  });

  it("trims surrounding whitespace", () => {
    expect(platePath(`  /api/img/${ID}  `)).toBe(`/api/img/${ID}`);
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    42,
    {},
    "/api/img/not-a-uuid",
    `/api/img/${ID}/extra`,
    `/api/img/${ID}?w=100`,
    `https://evil.example/api/img/${ID}?x=1`,
    `/images/HERO_BAR.jpg`,
    `javascript:alert(1)`,
    `ftp://x/api/img/${ID}`,
    `//evil.example/api/img/${ID}`,
  ])("rejects %s", (v) => {
    expect(platePath(v)).toBeNull();
  });
});

describe("plateFocusCss: one number, applied to whichever axis crops", () => {
  it("defaults to the centre", () => {
    expect(plateFocusCss(null)).toBe("50% 50%");
  });
  it("keeps 0 as a real value", () => {
    expect(plateFocusCss(0)).toBe("0% 0%");
  });
  it("clamps and rounds", () => {
    expect(plateFocusCss(140)).toBe("100% 100%");
    expect(plateFocusCss(-3)).toBe("0% 0%");
    expect(plateFocusCss(33.6)).toBe("34% 34%");
  });
  it("treats a non-finite value as unset", () => {
    expect(plateFocusCss(Number.NaN)).toBe("50% 50%");
  });
});

describe("PLATE_BREAKPOINT", () => {
  it("matches the stylesheet's mobile block", () => {
    expect(PLATE_BREAKPOINT).toBe(880);
  });
});

describe("plateSources", () => {
  it("is null without a desktop plate, even when a mobile plate is set", () => {
    expect(plateSources(row({ heroPlateMobileUrl: `/api/img/${ID2}` }))).toBeNull();
  });

  it("is null when the desktop plate is unusable", () => {
    expect(plateSources(row({ heroPlateUrl: "/images/HERO_BAR.jpg" }))).toBeNull();
  });

  it("returns desktop only when there is no mobile plate", () => {
    expect(plateSources(row({ heroPlateUrl: `/api/img/${ID}` }))).toEqual({
      desktop: `/api/img/${ID}`,
      mobile: null,
      pos: "50% 50%",
    });
  });

  it("returns both plates and the focus", () => {
    expect(
      plateSources(
        row({
          heroPlateUrl: `/api/img/${ID}`,
          heroPlateMobileUrl: `/api/img/${ID2}`,
          heroPlateFocus: 30,
        }),
      ),
    ).toEqual({ desktop: `/api/img/${ID}`, mobile: `/api/img/${ID2}`, pos: "30% 30%" });
  });

  it("drops an unusable mobile plate rather than voiding the desktop one", () => {
    expect(
      plateSources(row({ heroPlateUrl: `/api/img/${ID}`, heroPlateMobileUrl: "nope" })),
    ).toEqual({ desktop: `/api/img/${ID}`, mobile: null, pos: "50% 50%" });
  });
});

describe("plate legibility", () => {
  it("the shade minimum is what the ground is computed from", () => {
    expect(PLATE_SHADE_MIN).toBeGreaterThanOrEqual(0.8);
    expect(PLATE_SHADE_MIN).toBeLessThanOrEqual(1);
  });

  it("the ground is the shade composited over pure white, the worst case", () => {
    const c = (ch: number) =>
      Math.round(PLATE_SHADE_MIN * ch + (1 - PLATE_SHADE_MIN) * 255)
        .toString(16)
        .padStart(2, "0");
    expect(PLATE_GROUND).toBe(`#${c(PLATE_SHADE.r)}${c(PLATE_SHADE.g)}${c(PLATE_SHADE.b)}`);
  });

  it("the ink clears normal-text AA against the worst-case ground", () => {
    expect(contrastRatio(PLATE_INK, PLATE_GROUND)).toBeGreaterThanOrEqual(AA_CONTRAST);
  });
});

describe("plateStyleVars: two themed colours at most, gated on the plate ground", () => {
  it("always sets the ink and never a ground", () => {
    const v = plateStyleVars({ heroAccent: null });
    expect(v["--fx-ink"]).toBe(PLATE_INK);
    expect(v["--fx-bg"]).toBeUndefined();
  });

  it("keeps an accent that clears both ratios", () => {
    // Honky Tonk's stored accent.
    const v = plateStyleVars({ heroAccent: "#D9A93F" });
    expect(contrastRatio("#d9a93f", PLATE_GROUND)).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(v["--fx-accent"]).toBe("#d9a93f");
    expect(v["--fx-accent-lg"]).toBe("#d9a93f");
  });

  it("keeps a large-only accent for display type and drops it for the eyebrow", () => {
    // A muted gold that sits between the two thresholds on this ground.
    const mid = "#b08030";
    const r = contrastRatio(mid, PLATE_GROUND);
    expect(r).toBeGreaterThanOrEqual(AA_LARGE);
    expect(r).toBeLessThan(AA_CONTRAST);
    const v = plateStyleVars({ heroAccent: mid });
    expect(v["--fx-accent"]).toBeUndefined();
    expect(v["--fx-accent-lg"]).toBe(mid);
  });

  it("drops an accent that fails both", () => {
    const v = plateStyleVars({ heroAccent: "#2a1a10" });
    expect(v["--fx-accent"]).toBeUndefined();
    expect(v["--fx-accent-lg"]).toBeUndefined();
  });

  it("ignores a malformed accent", () => {
    expect(Object.keys(plateStyleVars({ heroAccent: "gold" }))).toEqual(["--fx-ink"]);
  });
});

describe("FLYER_LABEL", () => {
  it("has a label per language", () => {
    expect(FLYER_LABEL).toEqual({ en: "View Flyer", es: "Ver el Flyer" });
    expect(FLYER_CLOSE_LABEL).toEqual({ en: "Close", es: "Cerrar" });
  });
});

describe("heroTier", () => {
  const START = "2026-09-20T03:00:00Z";
  const titled = { heroTitle: "DEL RANCHO AL HONKY TONK", startsAt: START };
  const plate = { heroPlateUrl: `/api/img/${ID}` };
  const loteria = {
    heroMotif: "loteria",
    heroPalette: ["#f7ead0", "#d42b2b", "#2e7d4f"],
    heroTokens: { motif: "loteria", cards: ["el_sol", "la_rosa"] },
  };

  it("brand without a headline, plate or not", () => {
    const f = row({ ...plate, startsAt: START });
    expect(heroTier(f, heroViews(f))).toBe("brand");
  });

  it("brand without a usable date, plate or not", () => {
    const f = row({ ...plate, heroTitle: "X" });
    expect(heroTier(f, heroViews(f))).toBe("brand");
  });

  it("plate when a titled, dated row has a usable plate", () => {
    const f = row({ ...titled, ...plate });
    expect(heroTier(f, heroViews(f))).toBe("plate");
  });

  it("plate outranks a valid motif", () => {
    const f = row({ ...titled, ...plate, ...loteria, heroTitle: "LOTERÍA" });
    expect(heroMotif(f).motif).toBe("loteria");
    expect(heroTier(f, heroViews(f))).toBe("plate");
  });

  it("an unusable plate falls through to the old tiers", () => {
    const f = row({ ...titled, heroPlateUrl: "/images/HERO_BAR.jpg" });
    expect(heroTier(f, heroViews(f))).toBe("flyer");
    const g = row({ ...titled, ...loteria, heroTitle: "LOTERÍA", heroPlateUrl: "junk" });
    expect(heroTier(g, heroViews(g))).toBe("motif");
  });

  it("a mobile plate alone does not change the tier", () => {
    const f = row({ ...titled, heroPlateMobileUrl: `/api/img/${ID2}` });
    expect(heroTier(f, heroViews(f))).toBe("flyer");
  });

  // Without a plate, the new function must agree with the old expression on
  // every combination that decides a tier.
  const combos: Partial<Row>[] = [];
  for (const title of [null, "LOTERÍA", "  "]) {
    for (const startsAt of [null, START, "garbage"]) {
      for (const eventDate of [null, "2026-09-19"]) {
        for (const motif of [{}, loteria, { ...loteria, heroTokens: null }]) {
          combos.push({ heroTitle: title, startsAt, eventDate, ...motif });
        }
      }
    }
  }
  it.each(combos.map((c, i) => [i, c] as const))(
    "without a plate, combo %i matches the legacy tier",
    (_i, c) => {
      const f = row(c);
      expect(heroTier(f, heroViews(f))).toBe(legacyTier(f));
    },
  );

  // Every row in production on 2026-09-17. None has a plate, so each must
  // resolve exactly as it did before: titled and dated rows to the flyer
  // takeover, everything else to the brand hero. No row has a motif.
  it.each([
    ["c5ab4502", false, false],
    ["c28796a9", false, false],
    ["51f0fd85", false, false],
    ["6c6524ee", false, false],
    ["b445fa30", false, false],
    ["d2520ec1", false, false],
    ["81d46dd6", false, false],
    ["a345b276", false, false],
    ["d08d67a7", false, true],
    ["1de810e1", false, false],
    ["020dc45b", false, true],
    ["39588c66", false, false],
    ["e0b03fff", false, false],
    ["07df43aa", true, true],
    ["2c6c2743", true, true],
    ["0d099af5", true, true],
    ["9ded4807", true, true],
    ["fec3be44", true, true],
    ["367e6ee4", true, true],
  ])("live row %s keeps its tier", (_id, hasTitle, hasDate) => {
    const f = row({
      heroTitle: hasTitle ? "TITLE" : null,
      startsAt: hasDate ? START : null,
    });
    const expected = hasTitle && hasDate ? "flyer" : "brand";
    expect(legacyTier(f)).toBe(expected);
    expect(heroTier(f, heroViews(f))).toBe(expected);
  });
});
