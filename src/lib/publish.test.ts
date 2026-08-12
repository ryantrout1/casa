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
  liveSurfaces,
  type ChannelId,
  type PublishResults,
  type SurfaceFlags,
  heroColumns,
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

describe("liveSurfaces", () => {
  const flags = (h: boolean, g: boolean, p: boolean): SurfaceFlags => ({
    is_hero: h,
    in_grid: g,
    on_fiestas_page: p,
  });
  it("lists every owned surface a fiesta is currently on, in canonical order", () => {
    expect(liveSurfaces(flags(true, true, true))).toEqual(["hero", "grid", "fiestas_page"]);
  });
  it("returns only the surfaces whose flag is set", () => {
    expect(liveSurfaces(flags(false, true, true))).toEqual(["grid", "fiestas_page"]);
    expect(liveSurfaces(flags(true, false, false))).toEqual(["hero"]);
  });
  it("returns an empty list when the fiesta is live nowhere", () => {
    expect(liveSurfaces(flags(false, false, false))).toEqual([]);
  });
});

// Hero copy is optional by design: publishing to the hero surface without it
// must still succeed, and the homepage falls back to the evergreen hero. A
// blocking rule here would break every draft saved before the field existed.
describe("validatePublish — hero copy stays optional", () => {
  it("allows a hero publish with no hero copy at all", () => {
    expect(validatePublish("Subj", "msg", false, FULL_FLYER, ["hero"])).toBeNull();
  });

  it("allows a hero publish with partial hero copy", () => {
    const flyer = { ...FULL_FLYER, hero: { title: "EL PALOMAZO" } };
    expect(validatePublish("Subj", "msg", false, flyer, ["hero"])).toBeNull();
  });

  it("still requires the flyer image and caption for owned surfaces", () => {
    const noCaption = { ...FULL_FLYER, caption: "", hero: { title: "X" } };
    expect(validatePublish("Subj", "msg", false, noCaption, ["hero"])).toMatch(/caption/i);
  });
});

// --- Phase 3: the fiesta insert contract ------------------------------------
// heroColumns is the single place that decides what lands in each hero column.
// Both publish paths bind its output, so they cannot drift apart.

describe("heroColumns", () => {
  it("returns all-null defaults (plus lang 'en') for no hero copy", () => {
    expect(heroColumns(undefined)).toEqual({
      starts_at: null,
      hero_title: null,
      hero_script: null,
      hero_ribbon: null,
      hero_sub: null,
      hero_lang: "en",
      hero_focus: null,
      hero_live_at: null,
      hero_bg: null,
      hero_accent: null,
      hero_ink: null,
    });
  });

  it("is identical for an empty object and for undefined", () => {
    expect(heroColumns({})).toEqual(heroColumns(undefined));
  });

  it("binds every Phase 2 field", () => {
    const cols = heroColumns({
      startsAt: "2026-08-30T03:00:00Z",
      title: "EL PALOMAZO",
      script: "en Casa",
      ribbon: "KARAOKE",
      sub: "424 E Monroe Ave",
      lang: "es",
      focus: 38,
      liveAt: "2026-08-25T07:00:00Z",
      bg: "#1a1008",
      accent: "#ffbf1f",
      ink: "#f7ecd4",
    });
    expect(cols.hero_focus).toBe(38);
    expect(cols.hero_live_at).toBe("2026-08-25T07:00:00Z");
    expect(cols.hero_bg).toBe("#1a1008");
    expect(cols.hero_accent).toBe("#ffbf1f");
    expect(cols.hero_ink).toBe("#f7ecd4");
    expect(cols.hero_lang).toBe("es");
  });

  it("keeps focus 0 rather than collapsing it to null", () => {
    expect(heroColumns({ focus: 0 }).hero_focus).toBe(0);
  });

  it("never emits undefined — every value is bindable by the driver", () => {
    for (const v of Object.values(heroColumns({ title: "X" }))) {
      expect(v).not.toBeUndefined();
    }
  });
});
