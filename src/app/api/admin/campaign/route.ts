import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { renderEmail, sendBatch } from "@/lib/email";
import {
  ALL_CHANNELS,
  OWNED_SURFACES,
  flagsForChannels,
  hasOwnedSurface,
  validatePublish,
  overallOk,
  type ChannelId,
  type FlyerInput,
  type PublishResults,
} from "@/lib/publish";

export const dynamic = "force-dynamic";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

// Send a campaign email to every opted-in subscriber. The campaign row must
// already exist; this fills in audience_count/sent_count/status and records one
// email_sends row per recipient. Batches of 100 are isolated so one malformed
// address can't abort the whole blast (the audience query also filters those).
async function sendCampaignEmail(
  sql: ReturnType<typeof db>,
  campaignId: string,
  subject: string,
  html: string,
  origin: string,
  logoUrl: string,
): Promise<{ sent: number; skipped: number; audience: number; warning?: string }> {
  const members = (await sql`
    select id, email from members
    where email_subscribed = true
      and email is not null
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
  `) as { id: string; email: string }[];

  await sql`update campaigns set audience_count = ${members.length} where id = ${campaignId}`;

  if (members.length === 0) {
    await sql`update campaigns set sent_count = 0, status = 'sent' where id = ${campaignId}`;
    return { sent: 0, skipped: 0, audience: 0 };
  }

  const recipients = members.map((m) => ({
    m: m.id,
    e: m.email.trim(),
    html: renderEmail(html, `${origin}/api/unsubscribe?m=${m.id}&c=${campaignId}`, logoUrl),
  }));

  const sends: { m: string; e: string; r: string | null }[] = [];
  const batchErrors: string[] = [];
  let sent = 0;
  for (const group of chunk(recipients, 100)) {
    try {
      const result = (await sendBatch(
        group.map((r) => ({ to: r.e, subject, html: r.html })),
      )) as BatchResult;
      const ids = Array.isArray(result?.data) ? result.data : [];
      group.forEach((r, i) => sends.push({ m: r.m, e: r.e, r: ids[i]?.id ?? null }));
      sent += group.length;
    } catch (err) {
      batchErrors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (sends.length > 0) {
    await sql`
      insert into email_sends (campaign_id, member_id, email, resend_id)
      select ${campaignId}::uuid, (x->>'m')::uuid, x->>'e', x->>'r'
      from json_array_elements(${JSON.stringify(sends)}::json) as x
    `;
  }

  const finalStatus = sent > 0 ? "sent" : "failed";
  await sql`update campaigns set sent_count = ${sent}, status = ${finalStatus} where id = ${campaignId}`;

  return { sent, skipped: recipients.length - sent, audience: members.length, warning: batchErrors[0] };
}

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
      const channels: ChannelId[] = Array.isArray(body.channels)
        ? (body.channels as unknown[]).filter((c): c is ChannelId =>
            ALL_CHANNELS.includes(c as ChannelId),
          )
        : [];
      const flyerIn = (body.flyer ?? {}) as Record<string, unknown>;
      const flyer: FlyerInput = {
        imageUrl: flyerIn.imageUrl ? String(flyerIn.imageUrl) : undefined,
        caption: flyerIn.caption ? String(flyerIn.caption) : undefined,
        alt: flyerIn.alt ? String(flyerIn.alt) : undefined,
        eventDate: flyerIn.eventDate ? String(flyerIn.eventDate) : null,
      };

      const err = validatePublish(subject, textOnly, hasImage, flyer, channels);
      if (err) return NextResponse.json({ error: err }, { status: 400 });

      const flags = flagsForChannels(channels);
      const anyOwned = hasOwnedSurface(channels);
      const results: PublishResults = {};
      let fiestaId: string | null = null;

      // 1) Owned surfaces — one fiesta row carries the placement flags.
      if (anyOwned) {
        try {
          if (flags.is_hero) {
            // Single-hero invariant: demote the current hero before promoting this one.
            await sql`update fiestas set is_hero = false where is_hero = true`;
          }
          const frows = (await sql`
            insert into fiestas
              (image_url, alt, caption, event_date, is_hero, in_grid, on_fiestas_page, is_evergreen, featured_at)
            values
              (${flyer.imageUrl}, ${flyer.alt ?? ""}, ${flyer.caption ?? null}, ${flyer.eventDate || null},
               ${flags.is_hero}, ${flags.in_grid}, ${flags.on_fiestas_page}, false, now())
            returning id
          `) as { id: string }[];
          fiestaId = frows[0].id;
          for (const s of OWNED_SURFACES) if (channels.includes(s)) results[s] = { status: "ok" };
        } catch (e) {
          const detail = e instanceof Error ? e.message : "Website update failed.";
          for (const s of OWNED_SURFACES) if (channels.includes(s)) results[s] = { status: "failed", detail };
        }
      }

      // 2) The campaign row records this publish and links its fiesta.
      const emailSelected = channels.includes("email");
      const initialStatus = emailSelected ? "sending" : "published";
      const campaignRows = (await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status, fiesta_id)
        values (${subject}, ${html}, 0, 0, ${initialStatus}, ${fiestaId})
        returning id
      `) as { id: string }[];
      const campaignId = campaignRows[0].id;

      // 3) Email — isolated so its failure never rolls back the website surfaces.
      if (emailSelected) {
        try {
          const r = await sendCampaignEmail(sql, campaignId, subject, html, origin, logoUrl);
          if (r.sent > 0) {
            results.email = {
              status: "ok",
              detail: r.skipped > 0 ? `${r.sent} sent, ${r.skipped} skipped` : `${r.sent} sent`,
            };
          } else if (r.audience === 0) {
            results.email = { status: "skipped", detail: "No subscribers to email." };
          } else {
            results.email = { status: "failed", detail: r.warning ?? "No emails sent." };
          }
        } catch (e) {
          results.email = { status: "failed", detail: e instanceof Error ? e.message : "Email failed." };
          await sql`update campaigns set status = 'failed' where id = ${campaignId}`;
        }
      }

      // 4) Record one dispatch row per channel touched.
      const dispatchRows = ALL_CHANNELS
        .filter((c) => results[c])
        .map((c) => ({ channel: c, status: results[c]!.status, detail: results[c]!.detail ?? null }));
      if (dispatchRows.length > 0) {
        await sql`
          insert into campaign_dispatches (campaign_id, channel, status, detail)
          select ${campaignId}::uuid, x->>'channel', x->>'status', x->>'detail'
          from json_array_elements(${JSON.stringify(dispatchRows)}::json) as x
        `;
      }

      // 5) Reflect website changes immediately.
      if (anyOwned) {
        revalidatePath("/");
        revalidatePath("/fiestas");
      }

      return NextResponse.json({ ok: overallOk(results), results, fiestaId, campaignId });
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
