// Server-only campaign send + publish machinery (Phase 2). Both the composer's
// Publish button and the scheduled-campaign cron drain run the SAME path:
// runPublish() executes a publish against an already-existing campaign row so
// a scheduled send behaves exactly like clicking Publish.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { renderEmail, sendBatch } from "@/lib/email";
import {
  ALL_CHANNELS,
  OWNED_SURFACES,
  flagsForChannels,
  hasOwnedSurface,
  overallOk,
  type ChannelId,
  type FlyerInput,
  type PublishResults,
} from "@/lib/publish";

type Sql = ReturnType<typeof db>;

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type BatchResult = { data?: { id: string }[] };

// Send a campaign email to every opted-in subscriber. The campaign row must
// already exist; this fills in audience_count/sent_count/status and records one
// email_sends row per recipient. Batches of 100 are isolated so one malformed
// address can't abort the whole blast (the audience query also filters those).
export async function sendCampaignEmail(
  sql: Sql,
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

export type RunPublishInput = {
  campaignId: string;
  subject: string;
  html: string;
  channels: ChannelId[];
  flyer: FlyerInput;
  origin: string;
  logoUrl: string;
};

// Execute a publish against an existing campaign row: owned website surfaces
// (one fiesta row carrying placement flags), the email blast, dispatch records,
// and final status/sent_at. Shared by the immediate Publish action and the
// cron drain so both paths behave identically.
export async function runPublish(
  sql: Sql,
  { campaignId, subject, html, channels, flyer, origin, logoUrl }: RunPublishInput,
): Promise<{ results: PublishResults; fiestaId: string | null; ok: boolean }> {
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
      await sql`update campaigns set fiesta_id = ${fiestaId} where id = ${campaignId}`;
      for (const s of OWNED_SURFACES) if (channels.includes(s)) results[s] = { status: "ok" };
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Website update failed.";
      for (const s of OWNED_SURFACES) if (channels.includes(s)) results[s] = { status: "failed", detail };
    }
  }

  // 2) Email — isolated so its failure never rolls back the website surfaces.
  // sendCampaignEmail sets sent_count and status ('sent'/'failed') itself.
  const emailSelected = channels.includes("email");
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

  // 3) Record one dispatch row per channel touched.
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

  // 4) Finalize the campaign row. Email publishes get their status from
  // sendCampaignEmail; website-only publishes are 'published'. Either way the
  // publish moment is stamped now — for scheduled sends this is fire time.
  if (emailSelected) {
    await sql`update campaigns set sent_at = now() where id = ${campaignId}`;
  } else {
    await sql`update campaigns set status = 'published', sent_at = now() where id = ${campaignId}`;
  }

  // 5) Reflect website changes immediately.
  if (anyOwned) {
    revalidatePath("/");
    revalidatePath("/fiestas");
  }

  return { results, fiestaId, ok: overallOk(results) };
}
