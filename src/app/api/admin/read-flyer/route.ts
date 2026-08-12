import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FLYER_SCHEMA, parseFlyerResponse } from "@/lib/flyerRead";

export const dynamic = "force-dynamic";

// Reads an uploaded flyer and proposes hero field values.
//
// This lives on the server for one reason: the API key. Everything else about
// the read — parsing, validation, date normalisation — is in lib/flyerRead,
// which is pure and tested. This file is the thin shell that fetches bytes,
// makes one HTTP call, and hands the body over.
//
// The whole route degrades to `{ ok: false }`. No key, no such image, a 429, a
// timeout, a refusal — every path returns the same shape and the composer
// carries on with an empty form. Reading a flyer is a convenience; publishing
// is not.

const API_URL = "https://api.anthropic.com/v1/messages";

// Sonnet is the right cost/quality point for a single poster: vision is
// available across the model line, and Opus's higher per-token price and
// high-resolution token tier buy nothing for reading large display type.
const MODEL = "claude-sonnet-4-6";

// Generous enough that the JSON can never be cut off. A truncated response
// carries stop_reason "max_tokens" and parseFlyerResponse voids it, so a tight
// budget would turn into silent read failures rather than saved tokens.
const MAX_TOKENS = 2048;

// The API accepts 10MB base64; our upload route caps files at ~4MB, which is
// ~5.4MB encoded. This guard catches anything that predates that cap.
const MAX_B64 = 9_000_000;

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

// Wall-clock budget. A slow read must not hold the composer's upload spinner
// indefinitely — better to fail and let the admin type.
const TIMEOUT_MS = 30_000;

const PROMPT = `This is a promotional flyer for a Mexican restaurant's event. Its text is
going to be re-typeset into a website hero banner, so read it as a set of
layout slots rather than as one block of copy.

Read the DESIGN and the TEXT. Report only what is printed on the poster or is
visibly part of its artwork. Do not identify, name, or describe any person
depicted — you are reading a layout, not the people in it.

THE SLOTS, in the order they will be stacked on the page:

- title — the event's name, set as the largest and boldest type on the poster.
  If the name's lockup continues into a smaller decorative or cursive word,
  that continuation is NOT part of title.
- script — that continuation: the smaller cursive or handwritten-looking part
  of the title lockup. Null if the lockup is a single weight.
- ribbon — a short banner, strip, or tagline sitting under the title.
- sub — ONE short supporting line, usually the address or a practical detail.
  It must NOT repeat anything already in title, script, or ribbon. If the
  poster has nothing left to say, return null.

Worked example. A poster whose top line reads "CASA DE LEYVA PRESENTA", below
which "El Palomazo" is set huge with "en Casa" flowing off it in script,
above a banner reading "UNA NOCHE DE KARAOKE MEXICANO":
  title  = "El Palomazo"
  script = "en Casa"
  ribbon = "UNA NOCHE DE KARAOKE MEXICANO"
and "CASA DE LEYVA PRESENTA" is discarded — see below.

DISCARD, never assign to a slot: presenter and host lines ("X presents",
"presentado por"), the venue's own name and logo, sponsor credits, social
handles, and website addresses. The page already knows whose site it is.

OTHER FIELDS:

- caption — a short label for a listing page. One line, not a summary.
- alt — an accessibility description of the artwork.
- lang — the language the DATE should be written in on the website. Match how
  this poster prints its own date: "SATURDAY AUGUST 29" is en, "SÁBADO 29 DE
  AGOSTO" is es. This is not a judgement about the poster's overall language.
- Date and time — report only what you can actually read. Set year to null
  unless the poster prints a year. Convert any clock time to 24-hour parts.
- Colours — bg is the dominant background, accent is the brightest signature
  colour used for emphasis, ink is the headline's own text colour. Name the
  colours a designer would pick out of the artwork, not an average of pixels.

Copy slot text verbatim, including accents and punctuation. Do not translate.
Anything the poster does not say: null. Never guess.`;

export async function POST(req: Request) {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    // Absence of the key is the feature's off switch — no deploy needed to
    // disable it, and preview environments without one simply do not offer it.
    if (!key) return NextResponse.json({ ok: false, reason: "not_configured" });

    const body = (await req.json().catch(() => ({}))) as { imageId?: unknown };
    const imageId = typeof body.imageId === "string" ? body.imageId : "";
    if (!imageId) return NextResponse.json({ ok: false, reason: "bad_request" });

    const sql = db();
    const rows = (await sql`
      select content_type, data_base64 from email_images where id = ${imageId} limit 1
    `) as { content_type: string; data_base64: string }[];
    if (rows.length === 0) return NextResponse.json({ ok: false, reason: "not_found" });

    const { content_type, data_base64 } = rows[0];
    if (!SUPPORTED.has(content_type)) {
      return NextResponse.json({ ok: false, reason: "unsupported_type" });
    }
    if (data_base64.length > MAX_B64) {
      return NextResponse.json({ ok: false, reason: "too_large" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let apiBody: unknown;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [
            {
              role: "user",
              // Image before text: the documented ordering that reads best.
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: content_type, data: data_base64 },
                },
                { type: "text", text: PROMPT },
              ],
            },
          ],
          // Constrained decoding. Without this the response is prose-shaped
          // JSON that needs retries; with it the shape is guaranteed except
          // for refusals and truncation, both of which the parser handles.
          output_config: { format: { type: "json_schema", schema: FLYER_SCHEMA } },
        }),
      });

      if (!res.ok) {
        // Status only — an error body can echo request content, and none of it
        // helps the admin, who just needs to know to type the fields.
        return NextResponse.json({ ok: false, reason: `api_${res.status}` });
      }
      apiBody = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const suggestion = parseFlyerResponse(apiBody);
    if (!suggestion) return NextResponse.json({ ok: false, reason: "unreadable" });

    return NextResponse.json({ ok: true, suggestion });
  } catch {
    // Includes the abort. Never surfaces an exception to the composer.
    return NextResponse.json({ ok: false, reason: "error" });
  }
}
