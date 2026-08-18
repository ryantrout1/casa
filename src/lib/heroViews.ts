import { heroBlocks, type HeroSource } from "./heroAlt";
import { heroWhen } from "./heroDates";
import type { HeroLang } from "./publish";

// One fiesta row becomes the 1-or-2 render models the hero rotates through.
// Every decision the bilingual hero makes lives here: whether to rotate at
// all, what each language's date line reads, which button labels ride with
// which language. HeroRotator only holds an index over what this returns.
//
// Pure and client-safe, like heroAlt, heroDates and heroTheme — the rotator is
// a client component and must not drag the Neon driver into the browser
// bundle. Import only from those three modules.

/** How long each language holds before the cross-fade starts. */
export const ROTATE_MS = 7000;

/** How long the cross-fade itself takes. Must stay well under ROTATE_MS. */
export const FADE_MS = 450;

export type HeroCtas = { directions: string; menu: string };

/**
 * Button labels are a fixed table rather than four more database columns.
 * They never vary by fiesta, and a column would mean re-typing "Cómo Llegar"
 * on every event just to get the same two words back.
 */
const CTAS: Record<HeroLang, HeroCtas> = {
  en: { directions: "Get Directions", menu: "See the Menu" },
  es: { directions: "Cómo Llegar", menu: "Ver el Menú" },
};

/** One language's worth of hero, ready to render. */
export type HeroView = {
  lang: HeroLang;
  /** The eyebrow line, already assembled — null when no date is usable. */
  when: string | null;
  title: string;
  script: string | null;
  ribbon: string | null;
  sub: string | null;
  ctas: HeroCtas;
};

/** What this module needs off a Flyer. Structurally a subset, so callers pass one. */
export type HeroViewSource = HeroSource & {
  startsAt: string | null;
  eventDate: string | null;
};

// "THURSDAY AUGUST 20 · 6 PM", or "JUEVES 20 DE AGOSTO · 6 PM". Assembled here
// rather than in the component so the separator and the ordering are covered
// by the same tests as the words themselves.
function whenLine(f: HeroViewSource, lang: HeroLang): string | null {
  const w = heroWhen(f.startsAt, f.eventDate, lang);
  if (!w) return null;
  return [`${w.day} ${w.date}`, w.time].filter(Boolean).join(" · ");
}

/**
 * The views the hero should render, in the order it should show them.
 *
 * Length 2 means rotate; length 1 means hold still; length 0 means there is no
 * takeover at all and the caller should fall back to the brand hero.
 *
 * The pairing rule is heroBlocks' and is deliberately all-or-nothing: an
 * alternate that misses a line the primary has would make that line vanish for
 * seven seconds and come back, which reads as a bug rather than a translation.
 * Every row in production today has null alt copy and so returns length 1 —
 * adding this module changes nothing for any of them.
 */
export function heroViews(f: HeroViewSource): HeroView[] {
  const { primary, alt } = heroBlocks(f);

  // No headline, no takeover. heroBlocks already refuses to pair in this case,
  // so this only has to decide between "one view" and "none".
  if (!primary.title) return [];

  const blocks = alt ? [primary, alt] : [primary];

  return blocks.map((b) => ({
    lang: b.lang,
    when: whenLine(f, b.lang),
    // Narrowed by the guard above for the primary; the alternate cannot exist
    // without a title, so both are non-null by construction.
    title: b.title as string,
    script: b.script,
    ribbon: b.ribbon,
    sub: b.sub,
    ctas: CTAS[b.lang],
  }));
}
