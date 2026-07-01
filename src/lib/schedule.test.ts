import { describe, it, expect } from "vitest";
import { parseDraftConfig, isDraftEmpty, type DraftConfig } from "./schedule";

// Drafts store their intended destinations + flyer as a JSON blob (publish_config).
// parseDraftConfig turns whatever comes back from the DB into a safe, typed shape;
// isDraftEmpty decides whether there's anything worth saving.

describe("parseDraftConfig", () => {
  it("returns empty defaults for null / undefined / junk", () => {
    const empty: DraftConfig = { channels: [], flyer: {} };
    expect(parseDraftConfig(null)).toEqual(empty);
    expect(parseDraftConfig(undefined)).toEqual(empty);
    expect(parseDraftConfig("nonsense")).toEqual(empty);
    expect(parseDraftConfig(42)).toEqual(empty);
  });

  it("keeps only valid channels, in the given order", () => {
    const cfg = parseDraftConfig({ channels: ["email", "grid", "bogus", "hero"], flyer: {} });
    expect(cfg.channels).toEqual(["email", "grid", "hero"]);
  });

  it("passes through flyer fields as strings and drops the rest", () => {
    const cfg = parseDraftConfig({
      channels: ["hero"],
      flyer: { imageUrl: "/api/img/x", caption: "Cap", alt: "Alt", eventDate: "2026-07-04", extra: 9 },
    });
    expect(cfg.flyer).toEqual({
      imageUrl: "/api/img/x",
      caption: "Cap",
      alt: "Alt",
      eventDate: "2026-07-04",
    });
  });

  it("tolerates a missing flyer or missing channels", () => {
    expect(parseDraftConfig({ channels: ["email"] })).toEqual({ channels: ["email"], flyer: {} });
    expect(parseDraftConfig({ flyer: { caption: "hi" } })).toEqual({
      channels: [],
      flyer: { caption: "hi" },
    });
  });

  it("coerces a non-array channels field to empty", () => {
    expect(parseDraftConfig({ channels: "email", flyer: {} }).channels).toEqual([]);
  });
});

describe("isDraftEmpty", () => {
  const noFlyer = {};
  it("is true only when subject, message, image, and flyer are all empty", () => {
    expect(isDraftEmpty("", "", false, noFlyer)).toBe(true);
    expect(isDraftEmpty("   ", "   ", false, noFlyer)).toBe(true);
  });
  it("is false when a subject is present", () => {
    expect(isDraftEmpty("Taco night", "", false, noFlyer)).toBe(false);
  });
  it("is false when the message has text", () => {
    expect(isDraftEmpty("", "come by tonight", false, noFlyer)).toBe(false);
  });
  it("is false when the message has an image", () => {
    expect(isDraftEmpty("", "", true, noFlyer)).toBe(false);
  });
  it("is false when a flyer image is attached", () => {
    expect(isDraftEmpty("", "", false, { imageUrl: "/api/img/x" })).toBe(false);
  });
});
