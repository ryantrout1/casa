import { describe, it, expect } from "vitest";
import {
  CARD_SIZE,
  rewardForVisit,
  nextProgress,
  nextRewardLine,
  milestoneSlugAt,
  punchCells,
  oneAwayValues,
  rewardLabel,
  rewardLabelDetailed,
  nextRewardLabel,
  isBirthdayWeek,
  BIRTHDAY_REWARD,
  rewardQueueLabel,
  humanizeRewardType,
  daysWaiting,
  isAgedWaiting,
  AGED_WAITING_DAYS,
  daysSince,
  lapseTier,
  LAPSING_DAYS,
  LAPSED_DAYS,
} from "./rewards";

// Casa Familia Rewards ladder (Phase 2): agua fresca at the 3rd visit, dessert
// at the 5th, appetizer at the 10th, then the card resets and repeats. The
// lifetime visit count (never reset) is a DB concern, verified at runtime.

describe("CARD_SIZE", () => {
  it("is a 10-visit card", () => {
    expect(CARD_SIZE).toBe(10);
  });
});

describe("rewardForVisit", () => {
  it("grants nothing on visits 1-2", () => {
    for (const p of [1, 2]) expect(rewardForVisit(p)).toBeNull();
  });
  it("grants the agua fresca on the 3rd visit", () => {
    expect(rewardForVisit(3)).toBe("punch_agua");
  });
  it("grants nothing on the 4th visit", () => {
    expect(rewardForVisit(4)).toBeNull();
  });
  it("grants the dessert on the 5th visit", () => {
    expect(rewardForVisit(5)).toBe("punch_dessert");
  });
  it("grants nothing on visits 6-9", () => {
    for (const p of [6, 7, 8, 9]) expect(rewardForVisit(p)).toBeNull();
  });
  it("grants the appetizer at the 10th visit (and beyond, defensively)", () => {
    expect(rewardForVisit(10)).toBe("punch_appetizer");
    expect(rewardForVisit(11)).toBe("punch_appetizer");
  });
});

describe("nextProgress", () => {
  it("keeps progress mid-card", () => {
    for (const p of [0, 1, 3, 5, 9]) expect(nextProgress(p)).toBe(p);
  });
  it("resets to 0 once the card is complete (card repeats)", () => {
    expect(nextProgress(10)).toBe(0);
    expect(nextProgress(11)).toBe(0);
  });
});

describe("nextRewardLine", () => {
  it("counts down to the agua fresca before visit 3", () => {
    expect(nextRewardLine(0)).toBe("3 more visits 'til a free agua fresca 🥤");
    expect(nextRewardLine(2)).toBe("1 more visit 'til a free agua fresca 🥤");
  });
  it("counts down to the dessert between visits 3 and 5", () => {
    expect(nextRewardLine(3)).toBe("2 more visits 'til a free dessert 🍰");
    expect(nextRewardLine(4)).toBe("1 more visit 'til a free dessert 🍰");
  });
  it("counts down to the appetizer from visit 5 onward", () => {
    expect(nextRewardLine(5)).toBe("5 more visits 'til a free appetizer 🌮");
    expect(nextRewardLine(9)).toBe("1 more visit 'til a free appetizer 🌮");
  });
  it("is empty once the card is complete", () => {
    expect(nextRewardLine(10)).toBe("");
  });
});

describe("milestoneSlugAt", () => {
  it("marks the agua, dessert and appetizer positions", () => {
    expect(milestoneSlugAt(3)).toBe("agua");
    expect(milestoneSlugAt(5)).toBe("dessert");
    expect(milestoneSlugAt(10)).toBe("appetizer");
  });
  it("is empty for plain punches", () => {
    for (const n of [1, 2, 4, 6, 7, 8, 9]) expect(milestoneSlugAt(n)).toBe("");
  });
});

describe("punchCells", () => {
  const cells = punchCells();
  it("has one cell per card slot", () => {
    expect(cells).toHaveLength(10);
  });
  it("marks 3 agua, 5 dessert, 10 appetizer", () => {
    expect(cells[2]).toEqual({ n: 3, reward: "agua" });
    expect(cells[4]).toEqual({ n: 5, reward: "dessert" });
    expect(cells[9]).toEqual({ n: 10, reward: "appetizer" });
  });
  it("leaves plain punches without a reward", () => {
    expect(cells[0]).toEqual({ n: 1 });
  });
});

