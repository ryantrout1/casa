import { describe, it, expect } from "vitest";
import { heroFocusCss, heroStyleVars } from "./heroTheme";
import { contrastRatio, relativeLuminance } from "./palette";

// These helpers moved out of lib/fiestas so the composer's client-side preview
// can import them without pulling the Neon driver into the browser bundle.
// They take plain objects here rather than a FiestaRow, which is the point of
// the split — the module knows nothing about the database.

const AA = 4.5;

const vars = (o: Partial<Parameters<typeof heroStyleVars>[0]> = {}) =>
  heroStyleVars({ heroBg: null, heroAccent: null, heroInk: null, ...o });

describe("heroFocusCss", () => {
  it("defaults to 50% when unset", () => {
    expect(heroFocusCss(null)).toBe("center 50%");
  });

  it("uses the stored value", () => {
    expect(heroFocusCss(38)).toBe("center 38%");
    expect(heroFocusCss(0)).toBe("center 0%");
    expect(heroFocusCss(100)).toBe("center 100%");
  });

  it("clamps out-of-range values rather than emitting invalid CSS", () => {
    expect(heroFocusCss(-20)).toBe("center 0%");
    expect(heroFocusCss(180)).toBe("center 100%");
  });

  it("rounds fractional values", () => {
    expect(heroFocusCss(37.6)).toBe("center 38%");
  });

  it("falls back to 50% for NaN", () => {
    expect(heroFocusCss(Number.NaN)).toBe("center 50%");
  });
});

describe("heroStyleVars", () => {
  it("emits no properties when there are no colours", () => {
    expect(vars()).toEqual({});
  });

  it("sets the ground and derives a readable ink from it", () => {
    const v = vars({ heroBg: "#1a1008" });
    expect(v["--fx-bg"]).toBe("#1a1008");
    expect(contrastRatio(v["--fx-ink"]!, "#1a1008")).toBeGreaterThanOrEqual(AA);
  });

  it("derives dark ink on a light ground", () => {
    const v = vars({ heroBg: "#fdf4e3" });
    expect(contrastRatio(v["--fx-ink"]!, "#fdf4e3")).toBeGreaterThanOrEqual(AA);
    expect(relativeLuminance(v["--fx-ink"]!)).toBeLessThan(0.3);
  });

  it("prefers a stored ink over the derived one", () => {
    expect(vars({ heroBg: "#1a1008", heroInk: "#ffffff" })["--fx-ink"]).toBe("#ffffff");
  });

  it("gives the accent its own readable text colour", () => {
    // The ribbon and the primary button are FILLED with the accent and carry
    // text on top. A single accent value cannot also be that text.
    const v = vars({ heroBg: "#fdf4e3", heroAccent: "#1f3a63" });
    expect(v["--fx-accent"]).toBe("#1f3a63");
    expect(contrastRatio(v["--fx-accent-ink"]!, "#1f3a63")).toBeGreaterThanOrEqual(AA);
  });

  it("mutes the sub-line whenever an ink is emitted", () => {
    expect(vars({ heroBg: "#1a1008" })["--fx-sub-op"]).toBe("0.82");
    expect(vars()["--fx-sub-op"]).toBeUndefined();
  });

  it("ignores colours that are not 6-digit hex", () => {
    expect(vars({ heroBg: "red" })).toEqual({});
    expect(vars({ heroBg: "#fff" })).toEqual({});
  });

  it("keeps the valid half when one colour is malformed", () => {
    const v = vars({ heroBg: "#1a1008", heroAccent: "nope" });
    expect(v["--fx-bg"]).toBe("#1a1008");
    expect(v["--fx-accent"]).toBeUndefined();
  });

  it("handles an accent with no background", () => {
    // Ground falls back to the stylesheet's #140c06, so the accent still needs
    // its own fill-text colour computed.
    const v = vars({ heroAccent: "#ffbf1f" });
    expect(v["--fx-bg"]).toBeUndefined();
    expect(v["--fx-accent"]).toBe("#ffbf1f");
    expect(contrastRatio(v["--fx-accent-ink"]!, "#ffbf1f")).toBeGreaterThanOrEqual(AA);
  });
});
