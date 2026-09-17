import { AA_CONTRAST, AA_LARGE, CREAM, contrastRatio, isHex } from "./palette";
import { heroMotif, type MotifSource } from "./heroMotif";
import type { HeroView } from "./heroViews";
import type { HeroLang } from "./publish";

// The plate takeover: a text-free background image, generated from the flyer,
// filling the whole hero with the live copy set over it. This module decides
// everything about it; PlateHero only renders what comes back.
//
// Pure and client-safe, like the other hero modules. Imports only palette,
// heroMotif, and types.
//
// A plate is opt-in per row. Every row published before these columns existed
// has none, and heroTier sends those rows down exactly the path Hero.tsx used
// before, so adding this tier changes nothing for them.

/** What this module needs off a Flyer. Structurally a subset, so callers pass one. */
export type PlateSource = {
  heroPlateUrl: string | null;
  heroPlateMobileUrl: string | null;
  heroPlateFocus: number | null;
};

// Same rule as the fiestas_hero_plate_path CHECK. The two are halves of one
// guard, the split hero_focus and hero_colors_hex already use.
const PATH_RE = /^\/api\/img\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A plate reference reduced to a same-origin `/api/img/<uuid>` path, or null.
 *
 * The upload route hands back an absolute URL built from whatever host served
 * the request. Stored as-is, a plate uploaded from a preview deploy would point
 * at that preview forever, which is the debt every flyer `src` already carries.
 * Plates never carry it: the host is stripped here, and anything that is not
 * exactly one image path (query strings included) is refused rather than
 * repaired.
 */
export function platePath(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s === "") return null;

  let path: string;
  if (s.startsWith("/")) {
    // A protocol-relative URL names a host; it is not a path.
    if (s.startsWith("//")) return null;
    path = s;
  } else if (/^https?:\/\//i.test(s)) {
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      return null;
    }
    if (u.search || u.hash) return null;
    path = u.pathname;
  } else {
    return null;
  }

  const lower = path.toLowerCase();
  return PATH_RE.test(lower) ? lower : null;
}

/**
 * The object-position for a plate.
 *
 * One number applied to both axes. `object-fit: cover` only ever crops one
 * axis at a time, so the value always means "where along the cropped axis to
 * look": top-to-bottom on a wide desktop band, left-to-right on a tall phone.
 * Desktop and mobile honour it identically (policy: a focus the phone ignores
 * is a slider that silently does nothing).
 *
 * Null is the centre. Unlike flyers, plates are generated with their subject
 * placed deliberately, not composed top-down.
 */
export function plateFocusCss(focus: number | null): string {
  if (focus === null || !Number.isFinite(focus)) return "50% 50%";
  const p = Math.min(100, Math.max(0, Math.round(focus)));
  return `${p}% ${p}%`;
}

/**
 * Widest viewport that gets the mobile plate. The same 880px the stylesheet's
 * mobile block uses, so the image and the layout switch at the same width.
 */
export const PLATE_BREAKPOINT = 880;

export type PlateSources = { desktop: string; mobile: string | null; pos: string };

/**
 * The images a plate hero draws, or null when there is no usable desktop plate.
 *
 * The desktop plate is required and the mobile plate is optional: a phone
 * without its own plate gets the desktop one, cropped at the focus. A mobile
 * plate alone is not a plate hero, because every desktop visitor would then
 * see a takeover with nothing behind it.
 */
export function plateSources(f: PlateSource): PlateSources | null {
  const desktop = platePath(f.heroPlateUrl);
  if (!desktop) return null;
  return {
    desktop,
    mobile: platePath(f.heroPlateMobileUrl),
    pos: plateFocusCss(f.heroPlateFocus),
  };
}

/**
 * The shade laid over the plate, and the least opaque it ever gets anywhere
 * the copy sits. globals.css mirrors both: the colour as rgba(14,8,5,…) and
 * the minimum as the alpha at the edge of the copy zone. Change them together.
 */
export const PLATE_SHADE = { r: 14, g: 8, b: 5 } as const;
export const PLATE_SHADE_MIN = 0.8;

function hex2(n: number): string {
  return Math.round(n).toString(16).padStart(2, "0");
}

/**
 * The lightest colour any pixel under the copy can be: the shade at its
 * minimum opacity over pure white. The plate itself is unknown, so text is
 * gated against this rather than against anything sampled from it.
 */
export const PLATE_GROUND =
  "#" +
  (["r", "g", "b"] as const)
    .map((k) => hex2(PLATE_SHADE_MIN * PLATE_SHADE[k] + (1 - PLATE_SHADE_MIN) * 255))
    .join("");