describe("oneAwayValues", () => {
  it("is one short of each milestone", () => {
    expect(oneAwayValues()).toEqual([2, 4, 9]);
  });
});

describe("labels", () => {
  it("canonical labels", () => {
    expect(rewardLabel("welcome_chips_queso")).toBe("Free chips & queso");
    expect(rewardLabel("punch_agua")).toBe("Free agua fresca");
    expect(rewardLabel("punch_dessert")).toBe("Free dessert");
    expect(rewardLabel("punch_appetizer")).toBe("Free appetizer");
  });
  it("keeps legacy labels rendering for any old rows", () => {
    expect(rewardLabel("punch_entree")).toBe("Free entrée");
    expect(rewardLabel("birthday_entree")).toBe("Birthday entrée");
  });
  it("falls back to the raw type for unknown values", () => {
    expect(rewardLabel("mystery")).toBe("mystery");
  });
  it("detailed labels carry milestone context", () => {
    expect(rewardLabelDetailed("welcome_chips_queso")).toBe("Chips & queso (welcome)");
    expect(rewardLabelDetailed("punch_agua")).toBe("Free agua fresca (3 visits)");
    expect(rewardLabelDetailed("punch_dessert")).toBe("Free dessert (5 visits)");
    expect(rewardLabelDetailed("punch_appetizer")).toBe("Free appetizer (10 visits)");
  });
  it("nextRewardLabel names the upcoming reward", () => {
    expect(nextRewardLabel(2)).toBe("Free agua fresca");
    expect(nextRewardLabel(4)).toBe("Free dessert");
    expect(nextRewardLabel(9)).toBe("Free appetizer");
  });
});

describe("isBirthdayWeek", () => {
  // Helper: a UTC noon Date for a Phoenix calendar day (Phoenix is UTC-7).
  const day = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m - 1, d, 19, 0, 0)); // 19:00Z = 12:00 Phoenix same day

  it("is true on the birthday itself", () => {
    expect(isBirthdayWeek(6, 15, day(2026, 6, 15))).toBe(true);
  });
  it("is false well outside the birthday week", () => {
    expect(isBirthdayWeek(6, 15, day(2026, 6, 25))).toBe(false); // +10 days
    expect(isBirthdayWeek(6, 15, day(2026, 6, 5))).toBe(false); // -10 days
  });
  it("handles Feb 29 birthdays in a non-leap year (treated as Feb 28)", () => {
    expect(isBirthdayWeek(2, 29, day(2025, 2, 28))).toBe(true);
    expect(isBirthdayWeek(2, 29, day(2025, 3, 20))).toBe(false);
  });
  it("is false when no birthday is on file", () => {
    expect(isBirthdayWeek(null, null, day(2026, 6, 15))).toBe(false);
    expect(isBirthdayWeek(6, null, day(2026, 6, 15))).toBe(false);
  });
});

describe("BIRTHDAY_REWARD", () => {
  it("is the birthday treat type with a guest-choice label", () => {
    expect(BIRTHDAY_REWARD).toBe("birthday_treat");
    expect(rewardLabel(BIRTHDAY_REWARD)).toBe("Birthday reward");
  });
});

// ── Redeem-queue helpers (admin) ──────────────────────────────────────────
// Phase 1 of the rewards-queue enrichment: milestone-context labels with a
// safe fallback, and Phoenix-pinned "days waiting" so aging is read by the
// restaurant's calendar day, not UTC.

describe("humanizeRewardType", () => {
  it("turns a snake_case type into Title Case words", () => {
    expect(humanizeRewardType("some_new_reward")).toBe("Some New Reward");
  });
  it("handles a single token", () => {
    expect(humanizeRewardType("mystery")).toBe("Mystery");
  });
});

