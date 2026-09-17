import { describe, it, expect } from "vitest";
import { EMAIL_SCHEMA, parseEmailDraft, stripFacts } from "./emailDraft";

// Reading a flyer into two emails. The model writes the words; the facts
// (phone, address, links) are the template's and are stripped out of anything
// it writes, because a wrong phone number already reached 246 inboxes.

function reply(payload: unknown, stop_reason = "end_turn") {
  return { stop_reason, content: [{ type: "text", text: JSON.stringify(payload) }] };
}

const GOOD = {
  announcement: {
    subject: "Del Rancho al Honky Tonk: Karaoke Night this Saturday!",
    greeting: "Saca las botas, amigos!",
    intro: "This Saturday we turn up the volume: norteño, banda and country classics.",
    facts: ["📅 Saturday, September 19", "🕗 8 PM to midnight"],
    highlights: ["🎤 Karaoke: grab the mic", "💃 Bring a partner"],
    close: "Warm up that voice.",
  },
  reminder: {
    subject: "Tonight! Del Rancho al Honky Tonk",
    greeting: "Tonight's the night! 🤠",
    intro: "Karaoke starts at 8.",
    facts: ["🕗 8 PM to midnight"],
    close: "See you tonight.",
  },
};

describe("EMAIL_SCHEMA", () => {
  it("asks for both emails and allows nothing else", () => {
    expect(Object.keys(EMAIL_SCHEMA.properties).sort()).toEqual(["announcement", "reminder"]);
    expect(EMAIL_SCHEMA.additionalProperties).toBe(false);
    expect(EMAIL_SCHEMA.required).toEqual(["announcement", "reminder"]);
  });
});

describe("stripFacts", () => {
  it.each([
    ["Call us at 623-386-4632 today", "Call us at today"],
    ["Call (623) 306-2386 now", "Call now"],
    ["See casadeleyva.com for more", "See for more"],
    ["Visit https://www.casadeleyva.com/menu ok", "Visit ok"],
    ["Fun #CincoDeMayo #BuckeyeAZ", "Fun"],
    ["We are at 424 E Monroe Ave, Buckeye", "We are at Buckeye"],
  ])("removes facts from %s", (input, want) => {
    expect(stripFacts(input)).toBe(want);
  });

  it("leaves times, prices and dates alone", () => {
    expect(stripFacts("8 PM to midnight")).toBe("8 PM to midnight");
    expect(stripFacts("$5 per card · 5:30 PM")).toBe("$5 per card · 5:30 PM");
    expect(stripFacts("Saturday, September 19, 2026")).toBe("Saturday, September 19, 2026");
    expect(stripFacts("🎤 Karaoke: grab the mic")).toBe("🎤 Karaoke: grab the mic");
  });
});

describe("parseEmailDraft", () => {
  it("parses both emails", () => {
    const d = parseEmailDraft(reply(GOOD));
    expect(d?.announcement.subject).toBe(GOOD.announcement.subject);
    expect(d?.announcement.highlights).toHaveLength(2);
    expect(d?.reminder.greeting).toBe("Tonight's the night! 🤠");
    // The reminder never carries a highlight list.
    expect(d?.reminder.highlights).toEqual([]);
  });

  it("strips facts the model wrote into any field", () => {
    const d = parseEmailDraft(
      reply({
        ...GOOD,
        announcement: {
          ...GOOD.announcement,
          close: "Questions? Call 623-386-4632 or see casadeleyva.com",
          facts: ["📍 424 E Monroe Ave, Buckeye", "🕗 8 PM"],
        },
      }),
    );
    expect(d?.announcement.close).not.toContain("623");
    expect(d?.announcement.facts.join(" ")).not.toContain("Monroe");
    expect(d?.announcement.facts).toContain("🕗 8 PM");
  });

  it("drops a field that was only a fact, rather than leaving an empty bullet", () => {
    const d = parseEmailDraft(
      reply({ ...GOOD, announcement: { ...GOOD.announcement, facts: ["casadeleyva.com", "🕗 8 PM"] } }),
    );
    expect(d?.announcement.facts).toEqual(["🕗 8 PM"]);
  });

  it("caps the lists so one long read cannot produce a wall of text", () => {
    const many = Array.from({ length: 12 }, (_, i) => `item ${i}`);
    const d = parseEmailDraft(
      reply({ ...GOOD, announcement: { ...GOOD.announcement, facts: many, highlights: many } }),
    );
    expect(d!.announcement.facts.length).toBeLessThanOrEqual(6);
    expect(d!.announcement.highlights.length).toBeLessThanOrEqual(6);
  });

  it.each([
    ["a refusal", { stop_reason: "refusal", content: [] }],
    ["truncation", reply(GOOD, "max_tokens")],
    ["malformed json", { stop_reason: "end_turn", content: [{ type: "text", text: "{" }] }],
    ["a missing email", reply({ announcement: GOOD.announcement })],
    ["a wrong-typed field", reply({ ...GOOD, reminder: { ...GOOD.reminder, subject: 5 } })],
    ["an empty subject", reply({ ...GOOD, reminder: { ...GOOD.reminder, subject: "  " } })],
    ["a missing greeting", reply({ ...GOOD, announcement: { ...GOOD.announcement, greeting: "" } })],
    ["null", null],
  ])("voids on %s", (_label, raw) => {
    expect(parseEmailDraft(raw)).toBeNull();
  });

  it("flattens line breaks and trims", () => {
    const d = parseEmailDraft(
      reply({ ...GOOD, announcement: { ...GOOD.announcement, intro: "  two\nlines  " } }),
    );
    expect(d?.announcement.intro).toBe("two lines");
  });
});
