// Campaign fan-out (Phase 2). A single "publish" targets any mix of
// destinations: Email plus the three owned website surfaces. This module holds
// the pure, side-effect-free logic the publish route and composer both rely on;
// the DB writes and email send live in the route.

export type ChannelId = "email" | "hero" | "grid" | "fiestas_page";

// Owned website surfaces — placement flags on a single fiesta row.
export const OWNED_SURFACES: ChannelId[] = ["hero", "grid", "fiestas_page"];

// Canonical order for iterating/displaying channels.
export const ALL_CHANNELS: ChannelId[] = ["email", "hero", "grid", "fiestas_page"];

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  email: "Email",
  hero: "Hero",
  grid: "Homepage grid",
  fiestas_page: "Fiestas page",
};

export type SurfaceFlags = {
  is_hero: boolean;
  in_grid: boolean;
  on_fiestas_page: boolean;
};

// Which fiesta placement flags a set of selected channels implies.
export function flagsForChannels(channels: ChannelId[]): SurfaceFlags {
  return {
    is_hero: channels.includes("hero"),
    in_grid: channels.includes("grid"),
    on_fiestas_page: channels.includes("fiestas_page"),
  };
}

// Does this publish touch any website surface (i.e. does it need a fiesta row)?
export function hasOwnedSurface(channels: ChannelId[]): boolean {
  return OWNED_SURFACES.some((s) => channels.includes(s));
}

export type FlyerInput = {
  imageUrl?: string;
  caption?: string;
  alt?: string;
  eventDate?: string | null;
};

// Validate a publish request against the selected channels. Returns an error
// message to show the user, or null when the request is good to go.
// `messageText` is the plain-text of the email body; `hasImage` is whether the
// body contains an image (an image-only email is allowed).
export function validatePublish(
  subject: string,
  messageText: string,
  hasImage: boolean,
  flyer: FlyerInput,
  channels: ChannelId[],
): string | null {
  const selected = channels.filter((c) => ALL_CHANNELS.includes(c));
  if (selected.length === 0) return "Pick at least one destination.";
  if (!subject.trim()) return "Add a subject first.";

  if (selected.includes("email")) {
    if (messageText.trim().length === 0 && !hasImage) {
      return "Add a message before emailing subscribers.";
    }
  }

  if (hasOwnedSurface(selected)) {
    if (!flyer.imageUrl) return "Add a fiesta flyer image for the website.";
    if (!flyer.caption || !flyer.caption.trim()) {
      return "Add a caption for the flyer.";
    }
  }

  return null;
}

// Email re-send guard: has an email already gone out for this campaign?
export type PriorDispatch = { channel: string; status: string };
export function emailAlreadySent(prior: PriorDispatch[]): boolean {
  return prior.some((d) => d.channel === "email" && d.status === "ok");
}

export type DispatchStatus = "ok" | "failed" | "skipped";
export type DispatchResult = { status: DispatchStatus; detail?: string };
export type PublishResults = Partial<Record<ChannelId, DispatchResult>>;

// Every dispatched channel succeeded (and at least one was dispatched).
export function overallOk(results: PublishResults): boolean {
  const vals = Object.values(results).filter(Boolean) as DispatchResult[];
  return vals.length > 0 && vals.every((r) => r.status !== "failed");
}

// Per-channel display rows, in canonical order, for the result panel and tests.
export function resultEntries(
  results: PublishResults,
): { channel: ChannelId; label: string; ok: boolean; detail?: string }[] {
  return ALL_CHANNELS.filter((c) => results[c]).map((c) => ({
    channel: c,
    label: CHANNEL_LABEL[c],
    ok: results[c]!.status === "ok",
    detail: results[c]!.detail,
  }));
}
