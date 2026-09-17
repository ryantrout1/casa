import { describe, it, expect } from "vitest";
import {
  CASA_FACTS,
  REWARDS_TOKEN,
  buildAnnouncement,
  buildReminder,
  type EmailDraft,
} from "./emailTemplate";

// Every campaign email is built here, from fields plus facts this file owns.
// The facts are owned rather than typed because a wrong phone number already
// went out once.

const FLYER = "/api/img/72dcee08-9888-409c-a4eb-d0cd7e1b1b68";

const draft: EmailDraft = {
  subject: "Del Rancho al Honky Tonk: Karaoke Night this Saturday!",
  greeting: "Saca las botas, amigos!",
  intro: "This Saturday we are turning up the volume: norteño, banda and country classics side by side.",
  facts: ["Saturday, September 19", "8 PM to midnight"],
  highlights: ["🎤 Karaoke: grab the mic and own it", "💃 Dancing: bring a partner"],
  close: "Warm up that voice and bring someone to dance with.",
};

const ctx = { flyerUrl: FLYER, flyerAlt: "Honky Tonk flyer", includeRewards: true };

describe("CASA_FACTS", () => {
  it("carries the one correct phone number and address", () => {
    expect(CASA_FACTS.phone).toBe("623-306-2386");
    expect(CASA_FACTS.phoneHref).toBe("tel:6233062386");
    expect(CASA_FACTS.address).toBe("424 E Monroe Ave, Buckeye, AZ 85326");
    expect(CASA_FACTS.site).toBe("https://www.casadeleyva.com");
    expect(CASA_FACTS.menu).toBe("https://www.casadeleyva.com/menu");
    expect(CASA_FACTS.map).toContain("424+E+Monroe+Ave");
  });
});

describe("buildAnnouncement", () => {
  const html = buildAnnouncement(draft, ctx);

  it("leads with the greeting, then the flyer, then the setup", () => {
    const g = html.indexOf("Saca las botas");
    const f = html.indexOf(FLYER);
    const i = html.indexOf("turning up the volume");
    expect(g).toBeGreaterThanOrEqual(0);
    expect(f).toBeGreaterThan(g);
    expect(i).toBeGreaterThan(f);
  });

  it("carries the facts and the highlights", () => {
    expect(html).toContain("Saturday, September 19");
    expect(html).toContain("8 PM to midnight");
    expect(html).toContain("Karaoke: grab the mic");
  });

  it("has both buttons, pointing at the map and the menu", () => {
    expect(html).toContain(CASA_FACTS.map);
    expect(html).toContain("Get Directions");
    expect(html).toContain(CASA_FACTS.menu);
    expect(html).toContain("See the Menu");
  });

  it("puts the rewards line above the sign-off, only when asked", () => {
    expect(html.indexOf(REWARDS_TOKEN)).toBeGreaterThan(0);
    expect(html.indexOf(REWARDS_TOKEN)).toBeLessThan(html.indexOf("Casa de Leyva<br"));
    expect(buildAnnouncement(draft, { ...ctx, includeRewards: false })).not.toContain(REWARDS_TOKEN);
  });

  it("carries the phone, and never the old wrong one", () => {
    expect(html).toContain("623-306-2386");
    expect(html).not.toContain("623-386-4632");
  });

  it("works without a flyer", () => {
    const noFlyer = buildAnnouncement(draft, { includeRewards: false });
    expect(noFlyer).not.toContain("<img");
    expect(noFlyer).toContain("Saca las botas");
  });

  it("escapes anything typed, so copy cannot break the email", () => {
    const html2 = buildAnnouncement(
      { ...draft, greeting: 'Hi <script>alert("x")</script> & friends' },
      { includeRewards: false },
    );
    expect(html2).not.toContain("<script>");
    expect(html2).toContain("&amp; friends");
  });

  it("leaves out empty sections rather than printing blank rows", () => {
    const bare = buildAnnouncement(
      { subject: "s", greeting: "Hi", intro: "", facts: [], highlights: [], close: "" },
      { includeRewards: false },
    );
    expect(bare).toContain("Hi");
    expect(bare).not.toContain("<ul");
  });
});

describe("buildReminder", () => {
  const html = buildReminder(
    {
      subject: "Tonight! Del Rancho al Honky Tonk",
      greeting: "Tonight's the night! 🤠",
      intro: "",
      facts: ["8 PM to midnight", "No cover"],
      highlights: [],
      close: "See you tonight.",
    },
    ctx,
  );

  it("is short: no flyer, no highlights, both buttons", () => {
    expect(html).not.toContain("<ul");
    expect(html).toContain("Get Directions");
    expect(html).toContain("See the Menu");
    expect(html).toContain("8 PM to midnight");
  });

  it("never carries the rewards line", () => {
    expect(html).not.toContain(REWARDS_TOKEN);
  });

  it("is shorter than the announcement", () => {
    expect(html.length).toBeLessThan(buildAnnouncement(draft, ctx).length);
  });
});