/** Text colour on a plate. Fixed: the ground is always the dark shade. */
export const PLATE_INK = CREAM;

/**
 * Custom properties for a plate hero.
 *
 * Two themed colours at most, as policy requires: the ink, and the flyer's
 * accent when it can be read. The ribbon and primary button keep Casa's teal
 * and yellow. No `--fx-bg`: the plate is the ground.
 *
 * The accent is gated against PLATE_GROUND, not the row's hero_bg. hero_bg is
 * the flyer's colour, and on a plate hero it is nowhere on screen.
 */
export function plateStyleVars(f: { heroAccent: string | null }): Record<string, string> {
  const out: Record<string, string> = { "--fx-ink": PLATE_INK };
  const accent = f.heroAccent && isHex(f.heroAccent) ? f.heroAccent.toLowerCase() : null;
  if (accent) {
    const ratio = contrastRatio(accent, PLATE_GROUND);
    if (ratio >= AA_CONTRAST) out["--fx-accent"] = accent;
    if (ratio >= AA_LARGE) out["--fx-accent-lg"] = accent;
  }
  return out;
}

/** The third button on a plate hero. The flyer is no longer on screen, so it gets a way in. */
export const FLYER_LABEL: Record<HeroLang, string> = {
  en: "View Flyer",
  es: "Ver el Flyer",
};

/** The lightbox's close button, in the same language as the block that opened it. */
export const FLYER_CLOSE_LABEL: Record<HeroLang, string> = {
  en: "Close",
  es: "Cerrar",
};

export type HeroTier = "plate" | "motif" | "flyer" | "brand";

/**
 * Which hero to render.
 *
 * The takeover gate is unchanged: a headline and a usable date, read off the
 * view models. Past that, a usable plate wins, then a usable motif, then the
 * flyer crop. With no plate this is exactly the expression Hero.tsx used
 * before, which the tests pin against every live row.
 */
export function heroTier(f: PlateSource & MotifSource, views: HeroView[]): HeroTier {
  if (!(views.length > 0 && views[0].when)) return "brand";
  if (plateSources(f)) return "plate";
  if (heroMotif(f).motif !== "none") return "motif";
  return "flyer";
}

// ---------------------------------------------------------------------------
// Admin: /cocina/fiestas plate block
// ---------------------------------------------------------------------------

/** The three plate columns as sethero writes them. */
export type PlateColumns = {
  url: string | null;
  mobileUrl: string | null;
  focus: number | null;
};

// A crop typed or slid in the admin. Blank means "use the centre"; a number or
// numeric string is clamped and rounded rather than dropped, matching how the
// flyer crop is handled, because the DB CHECK would otherwise fail the save.
function focusValue(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

const PLATE_KEYS = ["heroPlateUrl", "heroPlateMobileUrl", "heroPlateFocus"] as const;

/**
 * The plate columns a sethero request asks for, or null for "leave them alone".
 *
 * Null when the request carries none of the three keys. sethero rewrites every
 * hero column on each save, so an admin tab opened before plates existed would
 * otherwise wipe a plate the next time it saved the headline. That is the
 * silent-drop shape; this is the guard against it.
 *
 * Present keys are validated here, on the server, not trusted from the client:
 * an unusable path is stored as null, never repaired into something else.
 */
export function plateColumnsFrom(body: Record<string, unknown>): PlateColumns | null {
  if (!PLATE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(body, k))) return null;
  return {
    url: platePath(body.heroPlateUrl),
    mobileUrl: platePath(body.heroPlateMobileUrl),
    focus: focusValue(body.heroPlateFocus),
  };
}

/**
 * What the admin badge says about the plate being edited.
 *
 * - none: no plate; the hero uses the motif or flyer takeover
 * - on: the homepage will draw the plate takeover
 * - needs_desktop: only a mobile plate; nothing will change on the site
 * - bad_url: a plate reference that cannot be stored (saving clears it)
 * - needs_copy: a usable plate, but no headline or date, so the brand hero shows
 */
export type PlateStatus = "none" | "on" | "needs_desktop" | "bad_url" | "needs_copy";

export function plateStatus(d: {
  plateUrl: string;
  plateMobileUrl: string;
  hasTitle: boolean;
  hasDate: boolean;
}): PlateStatus {
  const desk = d.plateUrl.trim();
  const mob = d.plateMobileUrl.trim();
  if (desk === "" && mob === "") return "none";
  if ((desk !== "" && !platePath(desk)) || (mob !== "" && !platePath(mob))) return "bad_url";
  if (desk === "") return "needs_desktop";
  if (!d.hasTitle || !d.hasDate) return "needs_copy";
  return "on";
}
