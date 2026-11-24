// View model for the homepage "Every Day Is A Fiesta" section.
//
// Pure and client-safe, like specials.ts. Every decision the section makes
// (which special is featured, its colours, its price label, its title size,
// where its button goes) lives here so vitest can pin it; WeeklySpecials.tsx
// only renders what this returns. The repo has no jsdom, so anything decided
// inside the component could not be tested at all.

import { SPECIALS, specialForDay, type Accent, type Pairing, type Special } from "./specials";
import type { Closure, ClosureArt } from "./closures";

// Deep backgrounds for the featured card and rail tiles. The brand tokens
// themselves are too light to carry white body text (teal measures ~3:1), so
// each accent gets a darker shade plus the ink, script and starburst colours
// that clear contrast on it. Pinned by specialsView.test.ts.
export type Tone = {
  deep: string; // card background
  ink: string; // body text on deep
  script: string; // Pacifico day name on deep (always rendered at 24px+)
  star: string; // starburst fill behind the price
  starInk: string; // price text on the starburst
};

export const TONES: Record<Accent, Tone> = {
  teal: { deep: "#0d6f68", ink: "#ffffff", script: "#ffcf4d", star: "#ffbf1f", starInk: "#1f3a63" },
  yel: { deep: "#ffbf1f", ink: "#1f3a63", script: "#b0126a", star: "#e0218a", starInk: "#ffffff" },
  orng: { deep: "#b4510f", ink: "#ffffff", script: "#ffd66b", star: "#ffbf1f", starInk: "#1f3a63" },
  mag: { deep: "#a8125f", ink: "#ffffff", script: "#ffd66b", star: "#ffbf1f", starInk: "#1f3a63" },
  purp: { deep: "#6a3494", ink: "#ffffff", script: "#ffd66b", star: "#ffbf1f", starInk: "#1f3a63" },
};

export type TitleSize = "l" | "m" | "s";

export type Cta = { href: string; label: string };

export type FeaturedView = {
  id: string;
  day: string;
  title: string;
  blurb: string;
  photo?: string;
  priceLabel: string;
  titleSize: TitleSize;
  includes: string[];
  pair?: Pairing;
  cta: Cta;
  tone: Tone;
};

export type RailView = {
  id: string;
  day: string;
  title: string;
  photo?: string;
  priceLabel: string;
  tone: Tone;
};

// The card shown in place of the featured special when Casa is closed: every
// Monday, and the holiday closures in lib/closures.
export type ClosedView = {
  day: string; // Pacifico script line
  tag: string; // the pill beside it
  title: string;
  titleSize: TitleSize;
  blurb: string;
  art?: ClosureArt;
};

export type SpecialsView = {
  featured: FeaturedView | null; // null whenever closed is set
  closed: ClosedView | null;
  rail: RailView[];
};

const MONDAY: ClosedView = {
  day: "Cerrado",
  tag: "Monday",
  title: "Closed Mondays",
  titleSize: "l", // as it always rendered; the holiday titles are longer
  blurb: "See you Tuesday at 4 PM for Taco Tuesday!",
};

function holidayClosed(c: Closure): ClosedView {
  const title = `Closed for ${c.name}`;
  const view: ClosedView = {
    day: "Cerrado",
    tag: "Today",
    title,
    titleSize: titleSize(title),
    blurb: c.reopen,
  };
  if (c.art) view.art = c.art;
  return view;
}

// Prices render in Fredoka. Bangers draws "1" with a flag that reads as "7"
// at display sizes ($19.99 looked like $79.99), so no price uses Bangers.
export function priceLabel(s: Pick<Special, "price">): string {
  return s.price ? s.price : "Fan favorite";
}

// Length buckets that keep every current title on one line in the card.
export function titleSize(title: string): TitleSize {
  const n = title.length;
  if (n <= 12) return "l";
  if (n <= 16) return "m";
  return "s";
}

// Specials with their own page link there; everything else goes to the menu.
const CTAS: Record<string, Cta> = {
  taco: { href: "/taco-tuesday", label: "All about Taco Tuesday" },
};
const MENU_CTA: Cta = { href: "/menu", label: "See the menu" };

// The tone as the CSS custom properties the section's stylesheet reads.
export function toneStyle(t: Tone): Record<string, string> {
  return {
    "--wk-deep": t.deep,
    "--wk-ink": t.ink,
    "--wk-script": t.script,
    "--wk-star": t.star,
    "--wk-star-ink": t.starInk,
  };
}

function toFeatured(s: Special): FeaturedView {
  const includes = s.includes.map((i) => i.trim()).filter((i) => i.length > 0);
  const view: FeaturedView = {
    id: s.id,
    day: s.day,
    title: s.title,
    blurb: s.blurb,
    photo: s.photo,
    priceLabel: priceLabel(s),
    titleSize: titleSize(s.title),
    includes,
    cta: CTAS[s.id] ?? MENU_CTA,
    tone: TONES[s.accent],
  };
  if (s.pair && s.pair.photo && s.pair.text.trim()) view.pair = s.pair;
  return view;
}

function toRail(s: Special): RailView {
  return {
    id: s.id,
    day: s.day,
    title: s.title,
    photo: s.photo,
    priceLabel: priceLabel(s),
    tone: TONES[s.accent],
  };
}

// `holiday` is today's closure from lib/closures (closedOn), when there is
// one. It wins over the day's special: a closed Thursday shows the closure,
// not Enchilada Thursday, and the rail keeps the whole week.
export function buildSpecialsView(weekday: number, holiday: Closure | null = null): SpecialsView {
  const today = holiday ? null : specialForDay(weekday);
  const closed = holiday ? holidayClosed(holiday) : today ? null : MONDAY;
  return {
    featured: today ? toFeatured(today) : null,
    closed,
    rail: SPECIALS.filter((s) => s.id !== today?.id).map(toRail),
  };
}
