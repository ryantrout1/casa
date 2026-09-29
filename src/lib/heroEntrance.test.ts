import { describe, it, expect } from "vitest";
import {
  ENTRANCE,
  ENTRANCE_BUDGET_MS,
  ENTRANCE_TOTAL_MS,
  HEADLINE_WORDS,
  TYPE_CHAR_MS,
  wordDelay,
  typeDelay,
  beatDelay,
  ms,
} from "./heroEntrance";

describe("entrance order", () => {
  it("runs script, words, FIESTA!, ribbon, beat, buttons in that order", () => {
    const starts = [
      ENTRANCE.script.startMs,
      ENTRANCE.words.startMs,
      ENTRANCE.fiesta.startMs,
      ENTRANCE.ribbon.startMs,
      ENTRANCE.beat.startMs,
      ENTRANCE.ctas.startMs,
    ];
    for (let n = 1; n < starts.length; n++) {
      expect(starts[n], `step ${n}`).toBeGreaterThan(starts[n - 1]);
    }
  });

  it("staggers the headline words upward and lands FIESTA! last", () => {
    for (let i = 1; i < HEADLINE_WORDS; i++) {
      expect(wordDelay(i)).toBeGreaterThan(wordDelay(i - 1));
    }
    expect(wordDelay(0)).toBe(ENTRANCE.words.startMs);
    expect(ENTRANCE.fiesta.startMs).toBeGreaterThan(wordDelay(HEADLINE_WORDS - 1));
  });

  it("starts the buttons after the last tagline phrase", () => {
    expect(ENTRANCE.ctas.startMs).toBeGreaterThan(beatDelay(2));
  });

  it("types the ribbon left to right, starting after the ribbon opens", () => {
    const total = 49;
    expect(typeDelay(0, total)).toBeGreaterThanOrEqual(ENTRANCE.ribbon.startMs);
    for (let i = 1; i < total; i++) {
      expect(typeDelay(i, total)).toBeGreaterThanOrEqual(typeDelay(i - 1, total));
    }
  });
});

describe("entrance budget", () => {
  it("finishes every step within the budget", () => {
    expect(ENTRANCE_BUDGET_MS).toBe(1600);
    for (const [name, s] of Object.entries(ENTRANCE)) {
      expect(s.startMs + s.durMs, name).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS);
    }
    expect(wordDelay(HEADLINE_WORDS - 1) + ENTRANCE.words.durMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS);
    expect(beatDelay(2) + ENTRANCE.beat.durMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS);
    expect(ENTRANCE_TOTAL_MS).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS);
  });

  it("finishes typing within the budget whatever the ribbon length", () => {
    for (const total of [1, 12, 49, 120]) {
      expect(typeDelay(total - 1, total) + TYPE_CHAR_MS, `${total} chars`).toBeLessThanOrEqual(
        ENTRANCE_BUDGET_MS,
      );
    }
  });

  it("reports the true end of the sequence", () => {
    const ends = [
      ...Object.values(ENTRANCE).map((s) => s.startMs + s.durMs),
      wordDelay(HEADLINE_WORDS - 1) + ENTRANCE.words.durMs,
      beatDelay(2) + ENTRANCE.beat.durMs,
    ];
    expect(ENTRANCE_TOTAL_MS).toBe(Math.max(...ends));
  });
});

describe("ms", () => {
  it("formats a delay as a CSS time", () => {
    expect(ms(150)).toBe("150ms");
    expect(ms(0)).toBe("0ms");
  });
});
