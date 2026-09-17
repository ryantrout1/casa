import type { ChannelId } from "./publish";

// Every place a campaign can go, in the order the admin shows them.
//
// This is the single answer to "can a campaign use this channel?". Pages
// render the list; nothing else decides. A channel that is not connected is
// shown but can never be switched on, so nothing is sent by accident.
//
// Pure and client-safe.

export type ChannelKey =
  | "website"
  | "email"
  | "google"
  | "facebook"
  | "instagram"
  | "sms"
  | "automations";

export type ChannelAvailability = "connected" | "not_connected" | "coming_later";

export type ChannelDef = {
  key: ChannelKey;
  label: string;
  description: string;
  availability: ChannelAvailability;
  /** The existing publish destinations this channel turns on. Empty until it can publish. */
  publishes: ChannelId[];
};

/**
 * Google Business Profile is built toward but off. Flip this when the profile
 * is connected; until then the card says "Not connected" and cannot be used.
 */
export const GOOGLE_BUSINESS_ENABLED = false;

export const CHANNELS: readonly ChannelDef[] = [
  {
    key: "website",
    label: "Website",
    description: "casadeleyva.com: the homepage hero, the upcoming fiestas grid, and the Fiestas page.",
    availability: "connected",
    publishes: ["hero", "grid", "fiestas_page"],
  },
  {
    key: "email",
    label: "Email",
    description: "A newsletter to rewards members who opted in, with the flyer inside.",
    availability: "connected",
    publishes: ["email"],
  },
  {
    key: "google",
    label: "Google Business Profile",
    description: "Event posts on your Google listing, plus hours and menu kept in step with the site.",
    availability: GOOGLE_BUSINESS_ENABLED ? "connected" : "not_connected",
    publishes: [],
  },
  {
    key: "facebook",
    label: "Facebook",
    description: "Post campaigns to the Casa de Leyva page.",
    availability: "coming_later",
    publishes: [],
  },
  {
    key: "instagram",
    label: "Instagram",
    description: "A feed post and a Story from the same flyer.",
    availability: "coming_later",
    publishes: [],
  },
  {
    key: "sms",
    label: "Text message",
    description: "Short reminders to members who opted in to texts.",
    availability: "coming_later",
    publishes: [],
  },
  {
    key: "automations",
    label: "Automations",
    description: "Messages that send themselves: birthdays, welcome, and we-miss-you.",
    availability: "coming_later",
    publishes: [],
  },
];

export function channel(key: ChannelKey): ChannelDef {
  const c = CHANNELS.find((x) => x.key === key);
  // Unreachable with a typed key; kept so the function is total.
  if (!c) throw new Error(`Unknown channel: ${key}`);
  return c;
}

/** Whether a campaign may turn this channel on. */
export function canPublish(key: ChannelKey): boolean {
  return channel(key).availability === "connected";
}
