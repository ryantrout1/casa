// Timing for the brand hero's one-time entrance.
//
// Pure, so vitest can pin the order and the budget. Hero.tsx applies these as
// `--d` / `--dur` custom properties and globals.css does the animating, so
// every number that decides what the visitor sees lives here and nowhere else.
//
// Order: the script line writes itself on, the four headline words rise, then
// FIESTA! stamps in last, the ribbon opens and its text types out, the three
// tagline phrases tick in, and the buttons fade up. Everything is done inside
// ENTRANCE_BUDGET_MS so the hero settles quickly and the page does not feel
// slow to become readable.

export type EntranceStep = { startMs: number; durMs: number };

export type EntranceStepName = "script" | "words" | "fiesta" | "ribbon" | "beat" | "ctas";

export const ENTRANCE_BUDGET_MS = 1600;

// WHERE, EVERY, DAY, IS A. FIESTA! is its own step.
export const HEADLINE_WORDS = 4;
export const WORD_STAGGER_MS = 110;
export const BEAT_STAGGER_MS = 100;

export const ENTRANCE: Record<EntranceStepName, EntranceStep> = {
  script: { startMs: 0, durMs: 600 },
  words: { startMs: 150, durMs: 450 },
  fiesta: { startMs: 590, durMs: 500 },
  ribbon: { startMs: 700, durMs: 400 },
  beat: { startMs: 1000, durMs: 300 },
  ctas: { startMs: 1250, durMs: 350 },
};

// Ribbon typing: characters appear across a fixed span, so a longer ribbon
// types faster rather than running past the budget.
export const TYPE_START_MS = 850;
export const TYPE_SPAN_MS = 600;
export const TYPE_CHAR_MS = 60;

export function wordDelay(i: number): number {
  return ENTRANCE.words.startMs + i * WORD_STAGGER_MS;
}

export function beatDelay(i: number): number {
  return ENTRANCE.beat.startMs + i * BEAT_STAGGER_MS;
}

export function typeDelay(i: number, total: number): number {
  if (total <= 1) return TYPE_START_MS;
  // The last character starts early enough that it has finished appearing
  // by the end of the span.
  return TYPE_START_MS + Math.round((i * (TYPE_SPAN_MS - TYPE_CHAR_MS)) / (total - 1));
}

export const ENTRANCE_TOTAL_MS = Math.max(
  ...Object.values(ENTRANCE).map((s) => s.startMs + s.durMs),
  wordDelay(HEADLINE_WORDS - 1) + ENTRANCE.words.durMs,
  beatDelay(2) + ENTRANCE.beat.durMs,
);

export function ms(n: number): string {
  return `${n}ms`;
}
