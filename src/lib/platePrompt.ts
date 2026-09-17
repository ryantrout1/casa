import { isHex } from "./palette";
import { responsePayload } from "./flyerRead";
import { platePath } from "./heroPlate";

// Flyer in, background-plate prompt out.
//
// The read is split from the flyer copy read on purpose. That read fills form
// fields; this one describes the picture so an image model can redraw its
// scene with no lettering in it. Keeping them apart means neither schema
// grows for the other's sake, and a scene read that fails leaves the copy read
// (and the form) untouched.
//
// The prompt template is fixed. Only the scene slots change per flyer, which
// is what keeps every plate consistent: same camera, same reserved copy zone,
// same "no text" instruction the first Honky Tonk attempt was missing.
//
// Pure and client-safe. The network call and key live in the read-flyer route.

/** JSON schema for the scene read, handed to the Messages API as the output format. */
export const SCENE_SCHEMA = {
  type: "object" as const,
  properties: {
    setting: {
      type: "string",
      description: "One sentence describing the physical environment of the artwork.",
    },
    hero_objects: {
      type: "array",
      items: { type: "string" },
      description: "Up to 4 physical objects that define the event's theme.",
    },
    background_elements: {
      type: "array",
      items: { type: "string" },
      description: "Up to 4 physical background elements. No signage or lettering.",
    },
    lighting: { type: "string", description: "The lighting, in a short phrase." },
    mood: { type: "string", description: "The mood, in a few words." },
    palette: {
      type: "array",
      description: "3 to 5 dominant colours of the artwork.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          hex: { type: "string", description: "#rrggbb" },
        },
        required: ["name", "hex"],
        additionalProperties: false,
      },
    },
  },
  required: ["setting", "hero_objects", "background_elements", "lighting", "mood", "palette"],
  additionalProperties: false,
};

export const SCENE_PROMPT = `This is a promotional flyer for a Mexican restaurant's event. An image
model is going to redraw its scene as a website background with NO text in it,
so describe the picture, not the poster.

Describe only physical things you can see in the artwork: the setting, the
objects, the background, the light, the mood, the colours.

IGNORE entirely: all text, lettering, titles, dates, prices, logos, signs and
banners that carry words, and layout panels or boxes meant to hold text. If a
sign is part of the scene, do not mention it.

Do not describe, identify, or mention any person. The background will have no
people in it.

Keep every field short and concrete. hero_objects and background_elements are
at most four items each. palette is three to five colours with #rrggbb hex.`;

/** A scene, cleaned and bounded. */
export type Scene = {
  setting: string;
  heroObjects: string[];
  backgroundElements: string[];
  lighting: string;
  mood: string;
  palette: { name: string; hex: string }[];
};

const MAX_FIELD = 240;
const MAX_ITEMS = 4;
const MAX_PALETTE = 5;

// One line of bounded text. Line breaks are flattened so no field can add a
// line of its own to the prompt, and length is capped so one runaway field
// cannot swamp it.
function line(v: string): string {
  return v.replace(/\s+/g, " ").trim().slice(0, MAX_FIELD).trim();
}

function list(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .filter((x): x is string => typeof x === "string")
    .map(line)
    .filter((x) => x !== "")
    .slice(0, MAX_ITEMS);
}

/**
 * Turn a Messages API response into a scene, or null.
 *
 * Total. Voids on every failure shape responsePayload knows, on a missing or
 * wrong-typed key, and on a scene with no setting or no hero objects: a prompt
 * built from those would ask for a generic bar, not this event.
 *
 * The palette is the one soft field. It is a hint, so bad entries drop out
 * rather than voiding an otherwise good description.
 */
export function parseSceneResponse(raw: unknown): Scene | null {
  const p = responsePayload(raw);
  if (!p) return null;
  for (const key of SCENE_SCHEMA.required) {
    if (!(key in p) || p[key] === undefined) return null;
  }

  const strings = [p.setting, p.lighting, p.mood];
  if (!strings.every((s) => typeof s === "string")) return null;

  const setting = line(p.setting as string);
  const heroObjects = list(p.hero_objects);
  const backgroundElements = list(p.background_elements);
  if (!setting || !heroObjects || heroObjects.length === 0 || !backgroundElements) return null;

  const palette = Array.isArray(p.palette)
    ? p.palette
        .filter(
          (c): c is { name: string; hex: string } =>
            !!c &&
            typeof c === "object" &&
            typeof (c as { name?: unknown }).name === "string" &&
            typeof (c as { hex?: unknown }).hex === "string" &&
            isHex((c as { hex: string }).hex),
        )
        .map((c) => ({ name: line(c.name), hex: c.hex.toLowerCase() }))
        .filter((c) => c.name !== "")
        .slice(0, MAX_PALETTE)
    : [];

  return {
    setting,
    heroObjects,
    backgroundElements,
    lighting: line(p.lighting as string),
    mood: line(p.mood as string),
    palette,
  };
}

export type PlateAspect = "16:9" | "4:5";

// Where the subject goes, per plate. Desktop mirrors the live hero: copy sits
// over the left and the bottom, so the subject moves right and those zones stay
// dark. The phone plate is cropped square above the copy, so the subject is
// centred and nothing important sits near an edge.
const COMPOSITION: Record<PlateAspect, { objects: string; layout: string }> = {
  "16:9": {
    objects: "grouped center-right",
    layout:
      "Composition: the left 40% and the bottom third are dark, low-detail, " +
      "and uncluttered so white text can sit on top.",
  },
  "4:5": {
    objects: "grouped and centered",
    layout:
      "Composition: the key objects sit fully inside the middle 70% of the " +
      "frame, and the bottom fifth fades to near-black.",
  },
};

/** The prompt to paste into an image model for one plate. */
export function platePrompt(scene: Scene, aspect: PlateAspect): string {
  const c = COMPOSITION[aspect];
  const lines = [
    `Photorealistic cinematic background plate, ${aspect} aspect ratio, highest available resolution.`,
    "This is a website background, NOT a poster. Absolutely no text, letters, numbers, words, logos, or signage anywhere in the image.",
    "Any signs or neon must be blank shapes or abstract glowing tubes.",
    "",
    `Setting: ${scene.setting}.`,
    `Key objects, ${c.objects}: ${scene.heroObjects.join("; ")}.`,
  ];
  if (scene.backgroundElements.length > 0) {
    lines.push(`Background, softly out of focus: ${scene.backgroundElements.join("; ")}.`);
  }
  lines.push(`Lighting: ${scene.lighting}. Mood: ${scene.mood}.`);
  if (scene.palette.length > 0) {
    lines.push(`Palette: ${scene.palette.map((p) => `${p.name} ${p.hex}`).join(", ")}.`);
  }
  lines.push(
    "",
    c.layout,
    "No people. Nothing important within 5% of any edge. Shallow depth of field.",
  );
  return lines.join("\n");
}

/** Both plates' prompts from one read. */
export function platePrompts(scene: Scene): { desktop: string; mobile: string } {
  return { desktop: platePrompt(scene, "16:9"), mobile: platePrompt(scene, "4:5") };
}

/**
 * The email_images id behind a flyer URL, or null.
 *
 * Flyer URLs are stored absolute, so the id is read through platePath, which
 * accepts exactly one `/api/img/<uuid>` path on any host and nothing else.
 */
export function imageIdOf(url: unknown): string | null {
  const p = platePath(url);
  return p ? p.slice("/api/img/".length) : null;
}
