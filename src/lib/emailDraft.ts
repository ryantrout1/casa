import { responsePayload } from "./flyerRead";
import type { EmailDraft } from "./emailTemplate";

// One flyer read into two emails: the announcement and the day-of reminder.
//
// The model writes words only. Every fact about the restaurant (phone,
// address, links) belongs to lib/emailTemplate and is stripped out of
// anything the model writes: the Honky Tonk send went out carrying a phone
// number that has been wrong for months, and this is the guard against a
// repeat.
//
// Pure and client-safe. The key and the network call live in the route.

export const EMAIL_SCHEMA = {
  type: "object" as const,
  properties: {
    announcement: {
      type: "object",
      description: "The email sent when the campaign is published.",
      properties: {
        subject: { type: "string", description: "Inbox subject line, under 60 characters." },
        greeting: { type: "string", description: "One short opening line, one emoji at most." },
        intro: { type: "string", description: "One or two sentences on what the event is." },
        facts: {
          type: "array",
          items: { type: "string" },
          description: "Up to 5 short lines: date, time, price, ages. Each may start with one emoji.",
        },
        highlights: {
          type: "array",
          items: { type: "string" },
          description: "Up to 5 short 'what's waiting for you' lines, each starting with one emoji.",
        },
        close: { type: "string", description: "One warm closing line." },
      },
      required: ["subject", "greeting", "intro", "facts", "highlights", "close"],
      additionalProperties: false,
    },
    reminder: {
      type: "object",
      description: "The short email sent on the day of the event.",
      properties: {
        subject: { type: "string", description: "Starts with Tonight or Today. Under 50 characters." },
        greeting: { type: "string", description: "One short line saying it is happening today." },
        intro: { type: "string", description: "One sentence, the single thing not to forget." },
        facts: {
          type: "array",
          items: { type: "string" },
          description: "Up to 3 short lines: time, and price or ages if they matter.",
        },
        close: { type: "string", description: "One short closing line." },
      },
      required: ["subject", "greeting", "intro", "facts", "close"],
      additionalProperties: false,
    },
  },
  required: ["announcement", "reminder"],
  additionalProperties: false,
};

export const EMAIL_PROMPT = `This is a promotional flyer for Casa de Leyva, a Mexican restaurant and
cantina in Buckeye, Arizona. Write two emails to its rewards members about
this event.

VOICE: warm, direct, spoken. English with Spanish woven in the way a bilingual
neighborhood restaurant writes ("Saca las botas, amigos!", "¡Te esperamos!",
"Nos vemos el sábado"). Short sentences. Emoji used the way the flyer uses
them: one to open a line, never a row of them. Never corporate, never hype.

THE ANNOUNCEMENT goes out days before: greeting, one or two sentences on what
the night is, the practical lines (date, time, price, ages), a short list of
what is waiting for them, one warm closing line.

THE REMINDER goes out the morning of, and is about a third as long: it says
today or tonight, gives the time, gives the one thing not to forget, and stops.

DO NOT WRITE, in either email: a phone number, a street address, a website or
any link, hashtags, an unsubscribe line, or a sign-off with the restaurant's
name. All of that is added automatically, and anything you write of it is
deleted. Do not mention rewards or punch cards.

Report only what the poster says. If the poster does not give a price or an
age policy, leave it out rather than inventing one.`;

export type EmailDrafts = { announcement: EmailDraft; reminder: EmailDraft };

const MAX_LIST = 6;
const MAX_LINE = 300;

/** One line of bounded text: no line breaks, trimmed, capped. */
function line(v: string): string {
  return v.replace(/\s+/g, " ").trim().slice(0, MAX_LINE).trim();
}

// Facts the template owns. Each pattern is deliberately narrow so real copy
// survives: "8 PM to midnight", "$5 per card" and "September 19, 2026" all
// have to come through untouched.
const PHONE = /\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org)\b\S*/gi;
const HASHTAG = /#\w+/g;
const STREET =
  /\b\d{1,5}\s+(?:[NSEW]\.?\s+)?[A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*)*\s+(?:Ave|Avenue|St|Street|Rd|Road|Blvd|Way|Dr|Drive|Ln|Lane)\b\.?,?/g;

/**
 * Remove anything the template owns from a line the model wrote.
 *
 * Whatever is left is trimmed of the punctuation the removal orphaned, so
 * "Call us at 623-306-2386." does not become "Call us at ." on screen.
 */
export function stripFacts(text: string): string {
  const cleaned = text
    .replace(STREET, " ")
    .replace(URL, " ")
    .replace(PHONE, " ")
    .replace(HASHTAG, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Drop a trailing lead-in left behind ("Questions? Call" -> "Questions?").
  return cleaned.replace(/[\s,:;·|-]+$/g, "").trim();
}

function strings(v: unknown, cap: number): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === "string")) return null;
  return v
    .map((x) => stripFacts(line(x)))
    .filter((x) => x !== "")
    .slice(0, cap);
}

function block(v: unknown, withHighlights: boolean): EmailDraft | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const fields = ["subject", "greeting", "intro", "close"] as const;
  if (!fields.every((k) => typeof o[k] === "string")) return null;

  const subject = stripFacts(line(o.subject as string));
  const greeting = stripFacts(line(o.greeting as string));
  // A read that could not name the event or open the email is not usable.
  if (subject === "" || greeting === "") return null;

  const facts = strings(o.facts, MAX_LIST);
  if (!facts) return null;
  const highlights = withHighlights ? strings(o.highlights, MAX_LIST) : [];
  if (!highlights) return null;

  return {
    subject,
    greeting,
    intro: stripFacts(line(o.intro as string)),
    facts,
    highlights,
    close: stripFacts(line(o.close as string)),
  };
}

/**
 * Turn a Messages API response into two drafts, or null.
 *
 * Total. A refusal, a truncation, a missing email, a wrong-typed field or an
 * empty subject all void the read, and the composer is left exactly where it
 * was with the admin free to write the email themselves.
 */
export function parseEmailDraft(raw: unknown): EmailDrafts | null {
  const p = responsePayload(raw);
  if (!p) return null;
  const announcement = block(p.announcement, true);
  const reminder = block(p.reminder, false);
  if (!announcement || !reminder) return null;
  return { announcement, reminder };
}
