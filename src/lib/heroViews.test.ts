import { describe, it, expect } from "vitest";
import { heroViews, ROTATE_MS, FADE_MS, type HeroViewSource } from "./heroViews";

// heroViews turns one fiesta row into the 1-or-2 render models the hero
// rotates through. It is the whole decision surface of the bilingual hero:
// whether to rotate at all, what each language's date line reads, and which
// button labels ride with which language. The client component only holds an
// index over what this returns.
//
// The live Lotería row is the fixture: hero_lang 'en', starts_at
// 2026-08-21T01:00:00Z, which is 6 PM Thursday 20 August in Phoenix.

const LOTERIA = (o: Partial<HeroViewSource> = {}): HeroViewSource => ({
  startsAt: "2026-08-21T01:00:00Z",
  eventDate: "2026-08-20",
  heroLang: "en",
  heroTitle: "LOTERÍA",
  heroScript: "Night!",
  heroRibbon: "FUN! ★ PRIZES! ★ COMMUNITY!",
  heroSub: "Cards on sale from 5 PM · First card drawn at 6 PM · All ages",
  heroTitleAlt: "LOTERÍA",
  heroScriptAlt: "¡Noche de!",
  heroRibbonAlt: "¡DIVERSIÓN! ★ ¡PREMIOS! ★ ¡COMUNIDAD!",
  heroSubAlt: "Cartas a la venta desde las 5 PM · Primera carta a las 6 PM · Para toda la familia",
  ...o,
});

describe("heroViews — how many views", () => {
  it("returns two when the alt copy is complete", () => {
    const views = heroViews(LOTERIA());
    expect(views).toHaveLength(2);
    expect(views[0].lang).toBe("en");
    expect(views[1].lang).toBe("es");
  });

  it("leads with the primary language, whichever it is", () => {
    const views = heroViews(LOTERIA({ heroLang: "es" }));
    expect(views[0].lang).toBe("es");
    expect(views[1].lang).toBe("en");
  });

  it("returns one when the alt misses a field the primary uses", () => {
    // Rotating to a block with no ribbon would drop the ribbon for seven
    // seconds and bring it back. One view means no timer at all.
    expect(heroViews(LOTERIA({ heroRibbonAlt: null }))).toHaveLength(1);
    expect(heroViews(LOTERIA({ heroSubAlt: null }))).toHaveLength(1);
    expect(heroViews(LOTERIA({ heroScriptAlt: null }))).toHaveLength(1);
  });

  it("returns one when the alt is only whitespace", () => {
    expect(heroViews(LOTERIA({ heroSubAlt: "   " }))).toHaveLength(1);
  });

  it("returns one when the alt is identical to the primary", () => {
    const same = LOTERIA({
      heroTitleAlt: "LOTERÍA",
      heroScriptAlt: "Night!",
      heroRibbonAlt: "FUN! ★ PRIZES! ★ COMMUNITY!",
      heroSubAlt: "Cards on sale from 5 PM · First card drawn at 6 PM · All ages",
    });
    expect(heroViews(same)).toHaveLength(1);
  });

  it("returns none when there is no headline", () => {
    // No title means no takeover; Hero falls back to the brand hero.
    expect(heroViews(LOTERIA({ heroTitle: null }))).toHaveLength(0);
  });
});

describe("heroViews — existing rows are unaffected", () => {
  it("returns exactly one view for a row with no alt copy at all", () => {
    // Every hero row in production today looks like this. Shipping must not
    // change what any of them render.
    const legacy = LOTERIA({
      heroTitleAlt: null,
      heroScriptAlt: null,
      heroRibbonAlt: null,
      heroSubAlt: null,
    });
    const views = heroViews(legacy);
    expect(views).toHaveLength(1);
    expect(views[0].lang).toBe("en");
    expect(views[0].title).toBe("LOTERÍA");
    expect(views[0].script).toBe("Night!");
    expect(views[0].ribbon).toBe("FUN! ★ PRIZES! ★ COMMUNITY!");
    expect(views[0].sub).toBe("Cards on sale from 5 PM · First card drawn at 6 PM · All ages");
    expect(views[0].when).toBe("THURSDAY AUGUST 20 · 6 PM");
  });
});

describe("heroViews — the date line", () => {
  it("writes each view's date in that view's own language", () => {
    const [en, es] = heroViews(LOTERIA());
    expect(en.when).toBe("THURSDAY AUGUST 20 · 6 PM");
    expect(es.when).toBe("JUEVES 20 DE AGOSTO · 6 PM");
  });

  it("uses the Phoenix wall clock, not UTC", () => {
    // 01:00Z on the 21st is 6 PM on the 20th in Phoenix. Reading the instant
    // as UTC would print FRIDAY AUGUST 21.
    const [en] = heroViews(LOTERIA());
    expect(en.when).toContain("THURSDAY");
    expect(en.when).toContain("AUGUST 20");
  });

  it("omits the time when only a calendar date is known", () => {
    const [en, es] = heroViews(LOTERIA({ startsAt: null }));
    expect(en.when).toBe("THURSDAY AUGUST 20");
    expect(es.when).toBe("JUEVES 20 DE AGOSTO");
  });

  it("still returns the views when no date is usable, with a null line", () => {
    // The caller decides what an undated takeover means; heroViews does not
    // silently drop the copy.
    const views = heroViews(LOTERIA({ startsAt: null, eventDate: null }));
    expect(views).toHaveLength(2);
    expect(views[0].when).toBeNull();
    expect(views[1].when).toBeNull();
  });
});

describe("heroViews — the buttons", () => {
  it("labels the buttons in each view's own language", () => {
    const [en, es] = heroViews(LOTERIA());
    expect(en.ctas).toEqual({ directions: "Get Directions", menu: "See the Menu" });
    expect(es.ctas).toEqual({ directions: "Cómo Llegar", menu: "Ver el Menú" });
  });

  it("gives a Spanish-primary row Spanish buttons first", () => {
    const [first] = heroViews(LOTERIA({ heroLang: "es" }));
    expect(first.ctas.directions).toBe("Cómo Llegar");
  });
});

describe("heroViews — the copy", () => {
  it("carries the alt copy through verbatim", () => {
    const [, es] = heroViews(LOTERIA());
    expect(es.title).toBe("LOTERÍA");
    expect(es.script).toBe("¡Noche de!");
    expect(es.ribbon).toBe("¡DIVERSIÓN! ★ ¡PREMIOS! ★ ¡COMUNIDAD!");
    expect(es.sub).toBe(
      "Cartas a la venta desde las 5 PM · Primera carta a las 6 PM · Para toda la familia",
    );
  });

  it("keeps the event name untranslated when that is what was stored", () => {
    // "English with a Mexican accent": LOTERÍA does not become BINGO.
    const [en, es] = heroViews(LOTERIA());
    expect(en.title).toBe(es.title);
  });

  it("trims stored values", () => {
    const [, es] = heroViews(LOTERIA({ heroScriptAlt: "  ¡Noche de!  " }));
    expect(es.script).toBe("¡Noche de!");
  });

  it("gives both views the same shape when the primary omits a field", () => {
    // Both blocks are stacked in one grid cell, so a field present in one and
    // absent in the other is what makes the section change height.
    const [en, es] = heroViews(LOTERIA({ heroScript: null }));
    expect(en.script).toBeNull();
    expect(es.script).toBeNull();
  });
});

describe("heroViews — timing constants", () => {
  it("holds each language long enough to read and fades rather than cuts", () => {
    expect(ROTATE_MS).toBe(7000);
    expect(FADE_MS).toBeLessThan(ROTATE_MS);
  });
});
