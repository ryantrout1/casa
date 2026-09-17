import { phoenixLocalToUtcISO } from "./schedule";

// When the day-of reminder goes out, and whether it goes out at all.
//
// Pure and client-safe: the composer shows the same answer the server acts on,
// so nobody is surprised by a second email.
//
// Arizona keeps no DST, so Phoenix is UTC-7 all year and the arithmetic here
// is a fixed offset rather than a timezone library.

const PHOENIX_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Two emails closer together than this read as a mistake, so the second is dropped. */
export const SKIP_WINDOW_MS = 6 * 60 * 60 * 1000;

/** The hour the "morning of" reminder goes out, Phoenix time. */
export const MORNING_HOUR = 8;

export type ReminderMode = "morning" | "before4" | "custom";

export const REMINDER_MODES: { key: ReminderMode; label: string }[] = [
  { key: "morning", label: "The morning of, at 8 AM" },
  { key: "before4", label: "4 hours before it starts" },
  { key: "custom", label: "A time I pick" },
];

export type ReminderReason = "ok" | "no_event_time" | "no_time" | "past" | "too_close";

export type ReminderPlan = {
  ok: boolean;
  /** UTC ISO instant to send at, or null when it will not send. */
  at: string | null;
  reason: ReminderReason;
  /** One line for the composer, in plain words. */
  note: string;
};

export type ReminderInput = {
  /** The event's start, UTC ISO, or null when there is no date and time. */
  startsAt: string | null;
  mode: ReminderMode;
  /** Phoenix wall-clock "YYYY-MM-DDTHH:mm" for the custom mode. */
  customLocal: string;
  /** When the announcement goes out: now for a publish, its time for a schedule. */
  announcementAtMs: number;
  nowMs: number;
};

// 8 AM Phoenix on the event's own Phoenix day. Reading the day in Phoenix
// rather than UTC matters: an 8 PM event is already the next UTC day.
function morningOf(startMs: number): number {
  const local = new Date(startMs - PHOENIX_OFFSET_MS);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return day + MORNING_HOUR * 3_600_000 + PHOENIX_OFFSET_MS;
}

function fail(reason: ReminderReason, note: string): ReminderPlan {
  return { ok: false, at: null, reason, note };
}

/**
 * When the reminder should go, or why it should not.
 *
 * The two refusals are the ones that protect the reader: a reminder whose time
 * has passed, and a reminder landing on top of the announcement.
 */
export function reminderPlan(i: ReminderInput): ReminderPlan {
  const startMs = i.startsAt ? Date.parse(i.startsAt) : Number.NaN;
  if (!Number.isFinite(startMs)) {
    return fail("no_event_time", "No reminder: this campaign has no event date and time.");
  }

  let atMs: number;
  if (i.mode === "custom") {
    const utc = phoenixLocalToUtcISO(i.customLocal);
    if (!utc) return fail("no_time", "No reminder: pick the day and time to send it.");
    atMs = Date.parse(utc);
  } else if (i.mode === "before4") {
    atMs = startMs - 4 * 3_600_000;
  } else {
    atMs = morningOf(startMs);
  }

  if (atMs <= i.nowMs) {
    return fail("past", "No reminder: that time has already passed.");
  }
  if (atMs - i.announcementAtMs < SKIP_WINDOW_MS) {
    return fail(
      "too_close",
      "No reminder: it would land within 6 hours of the first email, which is too close together.",
    );
  }

  const at = new Date(atMs).toISOString();
  return { ok: true, at, reason: "ok", note: "" };
}

/** "Sat, Sep 19 at 8:00 AM" in Arizona time, for the composer. */
export function reminderWhen(at: string): string {
  return new Date(at).toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
