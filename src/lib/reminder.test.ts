import { describe, it, expect } from "vitest";
import { REMINDER_MODES, SKIP_WINDOW_MS, reminderPlan, type ReminderMode } from "./reminder";

// The day-of reminder's time. Arizona has no DST, so 8 AM Phoenix is 15:00 UTC
// all year. Everything here decides ONE thing: send it, and when.

const START = "2026-09-20T03:00:00Z"; // Sat Sep 19, 8 PM Phoenix
const NOW = Date.parse("2026-09-17T19:00:00Z"); // Thu Sep 17, noon Phoenix

const plan = (o: Partial<Parameters<typeof reminderPlan>[0]> = {}) =>
  reminderPlan({
    startsAt: START,
    mode: "morning" as ReminderMode,
    customLocal: "",
    announcementAtMs: NOW,
    nowMs: NOW,
    ...o,
  });

describe("modes", () => {
  it("offers exactly the three agreed choices", () => {
    expect(REMINDER_MODES.map((m) => m.key)).toEqual(["morning", "before4", "custom"]);
    expect(REMINDER_MODES[0].label).toContain("8");
  });
});

describe("reminderPlan", () => {
  it("morning of is 8 AM Phoenix on the event's own day", () => {
    const p = plan();
    expect(p.ok).toBe(true);
    expect(p.at).toBe("2026-09-19T15:00:00.000Z"); // Sat Sep 19, 8 AM Phoenix
  });

  it("four hours before is measured from the start time", () => {
    expect(plan({ mode: "before4" }).at).toBe("2026-09-19T23:00:00.000Z"); // 4 PM Phoenix
  });

  it("custom takes an Arizona wall-clock time", () => {
    expect(plan({ mode: "custom", customLocal: "2026-09-19T17:30" }).at).toBe(
      "2026-09-20T00:30:00.000Z",
    );
  });

  it("uses the event's own day even for a late-night start that rolls past midnight UTC", () => {
    // 1 AM Phoenix Sunday is 08:00 UTC Sunday; the event day is still Sunday.
    const p = plan({ startsAt: "2026-09-20T08:00:00Z" });
    expect(p.at).toBe("2026-09-20T15:00:00.000Z");
  });

  it("does not send without an event time", () => {
    expect(plan({ startsAt: null })).toMatchObject({ ok: false, reason: "no_event_time" });
    expect(plan({ startsAt: "not a date" })).toMatchObject({ ok: false, reason: "no_event_time" });
  });

  it("does not send a reminder whose time has already passed", () => {
    const p = plan({ nowMs: Date.parse("2026-09-19T18:00:00Z"), announcementAtMs: Date.parse("2026-09-19T18:00:00Z") });
    expect(p).toMatchObject({ ok: false, reason: "past" });
  });

  it("does not send within six hours of the announcement", () => {
    const late = Date.parse("2026-09-19T12:00:00Z"); // 3 hours before the 8 AM reminder
    expect(plan({ announcementAtMs: late, nowMs: late })).toMatchObject({
      ok: false,
      reason: "too_close",
    });
    expect(SKIP_WINDOW_MS).toBe(6 * 60 * 60 * 1000);
  });

  it("sends when the announcement is exactly the window away", () => {
    const at = Date.parse("2026-09-19T15:00:00.000Z");
    expect(plan({ announcementAtMs: at - SKIP_WINDOW_MS, nowMs: NOW }).ok).toBe(true);
  });

  it("measures the window against a scheduled announcement, not against now", () => {
    // Announcement scheduled for the morning of; the reminder would collide.
    const scheduled = Date.parse("2026-09-19T14:00:00Z");
    expect(plan({ announcementAtMs: scheduled }).reason).toBe("too_close");
  });

  it("rejects a custom time that is not a valid Arizona wall-clock value", () => {
    expect(plan({ mode: "custom", customLocal: "" })).toMatchObject({ ok: false, reason: "no_time" });
    expect(plan({ mode: "custom", customLocal: "nope" })).toMatchObject({ ok: false, reason: "no_time" });
  });

  it("says in words why it will not send, for the composer to show", () => {
    expect(plan({ startsAt: null }).note).toContain("event date and time");
    expect(plan({ announcementAtMs: Date.parse("2026-09-19T14:00:00Z") }).note).toContain("6 hours");
  });
});
