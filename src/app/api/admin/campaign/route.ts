import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { renderEmail, sendBatch } from "@/lib/email";
import { runPublish, sendCampaignEmail } from "@/lib/campaignSend";
import {
  ALL_CHANNELS,
  validatePublish,
  type ChannelId,
  type FlyerInput,
} from "@/lib/publish";
import { isDraftEmpty } from "@/lib/schedule";

export const dynamic = "force-dynamic";

// Read the destinations + flyer a draft or publish carries.
function readConfig(body: Record<string, unknown>): { channels: ChannelId[]; flyer: FlyerInput } {
  const channels: ChannelId[] = Array.isArray(body.channels)
    ? (body.channels as unknown[]).filter((c): c is ChannelId => ALL_CHANNELS.includes(c as ChannelId))
    : [];
  const f = (body.flyer ?? {}) as Record<string, unknown>;
  const flyer: FlyerInput = {
    imageUrl: f.imageUrl ? String(f.imageUrl) : undefined,
    caption: f.caption ? String(f.caption) : undefined,
    alt: f.alt ? String(f.alt) : undefined,
    eventDate: f.eventDate ? String(f.eventDate) : null,
  };
  return { channels, flyer };
}

function clean(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "strong", "i", "em", "u", "a",
      "ul", "ol", "li", "h2", "h3", "div", "span", "blockquote", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "style", "width"],
      p: ["style"], div: ["style"], span: ["style"], h2: ["style"], h3: ["style"],
    },
    allowedStyles: {
      "*": {
        width: [/^\d+(\.\d+)?(px|%)$/],
        "max-width": [/^\d+(\.\d+)?(px|%)$/],
        height: [/^auto$/],
        "font-weight": [/^(bold|normal|\d{3})$/],
        "text-align": [/^(left|right|center)$/],
        display: [/^(block|inline|inline-block)$/],
        "border-radius": [/^\d+px$/],
        margin: [/^[\d.\s a-z%]+$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

type BatchResult = { data?: { id: string }[] };

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const action = String(body.action ?? "");
    const subject = String(body.subject ?? "").trim();
    const html = clean(String(body.html ?? ""));

    const textOnly = html.replace(/<[^>]+>/g, "").trim();
    const hasImage = html.includes("<img");
    const origin = new URL(req.url).origin;
    const logoUrl = `${origin}/email/logo.jpg`;

    if (action === "test") {
      if (!subject || (textOnly.length === 0 && !hasImage)) {
        return NextResponse.json(
          { error: "Subject and a message are both required." },
          { status: 400 },
        );
      }
      const testEmail = String(body.testEmail ?? "").trim();
      if (!testEmail) {
        return NextResponse.json({ error: "A test email address is required." }, { status: 400 });
      }
      const emailHtml = renderEmail(html, `${origin}/api/unsubscribe?m=test`, logoUrl);
      const result = (await sendBatch([{ to: testEmail, subject, html: emailHtml }])) as BatchResult;
      const resendId = result?.data?.[0]?.id ?? null;
      // record the test send (no campaign) so the webhook can attach its events
      await sql`
        insert into email_sends (campaign_id, member_id, email, resend_id)
        values (null, null, ${testEmail}, ${resendId})
      `;
      return NextResponse.json({ ok: true, sent: 1, test: true });
    }

    if (action === "send") {
      if (!subject || (textOnly.length === 0 && !hasImage)) {
        return NextResponse.json(
          { error: "Subject and a message are both required." },
          { status: 400 },
        );
      }
      const campaignRows = (await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status)
        values (${subject}, ${html}, 0, 0, 'sending')
        returning id
      `) as { id: string }[];
      const campaignId = campaignRows[0].id;

      const r = await sendCampaignEmail(sql, campaignId, subject, html, origin, logoUrl);
      if (r.warning) {
        return NextResponse.json({ ok: r.sent > 0, sent: r.sent, skipped: r.skipped, warning: r.warning });
      }
      return NextResponse.json({ ok: true, sent: r.sent });
    }

    if (action === "publish") {
      const { channels, flyer } = readConfig(body);

      const err = validatePublish(subject, textOnly, hasImage, flyer, channels);
      if (err) return NextResponse.json({ error: err }, { status: 400 });

      // The campaign row records this publish; runPublish links its fiesta,
      // sends the email, records dispatches, and finalizes status/sent_at.
      const emailSelected = channels.includes("email");
      const initialStatus = emailSelected ? "sending" : "published";
      const campaignRows = (await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status, fiesta_id)
        values (${subject}, ${html}, 0, 0, ${initialStatus}, null)
        returning id
      `) as { id: string }[];
      const campaignId = campaignRows[0].id;

      const { results, fiestaId, ok } = await runPublish(sql, {
        campaignId, subject, html, channels, flyer, origin, logoUrl,
      });

      // If this was sent from a saved draft (or a scheduled campaign opened in
      // the composer), retire that copy now that it's live — a scheduled copy
      // left behind would fire again later.
      const draftId = String(body.draftId ?? "");
      if (draftId) {
        await sql`delete from campaigns where id = ${draftId} and status in ('draft', 'scheduled')`;
      }

      return NextResponse.json({ ok, results, fiestaId, campaignId });
    }

    if (action === "schedule") {
      const { channels, flyer } = readConfig(body);

      // A schedule must already be a valid publish — same gate as the button.
      const err = validatePublish(subject, textOnly, hasImage, flyer, channels);
      if (err) return NextResponse.json({ error: err }, { status: 400 });

      const scheduledFor = String(body.scheduledFor ?? "");
      const when = new Date(scheduledFor);
      if (!scheduledFor || Number.isNaN(when.getTime())) {
        return NextResponse.json({ error: "Pick a valid date and time." }, { status: 400 });
      }
      if (when.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "The scheduled time must be in the future." },
          { status: 400 },
        );
      }

      const config = JSON.stringify({ channels, flyer });
      const whenIso = when.toISOString();
      const id = String(body.id ?? "");

      if (id) {
        const rows = (await sql`
          update campaigns
          set subject = ${subject}, body = ${html}, publish_config = ${config}::jsonb,
              status = 'scheduled', scheduled_for = ${whenIso}, sent_at = null
          where id = ${id} and status in ('draft', 'scheduled')
          returning id
        `) as { id: string }[];
        if (rows.length === 0) {
          return NextResponse.json(
            { error: "Campaign not found — it may have already been sent." },
            { status: 404 },
          );
        }
        return NextResponse.json({ ok: true, id, scheduledFor: whenIso });
      }

      const rows = (await sql`
        insert into campaigns
          (subject, body, audience_count, sent_count, status, sent_at, publish_config, scheduled_for)
        values (${subject}, ${html}, 0, 0, 'scheduled', null, ${config}::jsonb, ${whenIso})
        returning id
      `) as { id: string }[];
      return NextResponse.json({ ok: true, id: rows[0].id, scheduledFor: whenIso });
    }

    if (action === "cancel_schedule") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing campaign id." }, { status: 400 });
      const rows = (await sql`
        update campaigns set status = 'draft', scheduled_for = null
        where id = ${id} and status = 'scheduled'
        returning id
      `) as { id: string }[];
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "No scheduled campaign found — it may have already been sent." },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, id });
    }

    if (action === "save_draft" || action === "update_draft") {
      const { channels, flyer } = readConfig(body);
      if (isDraftEmpty(subject, textOnly, hasImage, flyer)) {
        return NextResponse.json(
          { error: "Nothing to save yet — add a subject or a message first." },
          { status: 400 },
        );
      }
      const config = JSON.stringify({ channels, flyer });

      if (action === "update_draft") {
        const id = String(body.id ?? "");
        if (!id) return NextResponse.json({ error: "Missing draft id." }, { status: 400 });
        const rows = (await sql`
          update campaigns
          set subject = ${subject}, body = ${html}, publish_config = ${config}::jsonb
          where id = ${id} and status = 'draft'
          returning id
        `) as { id: string }[];
        if (rows.length === 0) {
          return NextResponse.json(
            { error: "Draft not found — it may have already been sent." },
            { status: 404 },
          );
        }
        return NextResponse.json({ ok: true, id });
      }

      const rows = (await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status, sent_at, publish_config)
        values (${subject}, ${html}, 0, 0, 'draft', null, ${config}::jsonb)
        returning id
      `) as { id: string }[];
      return NextResponse.json({ ok: true, id: rows[0].id });
    }

    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing campaign id." }, { status: 400 });
      // Cascade removes email_sends → email_events and campaign_dispatches;
      // unsubscribes.campaign_id is set null so the unsubscribe itself is kept.
      // The fiesta this campaign announced (fiesta_id) is a separate object and
      // is left in place — manage it from /cocina/fiestas.
      await sql`delete from campaigns where id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed." },
      { status: 500 },
    );
  }
}
