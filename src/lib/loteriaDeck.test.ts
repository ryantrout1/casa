import { describe, it, expect } from "vitest";
import { LOTERIA_CARDS, type LoteriaCard } from "./heroMotif";
import { LOTERIA_DECK, splitCards } from "./loteriaDeck";

// The deck is data, not drawing. Shapes are described as primitives here and
// turned into SVG by the component, which is what lets the interesting parts —
// is every card present, do the colours stay canonical, does splitting lose a
// card — be tested at all in a repo with no jsdom.

describe("LOTERIA_DECK — totality", () => {
  it.each(LOTERIA_CARDS)("%s has usable art", (card) => {
    const art = LOTERIA_DECK[card];
    expect(art).toBeDefined();
    expect(art.name.trim()).not.toBe("");
    expect(art.n).toBeGreaterThan(0);
    expect(art.panel).toMatch(/^#[0-9a-f]{6}$/);
    expect(art.shapes.length).toBeGreaterThan(0);
  });

  it("has an entry for every card and no extras", () => {
    expect(Object.keys(LOTERIA_DECK).sort()).toEqual([...LOTERIA_CARDS].sort());
  });

  it("gives every card a distinct number, as a real deck does", () => {
    const ns = LOTERIA_CARDS.map((c) => LOTERIA_DECK[c].n);
    expect(new Set(ns).size).toBe(ns.length);
  });

  // Every shape is drawn into a 66x66 art panel. A stray coordinate would not
  // throw — it would quietly paint outside the card frame and over the copy.
  it("keeps every shape inside the art panel", () => {
    for (const card of LOTERIA_CARDS) {
      for (const s of LOTERIA_DECK[card].shapes) {
        if (s.k === "circle") {
          expect(s.cx - s.r).toBeGreaterThanOrEqual(-2);
          expect(s.cx + s.r).toBeLessThanOrEqual(68);
          expect(s.cy - s.r).toBeGreaterThanOrEqual(-2);
          expect(s.cy + s.r).toBeLessThanOrEqual(68);
        }
        if (s.k === "rect") {
          expect(s.x).toBeGreaterThanOrEqual(-2);
          expect(s.y).toBeGreaterThanOrEqual(-2);
          expect(s.x + s.w).toBeLessThanOrEqual(68);
          expect(s.y + s.h).toBeLessThanOrEqual(68);
        }
      }
    }
  });
});

// A lotería card is a known image. El Sol is yellow on pale blue and La Luna is
// gold on night navy — that is what makes them recognisable across every
// printing. Wiring the row's palette in here would tint El Sol magenta on a
// magenta flyer and it would stop being El Sol. PapelPicado recolours; the deck
// deliberately does not, and this test is the guard against someone
// "helpfully" unifying the two later.
describe("LOTERIA_DECK — canonical colours, never the row's palette", () => {
  // Pinning all eight panels IS the guard. If someone later wires the row's
  // palette into the deck, these fail immediately and by name.
  //
  // The tempting version of this test — assert no deck colour appears in a
  // flyer palette — does not work and was removed: El Gallo's comb is #d42b2b
  // and so is Casa's brand red. Canonical lotería red and Casa red are the same
  // red, so value overlap proves nothing either way.
  it.each([
    ["el_sol", "#bfe4f2"],
    ["la_rosa", "#fdf4e0"],
    ["la_luna", "#1f3a63"],
    ["la_mano", "#4a90d9"],
    ["el_corazon", "#fdf4e0"],
    ["la_chalupa", "#8fc4d8"],
    ["la_sirena", "#4a90d9"],
    ["el_gallo", "#f2c94c"],
  ] as const)("%s keeps its panel", (card, panel) => {
    expect(LOTERIA_DECK[card].panel).toBe(panel);
  });

  it("gives El Sol a yellow face and La Luna a gold crescent", () => {
    expect(LOTERIA_DECK.el_sol.shapes.some((s) => "fill" in s && s.fill === "#f5c518")).toBe(true);
    expect(LOTERIA_DECK.la_luna.shapes.some((s) => "fill" in s && s.fill === "#f2c94c")).toBe(true);
  });
});

describe("splitCards", () => {
  const four: LoteriaCard[] = ["el_sol", "la_rosa", "la_mano", "la_luna"];

  it("splits four evenly", () => {
    expect(splitCards(four)).toEqual({
      left: ["el_sol", "la_rosa"],
      right: ["la_mano", "la_luna"],
    });
  });

  it("splits two one apiece", () => {
    expect(splitCards(["el_gallo", "el_corazon"])).toEqual({
      left: ["el_gallo"],
      right: ["el_corazon"],
    });
  });

  // Odd counts lean left. Visibly asymmetric, but the tilt reads as deliberate
  // and 2 or 4 is the natural pick anyway.
  it("leans an odd count to the left", () => {
    expect(splitCards(["el_sol", "la_rosa", "la_mano"])).toEqual({
      left: ["el_sol", "la_rosa"],
      right: ["la_mano"],
    });
  });

  // The silent-drop guard. Group SIZES being right is not the same as no card
  // going missing, and a dropped card would just look like a quieter hero.
  it.each([1, 2, 3, 4])("loses and duplicates nothing at length %i", (n) => {
    const cards = four.slice(0, n);
    const { left, right } = splitCards(cards);
    expect([...left, ...right]).toEqual(cards);
  });

  it("handles an empty list without throwing", () => {
    expect(splitCards([])).toEqual({ left: [], right: [] });
  });
});
