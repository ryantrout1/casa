// Campaign draft & schedule lifecycle helpers (pure, client-safe). Phase 1
// covers drafts; Phase 2 will add the scheduling (timezone + due-check) helpers.

import { ALL_CHANNELS, type ChannelId, type HeroLang } from "./publish";

// Takeover hero copy, carried inside the flyer blob. Nested as one object
// rather than six sibling fields so both publish paths — the immediate route
// and the cron drain — parse it through the same function and cannot end up
// supporting different subsets.
export type HeroCopy = {
  startsAt?: string | null;
  title?: string;
  script?: string;
  ribbon?: string;
  sub?: string;
  lang?: HeroLang;
  /** Flyer crop position, 0–100. Clamped on parse. */
  focus?: number;
  /** When the takeover starts showing. Distinct from the email send time. */
  liveAt?: string;
  /** Section colours sampled from the flyer. 6-digit hex, lowercased. */
  bg?: string;
  accent?: string;
  ink?: string;
};

export type DraftFlyer = {
  imageUrl?: string;
  caption?: string;
  alt?: string;
  eventDate?: string | null;
  hero?: HeroCopy;
};

export type DraftConfig = {
  channels: ChannelId[];
  flyer: DraftFlyer;
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// Focus needs its own parser: str() drops falsy values, and 0 is a legitimate
// crop (top of the flyer), not an absence. Form inputs arrive as strings, so
// numeric strings are accepted and coerced. Out-of-range values are clamped
// rather than dropped — the DB CHECK would reject them and fail the whole
// publish, and a clamped crop is better than a lost one.
function pct(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// Colours must match the hero_colors_hex CHECK exactly, or the insert fails.
// Anything else degrades to "no colour", which renders the CSS fallback.
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
function hex(v: unknown): string | undefined {
  return typeof v === "string" && HEX_RE.test(v) ? v.toLowerCase() : undefined;
}

// Timestamps land in timestamptz columns, so an unparseable string does not
// degrade gracefully — it throws on INSERT and takes the whole publish with
// it. The cron drain has no user to show that error to, so validate here and
// drop what cannot be stored.
function ts(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length === 0) return undefined;
  return Number.isFinite(Date.parse(v)) ? v : undefined;
}

// Turn an arbitrary blob into safe hero copy, or undefined when there is
// nothing usable. Total by contract — the cron drain has no user to show an
// error to, so a malformed blob must degrade to "no hero copy", never throw.
// An unrecognised language is dropped rather than forwarded, because the
// column carries a CHECK constraint that would fail the whole insert.
export function parseHeroCopy(raw: unknown): HeroCopy | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: HeroCopy = {};
  if (ts(o.startsAt)) out.startsAt = ts(o.startsAt);
  if (str(o.title)) out.title = str(o.title);
  if (str(o.script)) out.script = str(o.script);
  if (str(o.ribbon)) out.ribbon = str(o.ribbon);
  if (str(o.sub)) out.sub = str(o.sub);
  if (o.lang === "en" || o.lang === "es") out.lang = o.lang;
  const focus = pct(o.focus);
  if (focus !== undefined) out.focus = focus;
  if (ts(o.liveAt)) out.liveAt = ts(o.liveAt);
  if (hex(o.bg)) out.bg = hex(o.bg);
  if (hex(o.accent)) out.accent = hex(o.accent);
  if (hex(o.ink)) out.ink = hex(o.ink);
  return Object.keys(out).length > 0 ? out : undefined;
}

// Turn a stored publish_config blob (or anything) into a safe, typed DraftConfig.
export function parseDraftConfig(raw: unknown): DraftConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const rawChannels = Array.isArray(obj.channels) ? obj.channels : [];
  const channels = rawChannels.filter(
    (c): c is ChannelId => typeof c === "string" && ALL_CHANNELS.includes(c as ChannelId),
  );

  const rawFlyer =
    obj.flyer && typeof obj.flyer === "object" ? (obj.flyer as Record<string, unknown>) : {};
  const flyer: DraftFlyer = {};
  if (str(rawFlyer.imageUrl)) flyer.imageUrl = str(rawFlyer.imageUrl);
  if (str(rawFlyer.caption)) flyer.caption = str(rawFlyer.caption);
  if (str(rawFlyer.alt)) flyer.alt = str(rawFlyer.alt);
  if (str(rawFlyer.eventDate)) flyer.eventDate = str(rawFlyer.eventDate);
  const hero = parseHeroCopy(rawFlyer.hero);
  if (hero) flyer.hero = hero;

  return { channels, flyer };
}

// Is there anything worth saving? A draft can be incomplete, but not blank.
export function isDraftEmpty(
  subject: string,
  messageText: string,
  hasImage: boolean,
  flyer: DraftFlyer,
): boolean {
  return (
    subject.trim().length === 0 &&
    messageText.trim().length === 0 &&
    !hasImage &&
    !flyer.imageUrl
  );
}

// ---------------------------------------------------------------------------
// Scheduling (Phase 2). Arizona never observes DST, so Phoenix time is a
// fixed UTC-7 year-round — no tz database needed.

export const PHOENIX_OFFSET = "-07:00";

const LOCAL_INPUT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// datetime-local value ("YYYY-MM-DDTHH:mm", Phoenix wall clock) -> UTC ISO
// string, or null when the input isn't a well-formed local datetime.
export function phoenixLocalToUtcISO(local: string): string | null {
  if (!LOCAL_INPUT_RE.test(local)) return null;
  const d = new Date(`${local}:00${PHOENIX_OFFSET}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// UTC ISO timestamp -> the datetime-local value that shows the same moment in
// Phoenix. Shift the instant back 7h, then read the shifted UTC components.
export function utcToPhoenixLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = new Date(d.getTime() - 7 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${s.getUTCFullYear()}-${p(s.getUTCMonth() + 1)}-${p(s.getUTCDate())}T${p(s.getUTCHours())}:${p(s.getUTCMinutes())}`;
}
