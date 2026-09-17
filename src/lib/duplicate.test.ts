import { describe, it, expect } from "vitest";
import { parseDraftConfig } from "./schedule";
import { duplicateConfig, duplicateSubject } from "./duplicate";

// "Duplicate for next event" copies a campaign into a fresh draft. Everything
// that belongs to THIS event's calendar is stripped, because the whole point
// is to run it again on a different date; everything else carries over.

const CONFIG = {
  channels: ["email", "hero", "grid"],
  flyer: {
    imageUrl: "/api/img/72dcee08-9888-409c-a4eb-d0cd7e1b1b68",
    caption: "Del Rancho al Honky Tonk",
    alt: "Poster with a microphone",
    eventDate: "2026-09-19",
    hero: {
      title: "DEL RANCHO AL HONKY TONK",
      script: "Karaoke Night",
      lang: "en" as const,
      startsAt: "2026-09-20T03:00:00Z",
      liveAt: "2026-09-16T03:06:00Z",
      plateUrl: "/api/img/8d61f545-473b-4946-8ec3-3f70bbfbd1e7",
      plateFocus: 40,
    },
  },
};

describe("duplicateConfig", () => {
  it("keeps the channels, flyer and hero copy", () => {
    const d = duplicateConfig(CONFIG);
    expect(d.channels).toEqual(["email", "hero", "grid"]);
    expect(d.flyer.imageUrl).toBe(CONFIG.flyer.imageUrl);
    expect(d.flyer.caption).toBe("Del Rancho al Honky Tonk");
    expect(d.flyer.hero?.title).toBe("DEL RANCHO AL HONKY TONK");
    expect(d.flyer.hero?.plateUrl).toBe(CONFIG.flyer.hero.plateUrl);
    expect(d.flyer.hero?.plateFocus).toBe(40);
  });

  it("strips every date, so the copy cannot publish last month's event", () => {
    const d = duplicateConfig(CONFIG);
    expect(d.flyer.eventDate).toBeUndefined();
    expect(d.flyer.hero?.startsAt).toBeUndefined();
    expect(d.flyer.hero?.liveAt).toBeUndefined();
  });

  it("survives the round trip the publish paths use", () => {
    const d = duplicateConfig(CONFIG);
    expect(parseDraftConfig(d)).toEqual(d);
  });

  it("is total on junk", () => {
    expect(duplicateConfig(null)).toEqual({ channels: [], flyer: {} });
    expect(duplicateConfig("nope")).toEqual({ channels: [], flyer: {} });
  });
});

describe("duplicateSubject", () => {
  it("marks the copy", () => {
    expect(duplicateSubject("Lotería Night")).toBe("Lotería Night (copy)");
  });
  it("does not stack copies", () => {
    expect(duplicateSubject("Lotería Night (copy)")).toBe("Lotería Night (copy)");
  });
  it("handles an empty subject", () => {
    expect(duplicateSubject("")).toBe("(copy)");
    expect(duplicateSubject("   ")).toBe("(copy)");
  });
});
