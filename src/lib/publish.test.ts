import { describe, it, expect } from "vitest";
import {
  ALL_CHANNELS,
  OWNED_SURFACES,
  flagsForChannels,
  hasOwnedSurface,
  validatePublish,
  emailAlreadySent,
  overallOk,
  resultEntries,
  type ChannelId,
  type PublishResults,
} from "./publish";

// Campaign fan-out (Phase 2). One publish targets any mix of destinations:
// Email plus the three owned website surfaces (hero / grid / fiestas page).
// These cover the pure logic behind independent toggles (criterion 3),
// per-channel results (criterion 4), and the email re-send guard (criterion 5).

const FULL_FLYER = { imageUrl: "/api/img/abc", caption: "México vs USA", alt: "Flyer" };

describe("channel constants", () => {
  it("owned surfaces are the three website placements", () => {
    expect(OWNED_SURFACES).toEqual(["hero", "grid", "fiestas_page"]);
  });
  it("all channels include email plus the owned surfaces", () => {
    expect(ALL_CHANNELS).toEqual(["email", "hero", "grid", "fiestas_page"]);
  });
});

describe("flagsForChannels", () => {
  it("maps each surface to its flag independently", () => {
    expect(flagsForChannels(["hero"])).toEqual({
      is_hero: true, in_grid: false, on_fiestas_page: false,
    });
    expect(flagsForChannels(["grid", "fiestas_page"])).toEqual({
      is_hero: false, in_grid: true, on_fiestas_page: true,
    });
    expect(flagsForChannels(["email"])).toEqual({
      is_hero: false, in_grid: false, on_fiestas_page: false,
    });
  });
});

describe("hasOwnedSurface", () => {
  it("is true when any website surface is selected", () => {
    expect(hasOwnedSurface(["hero"])).toBe(true);
    expect(hasOwnedSurface(["email", "grid"])).toBe(true);
  });
  it("is false for email-only or empty", () => {
    expect(hasOwnedSurface(["email"])).toBe(false);
    expect(hasOwnedSurface([])).toBe(false);
  });
});

describe("validatePublish", () => {
  it("rejects when no destination is selected", () => {
    expect(validatePublish("Subj", "msg", false, FULL_FLYER, [])).toMatch(/destination/i);
  });
  it("rejects when subject is missing", () => {
    expect(validatePublish("  ", "msg", false, FULL_FLYER, ["email"])).toMatch(/subject/i);
  });
  it("rejects email with an empty message and no image", () => {
    expect(validatePublish("Subj", "", false, FULL_FLYER, ["email"])).toMatch(/message/i);
  });
  it("allows email when the message has an image but no text", () => {
    expect(validatePublish("Subj", "", true, FULL_FLYER, ["email"])).toBeNull();
  });
  it("rejects a website surface with no flyer image", () => {
    expect(
      validatePublish("Subj", "msg", false, { caption: "c" }, ["hero"]),
    ).toMatch(/flyer|image/i);
  });
  it("rejects a website surface with an image but no caption", () => {
    expect(
      validatePublish("Subj", "msg", false, { imageUrl: "/api/img/x" }, ["grid"]),
    ).toMatch(/caption/i);
  });
  it("does NOT require a flyer for an email-only publish", () => {
    expect(validatePublish("Subj", "msg", false, {}, ["email"])).toBeNull();
  });
  it("accepts a full multi-channel publish", () => {
    expect(
      validatePublish("Subj", "msg", false, FULL_FLYER, ["email", "hero", "grid", "fiestas_page"]),
    ).toBeNull();
  });
});

describe("emailAlreadySent", () => {
  it("is true when a prior email dispatch succeeded", () => {
    expect(emailAlreadySent([{ channel: "email", status: "ok" }])).toBe(true);
  });
  it("is false when the prior email dispatch failed", () => {
    expect(emailAlreadySent([{ channel: "email", status: "failed" }])).toBe(false);
  });
  it("is false when only website surfaces were dispatched", () => {
    expect(
      emailAlreadySent([{ channel: "hero", status: "ok" }, { channel: "grid", status: "ok" }]),
    ).toBe(false);
  });
  it("is false with no prior dispatches", () => {
    expect(emailAlreadySent([])).toBe(false);
  });
});

describe("overallOk", () => {
  it("is true when every dispatched channel succeeded", () => {
    const r: PublishResults = { email: { status: "ok" }, hero: { status: "ok" } };
    expect(overallOk(r)).toBe(true);
  });
  it("is false when any channel failed (no cross-channel rollback)", () => {
    const r: PublishResults = { hero: { status: "ok" }, email: { status: "failed", detail: "bad" } };
    expect(overallOk(r)).toBe(false);
  });
  it("is false for an empty result", () => {
    expect(overallOk({})).toBe(false);
  });
});

describe("resultEntries", () => {
  it("returns entries in canonical channel order with labels and ok flags", () => {
    const r: PublishResults = {
      grid: { status: "ok" },
      email: { status: "failed", detail: "1 invalid address" },
      hero: { status: "ok" },
    };
    const entries = resultEntries(r);
    expect(entries.map((e) => e.channel)).toEqual(["email", "hero", "grid"]);
    expect(entries[0]).toEqual({
      channel: "email", label: "Email", ok: false, detail: "1 invalid address",
    });
    expect(entries[1].ok).toBe(true);
  });
  it("omits channels that were not part of the publish", () => {
    const r: PublishResults = { hero: { status: "ok" } };
    const chans = resultEntries(r).map((e) => e.channel as ChannelId);
    expect(chans).toEqual(["hero"]);
  });
});
