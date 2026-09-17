import { ALL_CHANNELS, type ChannelId } from "./publish";
import { isCurrent, type CurrentRow } from "./fiestaSelect";
import { canPublish, channel, type ChannelKey } from "./channels";

// One campaign becomes one row on the Campaigns list: a status, a label, and
// a state for each channel the list shows. Pure and client-safe; the page
// only renders what this returns.

export type CampaignStatus = "live" | "scheduled" | "draft" | "ended" | "sent" | "failed";
export type ChannelState = "live" | "done" | "planned" | "attention" | "off";
export type Tab = "all" | "live" | "scheduled" | "drafts" | "past";

/** The linked fiesta, as far as status needs it. */
export type CampaignFiesta = CurrentRow & {
  is_hero: boolean;
  in_grid: boolean;
  on_fiestas_page: boolean;
};

export type CampaignInput = {
  /** campaigns.status as stored. */
  status: string;
  sentCount: number;
  /** The destinations a draft or scheduled campaign will use, from publish_config. */
  selected: ChannelId[];
  /** campaign_dispatches rows for this campaign. */
  dispatches: { channel: string; status: string }[];
  /** The fiesta linked by campaigns.fiesta_id, or null. */
  fiesta: CampaignFiesta | null;
};

export type CampaignRowView = {
  status: CampaignStatus;
  label: string;
  channels: { key: ChannelKey; label: string; state: ChannelState }[];
};

/** The list shows these channels, in this order. */
const SHOWN: ChannelKey[] = ["website", "email", "google"];

/** The channel list a stored publish_config carries. Unknown entries are dropped. */
export function channelsFromConfig(raw: unknown): ChannelId[] {
  if (!raw || typeof raw !== "object") return [];
  const v = (raw as { channels?: unknown }).channels;
  if (!Array.isArray(v)) return [];
  return v.filter((c): c is ChannelId => ALL_CHANNELS.includes(c as ChannelId));
}

function onWebsite(f: CampaignFiesta, today: string, nowMs: number): boolean {
  return (f.is_hero || f.in_grid || f.on_fiestas_page) && isCurrent(f, today, nowMs);
}

function stateFor(
  key: ChannelKey,
  c: CampaignInput,
  pending: boolean,
  today: string,
  nowMs: number,
): ChannelState {
  // A channel that cannot publish never shows as used, whatever a row says.
  if (!canPublish(key)) return "off";
  const ids = channel(key).publishes;

  if (pending) return ids.some((id) => c.selected.includes(id)) ? "planned" : "off";

  const mine = c.dispatches.filter((d) => ids.includes(d.channel as ChannelId));
  if (mine.some((d) => d.status === "failed")) return "attention";

  if (key === "website") {
    if (mine.some((d) => d.status === "ok")) {
      return c.fiesta && onWebsite(c.fiesta, today, nowMs) ? "live" : "done";
    }
    return "off";
  }

  // Email. "skipped" means there was nobody to send to, which is not a
  // failure. Campaigns from before dispatch tracking have no rows at all, so
  // a nonzero sent count also counts.
  if (mine.some((d) => d.status === "ok" || d.status === "skipped")) return "done";
  if (mine.length === 0 && c.sentCount > 0) return "done";
  return "off";
}

export function campaignRow(c: CampaignInput, today: string, nowMs: number): CampaignRowView {
  let status: CampaignStatus;
  let label: string;
  switch (c.status) {
    case "draft":
      status = "draft";
      label = "Draft";
      break;
    case "scheduled":
      status = "scheduled";
      label = "Scheduled";
      break;
    case "sending":
      status = "scheduled";
      label = "Sending";
      break;
    case "failed":
      status = "failed";
      label = "Failed";
      break;
    default: {
      // published, sent, or anything unexpected: never hide a campaign. A
      // campaign that put a flyer on the site is live while that flyer is
      // current and on a surface; one that only emailed is simply sent.
      if (c.fiesta) {
        const live = onWebsite(c.fiesta, today, nowMs);
        status = live ? "live" : "ended";
        label = live ? "Live now" : "Ended";
      } else if (
        c.dispatches.some(
          (d) => channel("website").publishes.includes(d.channel as ChannelId) && d.status === "ok",
        )
      ) {
        // It was on the website, and its flyer has since been deleted.
        status = "ended";
        label = "Ended";
      } else {
        status = "sent";
        label = "Sent";
      }
    }
  }

  const pending = status === "draft" || status === "scheduled";
  return {
    status,
    label,
    channels: SHOWN.map((key) => ({
      key,
      label: channel(key).label,
      state: stateFor(key, c, pending, today, nowMs),
    })),
  };
}

export function tabOf(s: CampaignStatus): Exclude<Tab, "all"> {
  if (s === "live") return "live";
  if (s === "scheduled") return "scheduled";
  if (s === "draft") return "drafts";
  return "past";
}

export function tabCounts(statuses: CampaignStatus[]): Record<Tab, number> {
  const out: Record<Tab, number> = { all: statuses.length, live: 0, scheduled: 0, drafts: 0, past: 0 };
  for (const s of statuses) out[tabOf(s)] += 1;
  return out;
}
