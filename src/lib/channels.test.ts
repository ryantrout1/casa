import { describe, it, expect } from "vitest";
import { ALL_CHANNELS } from "./publish";
import { CHANNELS, GOOGLE_BUSINESS_ENABLED, canPublish, channel } from "./channels";

// The registry is the one list of places a campaign can go. Pages render it;
// nothing else gets to decide whether a channel can be used.

describe("channels registry", () => {
  it("lists channels in display order with unique keys", () => {
    expect(CHANNELS.map((c) => c.key)).toEqual([
      "website",
      "email",
      "google",
      "facebook",
      "instagram",
      "sms",
      "automations",
    ]);
  });

  it("has website and email connected today", () => {
    expect(channel("website").availability).toBe("connected");
    expect(channel("email").availability).toBe("connected");
    expect(canPublish("website")).toBe(true);
    expect(canPublish("email")).toBe(true);
  });

  it("keeps Google Business off until it is enabled", () => {
    expect(GOOGLE_BUSINESS_ENABLED).toBe(false);
    expect(channel("google").availability).toBe("not_connected");
    expect(canPublish("google")).toBe(false);
  });

  it.each(["facebook", "instagram", "sms", "automations"] as const)(
    "%s is coming later and cannot publish",
    (k) => {
      expect(channel(k).availability).toBe("coming_later");
      expect(canPublish(k)).toBe(false);
      expect(channel(k).publishes).toEqual([]);
    },
  );

  it("maps the two live channels onto every existing publish destination exactly once", () => {
    const covered = CHANNELS.flatMap((c) => c.publishes);
    expect([...covered].sort()).toEqual([...ALL_CHANNELS].sort());
    expect(channel("website").publishes).toEqual(["hero", "grid", "fiestas_page"]);
    expect(channel("email").publishes).toEqual(["email"]);
  });

  it("gives every channel a label and a plain description", () => {
    for (const c of CHANNELS) {
      expect(c.label.trim()).not.toBe("");
      expect(c.description.trim()).not.toBe("");
    }
  });
});
