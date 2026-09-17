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
import { isDraftEmpty, parseHeroCopy } from "@/lib/schedule";
import { applyRewards } from "@/lib/rewardsLine";
import { reminderPlan, type ReminderMode } from "@/lib/reminder";

// The punch count a test send pretends the reader has, so the rewards line in
// a test reads the way most members will see it.
const SAMPLE_PROGRESS = 4;
import { duplicateConfig, duplicateSubject } from "@/lib/duplicate";

export const dynamic = "force-dynamic";

// The day-of reminder a publish or schedule asks for. It is written by the
// composer (or by the flyer reader) and sent as its own email-only campaign,
// so the existing scheduled-send path does the work and the reminder stays
// visible and cancellable until it goes.
type ReminderRequest = { at: string; subject: string; html: string };

function readReminder(
  body: Record<string, unknown>,
  startsAt: string | null,
  announcementAtMs: number,
): ReminderRequest | null {
  const r = body.reminder;
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (o.on !== true) return null;

  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const html = typeof o.html === "string" ? o.html : "";
  if (!subject || html.replace(/<[^>]+>/g, "").trim() === "") return null;

  // The composer computes the same plan for the line it shows; the server
  // computes it again because the composer is never the validator.
  const plan = reminderPlan({
    startsAt,
    mode: (["morning", "before4", "custom"] as ReminderMode[]).includes(o.mode as ReminderMode)
      ? (o.mode as ReminderMode)
      : "morning",
    customLocal: typeof o.customLocal === "string" ? o.customLocal : "",
    announcementAtMs,
    nowMs: Date.now(),
  });
  if (!plan.ok || !plan.at) return null;
  return { at: plan.at, subject, html };
}

async function createReminder(
  sql: ReturnType<typeof db>,
  parentId: string,
  r: ReminderRequest,
): Promise<string | null> {
  try {
    // Rescheduling an announcement rewrites its reminder rather than stacking
    // a second one. Only an unsent reminder is replaced; one already sent is
    // history and stays.
    await sql`
      delete from campaigns where reminder_of = ${parentId} and status = 'scheduled'
    `;
    const config = JSON.stringify({ channels: ["email"], flyer: {} });
    const rows = (await sql`
      insert into campaigns
        (subject, body, audience_count, sent_count, status, sent_at, publish_config,
         scheduled_for, reminder_of)
      values (${r.subject}, ${r.html}, 0, 0, 'scheduled', null, ${config}::jsonb,
              ${r.at}, ${parentId})
      returning id
    `) as { id: string }[];
    return rows[0]?.id ?? null;
  } catch {
    // A reminder that cannot be created must never fail the publish that just
    // went out. The result says so instead.
    return null;
  }
}

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
    // Same parser the cron drain uses, so the immediate and scheduled paths
    // cannot support different subsets of the hero fields.
    hero: parseHeroCopy(f.hero),
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
      // A test is an email: it must look like what a member gets, and it must
      // never carry the rewards token as visible text. SAMPLE_PROGRESS stands
      // in for a member part way through a card.
      const emailHtml = renderEmail(
        applyRewards(html, SAMPLE_PROGRESS),
        `${origin}/api/unsubscribe?m=test`,
        logoUrl,
      );
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

      // The reminder only makes sense once the announcement is out, and only
      // when an email actually went with it.
      let reminderAt: string | null = null;
      if (emailSelected && results.email?.status === "ok") {
        const r = readReminder(body as Record<string, unknown>, flyer.hero?.startsAt ?? null, Date.now());
        if (r && (await createReminder(sql, campaignId, r))) reminderAt = r.at;
      }

      return NextResponse.json({ ok, results, fiestaId, campaignId, reminderAt });
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
        let rescheduledReminderAt: string | null = null;
        if (channels.includes("email")) {
          const r = readReminder(
            body as Record<string, unknown>,
            flyer.hero?.startsAt ?? null,
            Date.parse(whenIso),
          );
          if (r && (await createReminder(sql, id, r))) rescheduledReminderAt = r.at;
          else await sql`delete from campaigns where reminder_of = ${id} and status = 'scheduled'`;
        }
        return NextResponse.json({
          ok: true,
          id,
          scheduledFor: whenIso,
          reminderAt: rescheduledReminderAt,
        });
      }

      const rows = (await sql`
        insert into campaigns
          (subject, body, audience_count, sent_count, status, sent_at, publish_config, scheduled_for)
        values (${subject}, ${html}, 0, 0, 'scheduled', null, ${config}::jsonb, ${whenIso})
        returning id
      `) as { id: string }[];
      // A scheduled announcement gets its reminder now too, measured against
      // the time the announcement will go out rather than against now.
      let reminderAt: string | null = null;
      if (channels.includes("email")) {
        const r = readReminder(
          body as Record<string, unknown>,
          flyer.hero?.startsAt ?? null,
          Date.parse(whenIso),
        );
        if (r && (await createReminder(sql, rows[0].id, r))) reminderAt = r.at;
      }

      return NextResponse.json({ ok: true, id: rows[0].id, scheduledFor: whenIso, reminderAt });
    }

    if (action === "cancel_schedule") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing campaign id." }, { status: 400 });
      // Cancelling an announcement cancels the reminder that rode with it.
      await sql`delete from campaigns where reminder_of = ${id} and status = 'scheduled'`;
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

    if (action === "duplicate") {
      // Run it again for the next event: same channels, flyer and hero copy,
      // no dates. The copy is a draft, so nothing is published or sent by
      // duplicating.
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing campaign id." }, { status: 400 });
      const src = (await sql`
        select subject, body, publish_config from campaigns where id = ${id}
      `) as { subject: string; body: string; publish_config: unknown }[];
      if (src.length === 0) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }
      const config = JSON.stringify(duplicateConfig(src[0].publish_config));
      const rows = (await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status, sent_at, publish_config)
        values (${duplicateSubject(src[0].subject)}, ${src[0].body}, 0, 0, 'draft', null, ${config}::jsonb)
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
      // is left in place — manage it from /cocina/website.
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
