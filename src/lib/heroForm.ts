import { phoenixLocalToUtcISO, type HeroCopy } from "./schedule";
import { isHex } from "./palette";
import type { HeroLang } from "./publish";

// The composer's hero panel, as the form holds it. Every field is a string
// (or a string-shaped number) because that is what an <input> yields; the
// conversion to a storable HeroCopy happens here, once, in a pure function
// the component can be tested through.
export type HeroFormState = {
  /** Phoenix wall-clock "YYYY-MM-DDTHH:mm" — when the EVENT starts. */
  startLocal: string;
  /** Phoenix wall-clock "YYYY-MM-DDTHH:mm" — when the TAKEOVER starts. */
  liveLocal: string;
  title: string;
  script: string;
  ribbon: string;
  sub: string;
  lang: HeroLang;
  /** Crop position 0–100 as the slider holds it, or "" for "use the default". */
  focus: string;
  bg: string;
  accent: string;
  ink: string;
};

export const EMPTY_HERO_FORM: HeroFormState = {
  startLocal: "",
  liveLocal: "",
  title: "",
  script: "",
  ribbon: "",
  sub: "",
  lang: "en",
  focus: "",
  bg: "",
  accent: "",
  ink: "",
};

/**
 * Turn the hero panel's form state into the HeroCopy that rides inside the
 * draft blob, or `undefined` when the admin has not touched it.
 *
 * The `undefined` return is the load-bearing contract. Every draft saved
 * before the hero panel existed has no `hero` key, and the cron drain parses
 * those blobs; returning an object for an untouched form would change the
 * shape of every draft in the system. So "nothing filled in" must stay
 * indistinguishable from "this feature does not exist".
 */
export function heroPayloadFrom(f: HeroFormState): HeroCopy | undefined {
  const startsAt = f.startLocal ? phoenixLocalToUtcISO(f.startLocal) : null;
  const liveAt = f.liveLocal ? phoenixLocalToUtcISO(f.liveLocal) : null;

  // Trim once; the same values decide "is anything filled" and what is sent,
  // so the two can never disagree.
  const title = f.title.trim();
  const script = f.script.trim();
  const ribbon = f.ribbon.trim();
  const sub = f.sub.trim();

  // A crop of 0 is a real value (top of the flyer), so emptiness is tested on
  // the string, not on the number.
  const focusRaw = f.focus.trim();
  const focus = focusRaw === "" ? null : Number(focusRaw);
  const hasFocus = focus !== null && Number.isFinite(focus);

  const bg = isHex(f.bg) ? f.bg.toLowerCase() : null;
  const accent = isHex(f.accent) ? f.accent.toLowerCase() : null;
  const ink = isHex(f.ink) ? f.ink.toLowerCase() : null;

  const filled =
    startsAt || liveAt || title || script || ribbon || sub || hasFocus || bg || accent || ink;
  if (!filled) return undefined;

  return {
    startsAt,
    ...(liveAt ? { liveAt } : {}),
    ...(title ? { title } : {}),
    ...(script ? { script } : {}),
    ...(ribbon ? { ribbon } : {}),
    ...(sub ? { sub } : {}),
    lang: f.lang,
    ...(hasFocus ? { focus: Math.min(100, Math.max(0, Math.round(focus))) } : {}),
    ...(bg ? { bg } : {}),
    ...(accent ? { accent } : {}),
    ...(ink ? { ink } : {}),
  };
}
