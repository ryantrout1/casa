import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { CLOSURES, bannerLines, closedOn, noticeFor, type Closure } from "./closures";
import { buildSpecialsView } from "./specialsView";
import { SPECIALS } from "./specials";
import { phoenixToday } from "./websiteNow";

const TG = CLOSURES.find((c) => c.id === "thanksgiving-2026")!;

describe("Thanksgiving 2026", () => {
  it("closes Thursday Nov 26 and Friday Nov 27 only", () => {
    expect(closedOn("2026-11-25")).toBeNull();
    expect(closedOn("2026-11-26")?.id).toBe(TG.id);
    expect(closedOn("2026-11-27")?.id).toBe(TG.id);
    expect(closedOn("2026-11-28")).toBeNull();
  });

  it("is announced from Nov 19 through Nov 27, and gone Saturday", () => {
    expect(noticeFor("2026-11-18")).toBeNull();
    for (const d of ["2026-11-19", "2026-11-24", "2026-11-26", "2026-11-27"]) {
      expect(noticeFor(d)?.id, d).toBe(TG.id);
    }
    expect(noticeFor("2026-11-28")).toBeNull();
  });

  it("uses Phoenix dates: 11 PM Wednesday in Phoenix is not yet closed", () => {
    // 2026-11-26T06:30Z is Wed Nov 25, 11:30 PM in Phoenix.
    expect(closedOn(phoenixToday(Date.parse("2026-11-26T06:30:00Z")))).toBeNull();
    // 2026-11-26T07:30Z is Thu Nov 26, 12:30 AM in Phoenix.
    expect(closedOn(phoenixToday(Date.parse("2026-11-26T07:30:00Z")))?.id).toBe(TG.id);
  });

  it("has its graphic in public", () => {
    const rel = (TG.art?.src ?? "").replace(/^\//, "");
    expect(existsSync(join(process.cwd(), "public", rel))).toBe(true);
    expect(TG.art?.alt).toMatch(/November 26/);
  });
});

describe("bannerLines", () => {
  it("names the days before the closure and says 'today' during it", () => {
    expect(bannerLines(TG, "2026-11-24").lead).toBe(
      "Closed for Thanksgiving: Thursday & Friday, Nov 26 & 27.",
    );
    expect(bannerLines(TG, "2026-11-26").lead).toBe("Closed today for Thanksgiving.");
    expect(bannerLines(TG, "2026-11-27").reopen).toBe("Back Saturday at 10 AM for brunch.");
  });
});

describe("closure data", () => {
  it("every closure has ascending dates on or after its announce date", () => {
    for (const c of CLOSURES) {
      expect(c.dates.length, c.id).toBeGreaterThan(0);
      expect([...c.dates].sort(), c.id).toEqual(c.dates);
      expect(c.announceFrom <= c.dates[0], c.id).toBe(true);
      for (const d of c.dates) expect(d, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("ids are unique", () => {
    expect(new Set(CLOSURES.map((c) => c.id)).size).toBe(CLOSURES.length);
  });
});

describe("noticeFor with overlapping notices", () => {
  const a: Closure = { ...TG, id: "a", dates: ["2026-12-24", "2026-12-25"], announceFrom: "2026-12-17" };
  const b: Closure = { ...TG, id: "b", dates: ["2026-12-31", "2027-01-01"], announceFrom: "2026-12-20" };

  it("announces the one that starts first, then the next", () => {
    expect(noticeFor("2026-12-21", [b, a])?.id).toBe("a");
    expect(noticeFor("2026-12-26", [b, a])?.id).toBe("b");
    expect(noticeFor("2027-01-02", [b, a])).toBeNull();
  });
});

describe("buildSpecialsView on a holiday", () => {
  it("shows the closure instead of Enchilada Thursday, with the whole week in the rail", () => {
    const view = buildSpecialsView(4, TG);
    expect(view.featured).toBeNull();
    expect(view.closed?.title).toBe("Closed for Thanksgiving");
    expect(view.closed?.tag).toBe("Today");
    expect(view.closed?.blurb).toBe(TG.reopen);
    expect(view.closed?.art?.src).toBe(TG.art?.src);
    expect(view.rail.map((r) => r.id)).toEqual(SPECIALS.map((s) => s.id));
  });

  it("leaves open days and Mondays exactly as before when there is no holiday", () => {
    expect(buildSpecialsView(4).featured?.id).toBe("enchilada");
    expect(buildSpecialsView(4).closed).toBeNull();
    expect(buildSpecialsView(1).closed).toEqual({
      day: "Cerrado",
      tag: "Monday",
      title: "Closed Mondays",
      titleSize: "l",
      blurb: "See you Tuesday at 4 PM for Taco Tuesday!",
    });
  });
});
