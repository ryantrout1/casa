import type { HeroLang } from "./publish";

// A fiesta can carry its hero copy twice: the primary set lives in the hero_*
// columns and is tagged by hero_lang, the other language in hero_*_alt. This
// module decides what the hero actually gets to render.
//
// Pure and client-safe, like heroTheme and heroDates — the rotating hero is a
// client component and must not drag the Neon driver into the bundle.

/** The four copy fields, in one language, ready to render. */
export type HeroBlock = {
  lang: HeroLang;
  title: string | null;
  script: string | null;
  ribbon: string | null;
  sub: string | null;
};

/** The row shape this module needs — a subset of Flyer, so callers can pass one. */
export type HeroSource = {
  heroLang: HeroLang;
  heroTitle: string | null;
  heroScript: string | null;
  heroRibbon: string | null;
  heroSub: string | null;
  heroTitleAlt: string | null;
  heroScriptAlt: string | null;
  heroRibbonAlt: string | null;
  heroSubAlt: string | null;
};

export function otherLang(l: HeroLang): HeroLang {
  return l === "es" ? "en" : "es";
}

// Stored text, trimmed, or null for absent-or-blank. A field holding only
// spaces is not a translation.
function t(v: string | null): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
}

/**
 * Split a fiesta row into the block the hero renders and, when there is a
 * usable one, the block it alternates with.
 *
 * The alternate is all-or-nothing on purpose. Cross-fading to a block that is
 * missing a line the primary has would make that line vanish for six seconds
 * and come back — a flicker the visitor reads as a bug, not a translation. So
 * the alternate has to cover every field the primary actually uses; anything
 * less is treated as no alternate at all and the hero stays still.
 */
export function heroBlocks(f: HeroSource): { primary: HeroBlock; alt: HeroBlock | null } {
  const primary: HeroBlock = {
    lang: f.heroLang,
    title: t(f.heroTitle),
    script: t(f.heroScript),
    ribbon: t(f.heroRibbon),
    sub: t(f.heroSub),
  };

  const candidate: HeroBlock = {
    lang: otherLang(f.heroLang),
    title: t(f.heroTitleAlt),
    // An alt line for a field the primary does not use is dropped rather than
    // rendered: the two blocks have to have the same shape, and the primary
    // decides that shape.
    script: primary.script ? t(f.heroScriptAlt) : null,
    ribbon: primary.ribbon ? t(f.heroRibbonAlt) : null,
    sub: primary.sub ? t(f.heroSubAlt) : null,
  };

  const keys = ["title", "script", "ribbon", "sub"] as const;

  // No title, no takeover — Hero falls back to the brand hero, so there is
  // nothing to alternate with.
  if (!primary.title) return { primary, alt: null };

  // Every field the primary uses must be covered.
  const covered = keys.every((k) => (primary[k] === null ? true : candidate[k] !== null));
  if (!covered) return { primary, alt: null };

  // A translation identical to the original is a six-second no-op that costs a
  // timer, an animation, and a duplicated block in the accessibility tree.
  const identical = keys.every((k) => primary[k] === candidate[k]);
  if (identical) return { primary, alt: null };

  return { primary, alt: candidate };
}
