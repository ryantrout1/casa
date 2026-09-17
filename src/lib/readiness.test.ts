import { describe, it, expect } from "vitest";
import { EMPTY_HERO_FORM, type HeroFormState } from "./heroForm";
import { readiness, type ReadinessInput } from "./readiness";

// The campaign checklist. Publish is allowed only when every channel that is
// switched on has what it needs, and the checklist says what is missing in
// plain words. Rules that already live elsewhere (rotation pairing, plate
// validity) are asked of their modules, not restated.

const ID = "72dcee08-9888-409c-a4eb-d0cd7e1b1b68";

const hero = (o: Partial<HeroFormState> = {}): HeroFormState => ({ ...EMPTY_HERO_FORM, ...o });

function input(o: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    selected: [],
    subject: "Honky Tonk",
    emailEmpty: false,
    emailSent: false,
    flyerUrl: "",
    caption: "",
    eventDate: "",
    hero: hero(),
    ...o,
  };
}

const WEB_OK = {
  selected: ["hero", "grid", "fiestas_page"] as const,
  flyerUrl: `/api/img/${ID}`,
  caption: "Del Rancho al Honky Tonk",
  hero: hero({ title: "DEL RANCHO AL HONKY TONK", startLocal: "2026-09-19T20:00" }),
};

const ch = (r: ReturnType<typeof readiness>, key: string) => r.channels.find((c) => c.key === key)!;

describe("readiness: general", () => {
  it("cannot publish with nothing switched on", () => {
    const r = readiness(input());
    expect(r.canPublish).toBe(false);
    expect(r.general).toContain("at least one place to send it");
  });

  it("needs a campaign name", () => {
    const r = readiness(input({ ...WEB_OK, selected: [...WEB_OK.selected], subject: "  " }));
    expect(r.canPublish).toBe(false);
    expect(r.general).toContain("a campaign name");
  });

  it("lists website, email and Google in order", () => {
    expect(readiness(input()).channels.map((c) => c.key)).toEqual(["website", "email", "google"]);
  });
});

describe("readiness: website", () => {
  it("is ready with a flyer, caption, headline and start", () => {
    const r = readiness(input({ ...WEB_OK, selected: [...WEB_OK.selected] }));
    expect(ch(r, "website")).toMatchObject({ state: "ready", missing: [] });
    expect(r.canPublish).toBe(true);
  });

  it("is off when no website surface is selected", () => {
    expect(ch(readiness(input({ selected: ["email"] })), "website").state).toBe("off");
  });

  it("needs the flyer and a caption for any surface", () => {
    const w = ch(readiness(input({ selected: ["grid"] })), "website");
    expect(w.state).toBe("needs");
    expect(w.missing).toEqual(["the flyer", "a caption for the flyer"]);
  });

  it("does not ask for hero copy when the hero is off", () => {
    const w = ch(readiness(input({ selected: ["grid"], flyerUrl: "x", caption: "c" })), "website");
    expect(w.state).toBe("ready");
  });

  it("needs a headline and a date when the hero is on", () => {
    const w = ch(
      readiness(input({ selected: ["hero"], flyerUrl: "x", caption: "c", hero: hero() })),
      "website",
    );
    expect(w.missing).toEqual(["a headline for the hero", "the event date and time"]);
  });

  it("accepts the flyer's event date in place of a start time", () => {
    const w = ch(
      readiness(
        input({ selected: ["hero"], flyerUrl: "x", caption: "c", eventDate: "2026-09-19", hero: hero({ title: "X" }) }),
      ),
      "website",
    );
    expect(w.state).toBe("ready");
  });

  it("flags a background picture that cannot be used", () => {
    const bad = ch(
      readiness(input({ ...WEB_OK, selected: ["hero"], hero: { ...WEB_OK.hero, plateUrl: "/images/x.jpg" } })),
      "website",
    );
    expect(bad.missing).toContain("a hero background picture that works (upload it again)");
    const phoneOnly = ch(
      readiness(input({ ...WEB_OK, selected: ["hero"], hero: { ...WEB_OK.hero, plateMobileUrl: `/api/img/${ID}` } })),
      "website",
    );
    expect(phoneOnly.missing).toContain("a computer background picture (the phone one alone does nothing)");
  });

  it("notes, without blocking, a Spanish translation that is only partly filled", () => {
    const w = ch(
      readiness(
        input({ ...WEB_OK, selected: ["hero"], hero: { ...WEB_OK.hero, script: "Karaoke Night", titleAlt: "DEL RANCHO" } }),
      ),
      "website",
    );
    expect(w.state).toBe("ready");
    expect(w.notes).toContain("The Spanish lines are not all filled in, so the hero will stay in English.");
  });

  it("says nothing about Spanish when none was started", () => {
    const w = ch(readiness(input({ ...WEB_OK, selected: ["hero"] })), "website");
    expect(w.notes).toEqual([]);
  });
});

describe("readiness: email", () => {
  it("needs a message", () => {
    const e = ch(readiness(input({ selected: ["email"], emailEmpty: true })), "email");
    expect(e).toMatchObject({ state: "needs", missing: ["an email message"] });
  });

  it("is ready with a name and a message", () => {
    const r = readiness(input({ selected: ["email"] }));
    expect(ch(r, "email").state).toBe("ready");
    expect(r.canPublish).toBe(true);
  });

  it("an email already sent is off, noted, and not a reason to block", () => {
    const r = readiness(input({ ...WEB_OK, selected: ["email", ...WEB_OK.selected], emailSent: true, emailEmpty: true }));
    expect(ch(r, "email")).toMatchObject({ state: "off", notes: ["Already sent"] });
    expect(r.canPublish).toBe(true);
  });

  it("an already-sent email alone leaves nothing to publish", () => {
    const r = readiness(input({ selected: ["email"], emailSent: true }));
    expect(r.canPublish).toBe(false);
    expect(r.general).toContain("at least one place to send it");
  });
});

describe("readiness: google", () => {
  it("stays off while not connected", () => {
    expect(ch(readiness(input({ ...WEB_OK, selected: [...WEB_OK.selected] })), "google")).toMatchObject({
      state: "off",
      notes: ["Not connected yet"],
    });
  });
});

describe("readiness: blocking", () => {
  it("blocks publishing while any switched-on channel needs something", () => {
    const r = readiness(input({ ...WEB_OK, selected: ["email", ...WEB_OK.selected], emailEmpty: true }));
    expect(r.canPublish).toBe(false);
  });
});
