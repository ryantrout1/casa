import { describe, it, expect } from "vitest";
import { heroBlocks, otherLang, type HeroSource } from "./heroAlt";

// A fiesta can carry its hero copy in two languages: the primary set in the
// hero_* columns, tagged by hero_lang, and the other language in hero_*_alt.
//
// The rule that matters: rotation is all-or-nothing. If the alt does not cover
// every field the primary uses, the hero would visibly drop a line mid-cycle —
// so an incomplete alt is no alt, and the hero stays static.

const src = (o: Partial<HeroSource> = {}): HeroSource => ({
  heroLang: "es",
  heroTitle: "EL PALOMAZO",
  heroScript: "en Casa",
  heroRibbon: "UNA NOCHE DE KARAOKE MEXICANO",
  heroSub: "424 E Monroe Ave., Buckeye, AZ",
  heroTitleAlt: "EL PALOMAZO",
  heroScriptAlt: "en Casa",
  heroRibbonAlt: "A NIGHT OF MEXICAN KARAOKE",
  heroSubAlt: "424 E Monroe Ave., Buckeye, AZ",
  ...o,
});

describe("otherLang", () => {
  it("flips the pair", () => {
    expect(otherLang("es")).toBe("en");
    expect(otherLang("en")).toBe("es");
  });
});

describe("heroBlocks — the primary", () => {
  it("takes the hero_* columns and hero_lang", () => {
    const { primary } = heroBlocks(src());
    expect(primary.lang).toBe("es");
    expect(primary.title).toBe("EL PALOMAZO");
    expect(primary.ribbon).toBe("UNA NOCHE DE KARAOKE MEXICANO");
  });

  it("carries nulls through rather than inventing blanks", () => {
    const { primary } = heroBlocks(src({ heroScript: null, heroSub: null }));
    expect(primary.script).toBeNull();
    expect(primary.sub).toBeNull();
  });
});

describe("heroBlocks — the alternate", () => {
  it("is the other language, from the _alt columns", () => {
    const { alt } = heroBlocks(src());
    expect(alt).not.toBeNull();
    expect(alt!.lang).toBe("en");
    expect(alt!.ribbon).toBe("A NIGHT OF MEXICAN KARAOKE");
  });

  it("keeps the event name untranslated when that is what was stored", () => {
    // The whole point of "English with Spanish flavour": the name does not
    // become "THE JAM SESSION".
    const { alt } = heroBlocks(src());
    expect(alt!.title).toBe("EL PALOMAZO");
    expect(alt!.script).toBe("en Casa");
  });

  it("is null when there is no alt title at all", () => {
    expect(
      heroBlocks(
        src({ heroTitleAlt: null, heroScriptAlt: null, heroRibbonAlt: null, heroSubAlt: null }),
      ).alt,
    ).toBeNull();
  });

  it("is null when the alt misses a field the primary uses", () => {
    // Rotating to a block with no ribbon would drop the ribbon for six
    // seconds and bring it back — worse than never rotating.
    expect(heroBlocks(src({ heroRibbonAlt: null })).alt).toBeNull();
    expect(heroBlocks(src({ heroSubAlt: null })).alt).toBeNull();
    expect(heroBlocks(src({ heroScriptAlt: null })).alt).toBeNull();
  });

  it("ignores an alt field the primary does not use", () => {
    // The primary has no script, so the alt having one is harmless — the
    // extra is dropped rather than voiding the pair.
    const { primary, alt } = heroBlocks(src({ heroScript: null }));
    expect(primary.script).toBeNull();
    expect(alt).not.toBeNull();
    expect(alt!.script).toBeNull();
  });

  it("is null when the primary has no title", () => {
    // No title means no takeover at all; Hero falls back to the brand hero.
    expect(heroBlocks(src({ heroTitle: null })).alt).toBeNull();
  });

  it("treats whitespace-only alt values as absent", () => {
    expect(heroBlocks(src({ heroRibbonAlt: "   " })).alt).toBeNull();
  });

  it("is null when the alt is identical to the primary", () => {
    // Cross-fading a block into itself is a six-second no-op that costs a
    // timer and an animation for nothing.
    const same = src({
      heroTitleAlt: "EL PALOMAZO",
      heroScriptAlt: "en Casa",
      heroRibbonAlt: "UNA NOCHE DE KARAOKE MEXICANO",
      heroSubAlt: "424 E Monroe Ave., Buckeye, AZ",
    });
    expect(heroBlocks(same).alt).toBeNull();
  });

  it("trims stored values", () => {
    const { alt } = heroBlocks(src({ heroRibbonAlt: "  A NIGHT OF MEXICAN KARAOKE  " }));
    expect(alt!.ribbon).toBe("A NIGHT OF MEXICAN KARAOKE");
  });
});

describe("heroBlocks — existing rows are unaffected", () => {
  it("returns no alt for a row predating the alt columns", () => {
    const legacy = src({
      heroTitleAlt: null,
      heroScriptAlt: null,
      heroRibbonAlt: null,
      heroSubAlt: null,
    });
    const { primary, alt } = heroBlocks(legacy);
    expect(alt).toBeNull();
    expect(primary.title).toBe("EL PALOMAZO");
  });
});
