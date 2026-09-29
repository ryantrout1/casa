import { describe, it, expect } from "vitest";
import { SPECIALS } from "./specials";
import {
  TONES,
  priceLabel,
  titleSize,
  toneStyle,
  buildSpecialsView,
} from "./specialsView";
import { contrastRatio, AA_CONTRAST, AA_LARGE } from "./palette";

const OPEN_DAYS: Array<[number, string]> = [
  [2, "taco"],
  [3, "fajita"],
  [4, "enchilada"],
  [5, "seafood"],
  [6, "molcajete"],
  [0, "molcajete"],
];

describe("buildSpecialsView", () => {
  it("features the right special on every open day", () => {
    for (const [day, id] of OPEN_DAYS) {
      expect(buildSpecialsView(day).featured?.id, `weekday ${day}`).toBe(id);
    }
  });

  it("puts the other four specials in the rail, in SPECIALS order", () => {
    for (const [day, id] of OPEN_DAYS) {
      const rail = buildSpecialsView(day).rail.map((r) => r.id);
      expect(rail).toEqual(SPECIALS.map((s) => s.id).filter((s) => s !== id));
    }
  });

  it("is closed on Monday and shows every special in the rail", () => {
    const view = buildSpecialsView(1);
    expect(view.featured).toBeNull();
    expect(view.rail).toHaveLength(SPECIALS.length);
  });

  it("carries the tone for the featured special's accent", () => {
    const f = buildSpecialsView(3).featured!;
    expect(f.tone).toEqual(TONES.yel);
  });

  it("links Taco Tuesday to its page and every other day to the menu", () => {
    for (const [day, id] of OPEN_DAYS) {
      const cta = buildSpecialsView(day).featured!.cta;
      if (id === "taco") {
        expect(cta.href).toBe("/taco-tuesday");
      } else {
        expect(cta.href).toBe("/menu");
      }
      expect(cta.label.length).toBeGreaterThan(0);
    }
  });

  it("drops empty include entries and omits a missing pairing", () => {
    for (const [day] of OPEN_DAYS) {
      const f = buildSpecialsView(day).featured!;
      expect(f.includes.every((i) => i.trim().length > 0)).toBe(true);
      if (f.pair) expect(f.pair.photo).toMatch(/^\/images\//);
    }
    expect(buildSpecialsView(3).featured!.pair).toBeUndefined();
  });
});

describe("priceLabel", () => {
  it("shows the price when there is one", () => {
    expect(priceLabel({ price: "$19.99" })).toBe("$19.99");
  });

  it("shows Fan favorite when there is no price", () => {
    expect(priceLabel({ price: undefined })).toBe("Fan favorite");
    expect(priceLabel({ price: "" })).toBe("Fan favorite");
  });

  it("gives Molcajete Weekends the Fan favorite label", () => {
    expect(buildSpecialsView(6).featured!.priceLabel).toBe("Fan favorite");
  });
});

describe("titleSize", () => {
  it("buckets by length so every title fits one line", () => {
    expect(titleSize("Taco Tuesday")).toBe("l");
    expect(titleSize("Fajita Wednesday")).toBe("m");
    expect(titleSize("Enchilada Thursday")).toBe("s");
  });
});

describe("TONES contrast", () => {
  for (const [accent, t] of Object.entries(TONES)) {
    it(`${accent}: body ink on deep clears AA`, () => {
      expect(contrastRatio(t.deep, t.ink)).toBeGreaterThanOrEqual(AA_CONTRAST);
    });
    it(`${accent}: script on deep clears AA large`, () => {
      expect(contrastRatio(t.deep, t.script)).toBeGreaterThanOrEqual(AA_LARGE);
    });
    it(`${accent}: price ink on starburst clears AA large`, () => {
      expect(contrastRatio(t.star, t.starInk)).toBeGreaterThanOrEqual(AA_LARGE);
    });
  }
});

describe("toneStyle", () => {
  it("maps a tone to the section's CSS custom properties", () => {
    expect(toneStyle(TONES.teal)).toEqual({
      "--wk-deep": TONES.teal.deep,
      "--wk-ink": TONES.teal.ink,
      "--wk-script": TONES.teal.script,
      "--wk-star": TONES.teal.star,
      "--wk-star-ink": TONES.teal.starInk,
    });
  });
});
