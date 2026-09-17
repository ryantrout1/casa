import { parseDraftConfig, type DraftConfig } from "./schedule";

// Duplicating a campaign: everything carries over except this event's dates.
//
// Pure and client-safe. The server builds the new draft's publish_config from
// this, so a copy can never republish the original's date.

export function duplicateConfig(raw: unknown): DraftConfig {
  const cfg = parseDraftConfig(raw);
  const hero = cfg.flyer.hero ? { ...cfg.flyer.hero } : undefined;
  if (hero) {
    delete hero.startsAt;
    delete hero.liveAt;
  }
  const flyer = { ...cfg.flyer };
  delete flyer.eventDate;
  if (hero) flyer.hero = hero;
  return { channels: cfg.channels, flyer };
}

const SUFFIX = "(copy)";

export function duplicateSubject(subject: string): string {
  const s = subject.trim();
  if (s === "") return SUFFIX;
  return s.endsWith(SUFFIX) ? s : `${s} ${SUFFIX}`;
}