describe("rewardQueueLabel", () => {
  it("uses the detailed milestone label for known types", () => {
    expect(rewardQueueLabel("welcome_chips_queso")).toBe("Chips & queso (welcome)");
    expect(rewardQueueLabel("punch_dessert")).toBe("Free dessert (5 visits)");
    expect(rewardQueueLabel("punch_appetizer")).toBe("Free appetizer (10 visits)");
  });
  it("humanizes an unmapped type instead of leaking raw snake_case", () => {
    expect(rewardQueueLabel("punch_mystery")).toBe("Punch Mystery");
  });
});

describe("daysWaiting", () => {
  it("counts whole days by Phoenix calendar day", () => {
    // Earned 2026-07-05T06:30Z = 2026-07-04 23:30 Phoenix (Jul 4 there).
    // Ref    2026-07-07T12:00Z = 2026-07-07 05:00 Phoenix (Jul 7 there).
    const earned = "2026-07-05T06:30:00.000Z";
    const ref = new Date("2026-07-07T12:00:00.000Z");
    // Phoenix day count is 3; a naive UTC count would say 2.
    expect(daysWaiting(earned, ref)).toBe(3);
  });
  it("is zero for a reward earned today", () => {
    const ref = new Date("2026-07-07T18:00:00.000Z");
    expect(daysWaiting("2026-07-07T16:00:00.000Z", ref)).toBe(0);
  });
  it("never goes negative", () => {
    const ref = new Date("2026-07-01T00:00:00.000Z");
    expect(daysWaiting("2026-07-05T00:00:00.000Z", ref)).toBe(0);
  });
});

describe("isAgedWaiting", () => {
  it("flags rewards waiting more than the aged threshold", () => {
    const ref = new Date("2026-07-07T12:00:00.000Z");
    expect(isAgedWaiting("2026-06-24T12:00:00.000Z", ref)).toBe(true); // 13 days
  });
  it("does not flag recent rewards", () => {
    const ref = new Date("2026-07-07T12:00:00.000Z");
    expect(isAgedWaiting("2026-07-05T12:00:00.000Z", ref)).toBe(false); // 2 days
  });
  it("uses a 7-day threshold", () => {
    expect(AGED_WAITING_DAYS).toBe(7);
  });
});

// ── Last-visit recency (members page grooming) ─────────────────────────────
// daysSince is the general Phoenix-day gap; lapseTier buckets it for the
// members roster: recent (<=30d), lapsing (31-60d), lapsed (>60d).

describe("daysSince", () => {
  it("counts whole days by Phoenix calendar day", () => {
    // 2026-07-05T06:30Z = 2026-07-04 23:30 Phoenix; ref 2026-07-07 05:00 Phoenix.
    expect(daysSince("2026-07-05T06:30:00.000Z", new Date("2026-07-07T12:00:00.000Z"))).toBe(3);
  });
  it("agrees with daysWaiting (same underlying gap)", () => {
    const ref = new Date("2026-07-07T12:00:00.000Z");
    expect(daysSince("2026-06-24T12:00:00.000Z", ref)).toBe(daysWaiting("2026-06-24T12:00:00.000Z", ref));
  });
});

describe("lapseTier", () => {
  const ref = new Date("2026-07-07T12:00:00.000Z");
  const daysAgo = (n: number) => new Date(ref.getTime() - n * 86_400_000).toISOString();
  it("returns null for a member who has never visited", () => {
    expect(lapseTier(null, ref)).toBeNull();
  });
  it("is recent up to and including 30 days", () => {
    expect(lapseTier(daysAgo(2), ref)).toBe("recent");
    expect(lapseTier(daysAgo(30), ref)).toBe("recent");
  });
  it("is lapsing from 31 through 60 days", () => {
    expect(lapseTier(daysAgo(31), ref)).toBe("lapsing");
    expect(lapseTier(daysAgo(60), ref)).toBe("lapsing");
  });
  it("is lapsed past 60 days", () => {
    expect(lapseTier(daysAgo(61), ref)).toBe("lapsed");
    expect(lapseTier(daysAgo(150), ref)).toBe("lapsed");
  });
  it("uses 30/60 thresholds", () => {
    expect(LAPSING_DAYS).toBe(30);
    expect(LAPSED_DAYS).toBe(60);
  });
});
