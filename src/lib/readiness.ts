import type { ChannelId } from "./publish";
import type { HeroFormState } from "./heroForm";
import { heroBlocks } from "./heroAlt";
import { plateStatus } from "./heroPlate";
import { canPublish, channel, type ChannelKey } from "./channels";

// The campaign checklist: for each channel the composer shows, is it on, is it
// ready, and if not, what is missing, in words Stephanie would use.
//
// Pure and client-safe. Rules that live elsewhere are asked of their modules
// (heroBlocks for the Spanish pairing, plateStatus for background pictures),
// so this checklist cannot disagree with what the homepage will do.

export type ReadinessInput = {
  /** The publish destinations that are switched on. */
  selected: ChannelId[];
  /** The campaign name, which is also the email subject. */
  subject: string;
  emailEmpty: boolean;
  /** The email already went out from this campaign; it will not send again. */
  emailSent: boolean;
  flyerUrl: string;
  caption: string;
  /** The flyer's event date, 'YYYY-MM-DD' or "". */
  eventDate: string;
  hero: HeroFormState;
};

export type ReadyState = "ready" | "needs" | "off";

export type ChannelReadiness = {
  key: ChannelKey;
  label: string;
  state: ReadyState;
  /** What must be added before this channel can publish. */
  missing: string[];
  /** Worth knowing, but not a reason to hold the campaign back. */
  notes: string[];
};

export type Readiness = {
  channels: ChannelReadiness[];
  /** Missing things that are not tied to one channel. */
  general: string[];
  canPublish: boolean;
};

const SHOWN: ChannelKey[] = ["website", "email", "google"];

const blank = (s: string) => s.trim() === "";
const orNull = (s: string) => (blank(s) ? null : s.trim());

function website(i: ReadinessInput): Omit<ChannelReadiness, "key" | "label"> {
  const on = channel("website").publishes.some((id) => i.selected.includes(id));
  if (!on) return { state: "off", missing: [], notes: [] };

  const missing: string[] = [];
  const notes: string[] = [];
  if (blank(i.flyerUrl)) missing.push("the flyer");
  if (blank(i.caption)) missing.push("a caption for the flyer");

  if (i.selected.includes("hero")) {
    const h = i.hero;
    if (blank(h.title)) missing.push("a headline for the hero");
    if (blank(h.startLocal) && blank(i.eventDate)) missing.push("the event date and time");

    const plate = plateStatus({
      plateUrl: h.plateUrl,
      plateMobileUrl: h.plateMobileUrl,
      hasTitle: true,
      hasDate: true,
    });
    if (plate === "bad_url") missing.push("a hero background picture that works (upload it again)");
    if (plate === "needs_desktop") {
      missing.push("a computer background picture (the phone one alone does nothing)");
    }

    const altStarted = [h.titleAlt, h.scriptAlt, h.ribbonAlt, h.subAlt].some((s) => !blank(s));
    if (altStarted && !blank(h.title)) {
      const { alt } = heroBlocks({
        heroLang: h.lang,
        heroTitle: orNull(h.title),
        heroScript: orNull(h.script),
        heroRibbon: orNull(h.ribbon),
        heroSub: orNull(h.sub),
        heroTitleAlt: orNull(h.titleAlt),
        heroScriptAlt: orNull(h.scriptAlt),
        heroRibbonAlt: orNull(h.ribbonAlt),
        heroSubAlt: orNull(h.subAlt),
      });
      if (!alt) {
        const other = h.lang === "es" ? "English" : "Spanish";
        const stays = h.lang === "es" ? "Spanish" : "English";
        notes.push(`The ${other} lines are not all filled in, so the hero will stay in ${stays}.`);
      }
    }
  }

  return { state: missing.length > 0 ? "needs" : "ready", missing, notes };
}

function email(i: ReadinessInput): Omit<ChannelReadiness, "key" | "label"> {
  if (!i.selected.includes("email")) return { state: "off", missing: [], notes: [] };
  if (i.emailSent) return { state: "off", missing: [], notes: ["Already sent"] };
  const missing = i.emailEmpty ? ["an email message"] : [];
  return { state: missing.length > 0 ? "needs" : "ready", missing, notes: [] };
}

export function readiness(i: ReadinessInput): Readiness {
  const channels: ChannelReadiness[] = SHOWN.map((key) => {
    const base = { key, label: channel(key).label };
    if (!canPublish(key)) {
      return { ...base, state: "off" as const, missing: [], notes: ["Not connected yet"] };
    }
    if (key === "website") return { ...base, ...website(i) };
    return { ...base, ...email(i) };
  });

  const general: string[] = [];
  if (blank(i.subject)) general.push("a campaign name");
  if (!channels.some((c) => c.state !== "off")) general.push("at least one place to send it");

  const canPublishNow = general.length === 0 && channels.every((c) => c.state !== "needs");
  return { channels, general, canPublish: canPublishNow };
}
