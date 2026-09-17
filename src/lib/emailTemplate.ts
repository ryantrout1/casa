// Every campaign email is built here, from the few fields a draft carries plus
// the facts this file owns. Nothing about the restaurant is ever typed into a
// draft or written by a model: a wrong phone number already went out once, and
// the fix is that there is exactly one place the number can come from.
//
// The markup is email-safe: tables, inline styles, no flexbox, no classes.
// renderEmail wraps whatever this returns in the Casa header and footer.
//
// Pure and client-safe, so the composer can preview exactly what will send.

export const CASA_FACTS = {
  name: "Casa de Leyva",
  tagline: "Mexican Restaurant & Cantina",
  address: "424 E Monroe Ave, Buckeye, AZ 85326",
  phone: "623-306-2386",
  phoneHref: "tel:6233062386",
  site: "https://www.casadeleyva.com",
  menu: "https://www.casadeleyva.com/menu",
  map: "https://www.google.com/maps/dir/?api=1&destination=424+E+Monroe+Ave%2C+Buckeye%2C+AZ+85326",
} as const;

/**
 * Replaced per member at send time with their rewards progress, or removed
 * when there is nothing to say. Never leaves the system visible.
 */
export const REWARDS_TOKEN = "{{REWARDS_LINE}}";

/** The fields a draft carries. Everything else is this template's. */
export type EmailDraft = {
  subject: string;
  greeting: string;
  intro: string;
  facts: string[];
  highlights: string[];
  close: string;
};

export type EmailContext = {
  flyerUrl?: string;
  flyerAlt?: string;
  includeRewards: boolean;
};

const INK = "#222222";
const MUTED = "#666666";

// Everything a draft carries is text, and it lands in HTML. Escaping here
// means a stray < or & in copy can never break the email.
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function p(text: string, extra = ""): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK};${extra}">${esc(text)}</p>`;
}

function flyer(ctx: EmailContext): string {
  if (!ctx.flyerUrl) return "";
  return `<p style="margin:0 0 20px;"><img src="${ctx.flyerUrl}" alt="${esc(ctx.flyerAlt ?? "")}" width="544" style="width:100%;max-width:544px;height:auto;display:block;border:0;border-radius:8px;"></p>`;
}

function factsBlock(facts: string[]): string {
  const rows = facts.filter((f) => f.trim() !== "");
  if (rows.length === 0) return "";
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:${INK};">${rows
    .map((f) => esc(f))
    .join("<br>")}</p>`;
}

function highlightsBlock(items: string[]): string {
  const rows = items.filter((i) => i.trim() !== "");
  if (rows.length === 0) return "";
  return `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.7;color:${INK};">${rows
    .map((i) => `<li style="margin:0 0 6px;">${esc(i)}</li>`)
    .join("")}</ul>`;
}

function button(href: string, label: string, bg: string, color: string): string {
  return `<td style="padding:0 8px 8px 0;"><a href="${href}" style="display:inline-block;background:${bg};color:${color};font-size:15px;font-weight:bold;text-decoration:none;padding:13px 24px;border-radius:999px;">${esc(label)}</a></td>`;
}

function buttons(): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:4px 0 20px;"><tr>${button(
    CASA_FACTS.map,
    "Get Directions",
    "#3B628D",
    "#ffffff",
  )}${button(CASA_FACTS.menu, "See the Menu", "#ffffff", "#3B628D")}</tr></table>`;
}

function rewards(ctx: EmailContext): string {
  if (!ctx.includeRewards) return "";
  // Sits just above the sign-off: a nudge, not the point of the email.
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">${REWARDS_TOKEN}</p>`;
}

function signoff(): string {
  return `<p style="margin:0;font-size:15px;line-height:1.6;color:${INK};">${CASA_FACTS.name}<br><span style="color:${MUTED};">${CASA_FACTS.tagline}<br>${CASA_FACTS.address}<br><a href="${CASA_FACTS.phoneHref}" style="color:${MUTED};">${CASA_FACTS.phone}</a> · <a href="${CASA_FACTS.site}" style="color:${MUTED};">casadeleyva.com</a></span></p>`;
}

/**
 * The announcement: greeting, flyer, setup, the facts, what is waiting, a
 * close, the two buttons, the rewards nudge, the sign-off.
 *
 * The flyer sits directly under the greeting because the artwork is what an
 * inbox reader sees first. Empty fields are left out rather than printed as
 * blank rows.
 */
export function buildAnnouncement(draft: EmailDraft, ctx: EmailContext): string {
  return [
    draft.greeting.trim() ? p(draft.greeting) : "",
    flyer(ctx),
    draft.intro.trim() ? p(draft.intro) : "",
    factsBlock(draft.facts),
    highlightsBlock(draft.highlights),
    draft.close.trim() ? p(draft.close) : "",
    buttons(),
    rewards(ctx),
    signoff(),
  ].join("");
}

/**
 * The day-of reminder: one line, the times, the buttons. No flyer, no
 * highlight list, no rewards nudge — it is read on a phone, hours before the
 * doors open, and its whole job is the time and the address.
 */
export function buildReminder(draft: EmailDraft, _ctx: EmailContext): string {
  return [
    draft.greeting.trim() ? p(draft.greeting) : "",
    draft.intro.trim() ? p(draft.intro) : "",
    factsBlock(draft.facts),
    draft.close.trim() ? p(draft.close) : "",
    buttons(),
    signoff(),
  ].join("");
}
