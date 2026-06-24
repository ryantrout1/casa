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
} from "./rewards";

// Phase 1 is a behavior-preserving refactor. These tests pin the program
// exactly as it ran before the lib existed: dessert at the 5th visit, entrée
// at the 10th, card resets after 10. If a later phase changes the ladder,
// these expectations change with it — intentionally.

describe("CARD_SIZE", () => {
  it("is a 10-visit card", () => {
    expect(CARD_SIZE).toBe(10);
  });
});

describe("rewardForVisit", () => {
  it("grants nothing on visits 1-4", () => {
    for (const p of [1, 2, 3, 4]) expect(rewardForVisit(p)).toBeNull();
  });
  it("grants the dessert on the 5th visit", () => {
    expect(rewardForVisit(5)).toBe("punch_dessert");
  });
  it("grants nothing on visits 6-9", () => {
    for (const p of [6, 7, 8, 9]) expect(rewardForVisit(p)).toBeNull();
  });
  it("grants the entrée at the 10th visit (and beyond, defensively)", () => {
    expect(rewardForVisit(10)).toBe("punch_entree");
    expect(rewardForVisit(11)).toBe("punch_entree");
  });
});

describe("nextProgress", () => {
  it("keeps progress mid-card", () => {
    for (const p of [0, 1, 5, 9]) expect(nextProgress(p)).toBe(p);
  });
  it("resets to 0 once the card is complete", () => {
    expect(nextProgress(10)).toBe(0);
    expect(nextProgress(11)).toBe(0);
  });
});

describe("nextRewardLine", () => {
  it("counts down to the dessert before visit 5", () => {
    expect(nextRewardLine(0)).toBe("5 more visits 'til a free dessert 🍰");
    expect(nextRewardLine(4)).toBe("1 more visit 'til a free dessert 🍰");
  });
  it("counts down to the entrée from visit 5 onward", () => {
    expect(nextRewardLine(5)).toBe("5 more visits 'til a free entrée 🌮");
    expect(nextRewardLine(9)).toBe("1 more visit 'til a free entrée 🌮");
  });
  it("is empty once the card is complete", () => {
    expect(nextRewardLine(10)).toBe("");
  });
});

describe("milestoneSlugAt", () => {
  it("marks the dessert and entrée positions", () => {
    expect(milestoneSlugAt(5)).toBe("dessert");
    expect(milestoneSlugAt(10)).toBe("entree");
  });
  it("is empty for plain punches", () => {
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9]) expect(milestoneSlugAt(n)).toBe("");
  });
});

describe("punchCells", () => {
  const cells = punchCells();
  it("has one cell per card slot", () => {
    expect(cells).toHaveLength(10);
  });
  it("marks 5 as dessert and 10 as entrée", () => {
    expect(cells[4]).toEqual({ n: 5, reward: "dessert" });
    expect(cells[9]).toEqual({ n: 10, reward: "entree" });
  });
  it("leaves plain punches without a reward", () => {
    expect(cells[0]).toEqual({ n: 1 });
  });
});

describe("oneAwayValues", () => {
  it("is one short of each milestone", () => {
    expect(oneAwayValues()).toEqual([4, 9]);
  });
});

describe("labels", () => {
  it("canonical labels", () => {
    expect(rewardLabel("welcome_chips_queso")).toBe("Free chips & queso");
    expect(rewardLabel("punch_dessert")).toBe("Free dessert");
    expect(rewardLabel("punch_entree")).toBe("Free entrée");
    expect(rewardLabel("birthday_entree")).toBe("Birthday entrée");
  });
  it("falls back to the raw type for unknown values", () => {
    expect(rewardLabel("mystery")).toBe("mystery");
  });
  it("detailed labels carry milestone context", () => {
    expect(rewardLabelDetailed("welcome_chips_queso")).toBe("Chips & queso (welcome)");
    expect(rewardLabelDetailed("punch_dessert")).toBe("Free dessert (5 visits)");
    expect(rewardLabelDetailed("punch_entree")).toBe("Free entrée (10 visits)");
  });
  it("nextRewardLabel names the upcoming reward", () => {
    expect(nextRewardLabel(4)).toBe("Free dessert");
    expect(nextRewardLabel(9)).toBe("Free entrée");
  });
});
