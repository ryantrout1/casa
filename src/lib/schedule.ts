// Campaign draft & schedule lifecycle helpers (pure, client-safe). Phase 1
// covers drafts; Phase 2 will add the scheduling (timezone + due-check) helpers.

import { ALL_CHANNELS, type ChannelId } from "./publish";

export type DraftFlyer = {
  imageUrl?: string;
  caption?: string;
  alt?: string;
  eventDate?: string | null;
};

export type DraftConfig = {
  channels: ChannelId[];
  flyer: DraftFlyer;
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
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
