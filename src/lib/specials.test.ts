import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { SPECIALS, phoenixWeekday, specialForDay } from "./specials";

describe("phoenixWeekday", () => {
  it("maps a UTC instant to the Phoenix calendar weekday", () => {
    // 2026-07-19T18:00Z is Sunday 11:00 in Phoenix -> Sunday (0)
    expect(phoenixWeekday(new Date("2026-07-19T18:00:00Z"))).toBe(0);
  });

  it("flips at Phoenix midnight, not UTC midnight", () => {
    // 2026-07-19T06:00Z is still Sat 23:00 in Phoenix -> Saturday (6)
    expect(phoenixWeekday(new Date("2026-07-19T06:00:00Z"))).toBe(6);
  });
});

describe("specialForDay", () => {
  it("features the right special for each open day", () => {
    expect(specialForDay(2)?.id).toBe("taco"); // Tue
    expect(specialForDay(3)?.id).toBe("fajita"); // Wed
    expect(specialForDay(4)?.id).toBe("enchilada"); // Thu
    expect(specialForDay(5)?.id).toBe("seafood"); // Fri
    expect(specialForDay(6)?.id).toBe("molcajete"); // Sat
    expect(specialForDay(0)?.id).toBe("molcajete"); // Sun
  });

  it("returns null on Monday (closed)", () => {
    expect(specialForDay(1)).toBeNull();
  });
});

describe("SPECIALS data", () => {
  it("has five distinct day-specials", () => {
    expect(SPECIALS).toHaveLength(5);
    expect(new Set(SPECIALS.map((s) => s.id)).size).toBe(5);
  });

  it("covers every open weekday exactly once and never Monday", () => {
    for (const d of [0, 2, 3, 4, 5, 6]) {
      expect(SPECIALS.filter((s) => s.days.includes(d))).toHaveLength(1);
    }
    expect(SPECIALS.some((s) => s.days.includes(1))).toBe(false);
  });
});

describe("specials photos", () => {
  it("every special has a photo path", () => {
    for (const s of SPECIALS) {
      expect(s.photo, s.id).toBeTruthy();
    }
  });

  it("every photo file exists in public", () => {
    for (const s of SPECIALS) {
      const rel = (s.photo ?? "").replace(/^\//, "");
      const p = join(process.cwd(), "public", rel);
      expect(existsSync(p), `${s.id}: ${s.photo}`).toBe(true);
    }
  });
});

describe("specials includes", () => {
  it("every special lists 1 to 3 non-empty includes", () => {
    for (const s of SPECIALS) {
      expect(s.includes.length, s.id).toBeGreaterThanOrEqual(1);
      expect(s.includes.length, s.id).toBeLessThanOrEqual(3);
      for (const item of s.includes) expect(item.trim(), s.id).not.toBe("");
    }
  });
});

describe("specials pairings", () => {
  it("every pairing has copy, alt text, and a photo that exists in public", () => {
    for (const s of SPECIALS) {
      if (!s.pair) continue;
      expect(s.pair.text.trim(), s.id).not.toBe("");
      expect(s.pair.alt.trim(), s.id).not.toBe("");
      const p = join(process.cwd(), "public", s.pair.photo.replace(/^\//, ""));
      expect(existsSync(p), `${s.id}: ${s.pair.photo}`).toBe(true);
    }
  });

  it("Taco Tuesday pairs with the $5 margarita", () => {
    const taco = SPECIALS.find((s) => s.id === "taco");
    expect(taco?.pair?.text).toBe("Add a margarita for only $5");
  });
});
