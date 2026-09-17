import { describe, it, expect } from "vitest";
import { CARD_SIZE } from "./rewards";
import { REWARDS_TOKEN } from "./emailTemplate";
import { applyRewards, rewardsLine } from "./rewardsLine";

// The one personalized line in a campaign email. 133 of 285 members have no
// punches, so "you have 0 punches" is the case that matters most.

describe("rewardsLine", () => {
  it("nudges a member who has not started", () => {
    expect(rewardsLine(0)).toBe(
      "Not started your card yet? Scan at the register on your visit — your first reward is 3 visits away. 🥤",
    );
    expect(rewardsLine(null)).toBe(rewardsLine(0));
  });

  it("counts down to the next reward", () => {
    expect(rewardsLine(1)).toBe("You're 2 visits from a free agua fresca. 🥤");
    expect(rewardsLine(2)).toBe("You're 1 visit from a free agua fresca. 🥤");
    expect(rewardsLine(3)).toBe("You're 2 visits from a free dessert. 🍰");
    expect(rewardsLine(4)).toBe("You're 1 visit from a free dessert. 🍰");
    expect(rewardsLine(9)).toBe("You're 1 visit from a free appetizer. 🌮");
  });

  it("tells a full card it has something waiting", () => {
    expect(rewardsLine(CARD_SIZE)).toBe("You have a free appetizer waiting. Just ask your server. 🌮");
    expect(rewardsLine(99)).toBe(rewardsLine(CARD_SIZE));
  });

  it("treats a junk value as not started rather than printing nonsense", () => {
    expect(rewardsLine(-4)).toBe(rewardsLine(0));
    expect(rewardsLine(2.5)).toBe(rewardsLine(2));
  });
});

describe("applyRewards", () => {
  const html = `<p>Hi</p><p>${REWARDS_TOKEN}</p><p>Casa</p>`;

  it("puts the member's line in place of the token", () => {
    expect(applyRewards(html, 1)).toContain("You're 2 visits from a free agua fresca");
    expect(applyRewards(html, 1)).not.toContain(REWARDS_TOKEN);
  });

  it("removes the token when the line is switched off", () => {
    const out = applyRewards(html, 1, false);
    expect(out).not.toContain(REWARDS_TOKEN);
    expect(out).not.toContain("agua fresca");
    expect(out).toContain("Hi");
  });

  it("leaves a body with no token untouched", () => {
    const plain = "<p>Just a note</p>";
    expect(applyRewards(plain, 4)).toBe(plain);
  });

  it("replaces every copy, so a duplicated token cannot ship visible", () => {
    const twice = `${REWARDS_TOKEN} and ${REWARDS_TOKEN}`;
    expect(applyRewards(twice, 0)).not.toContain(REWARDS_TOKEN);
  });

  it("escapes nothing it does not need to and stays plain text", () => {
    expect(applyRewards(html, 10)).toContain("free appetizer waiting");
  });
});
