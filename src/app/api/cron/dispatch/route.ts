import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDraftConfig } from "@/lib/schedule";
import { runPublish } from "@/lib/campaignSend";

export const dynamic = "force-dynamic";

// Scheduled-campaign drain, hit by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer ${CRON_SECRET}` automatically when the env var is set;
// anything else — including a missing CRON_SECRET — is rejected.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = db();
  const origin = new URL(req.url).origin;
  const logoUrl = `${origin}/email/logo.jpg`;

  const due = (await sql`
    select id from campaigns
    where status = 'scheduled' and scheduled_for <= now()
    order by scheduled_for asc
    limit 10
  `) as { id: string }[];

  let processed = 0;
  let sent = 0;

  for (const row of due) {
    // Atomic claim: only one drain can flip scheduled -> sending. If another
    // invocation (or a re-run) got here first, this returns 0 rows and we skip
    // — the no-double-send guarantee.
    const claimed = (await sql`
      update campaigns set status = 'sending'
      where id = ${row.id} and status = 'scheduled'
      returning id, subject, body, publish_config
    `) as { id: string; subject: string; body: string; publish_config: unknown }[];
    if (claimed.length === 0) continue;

    processed += 1;
    const c = claimed[0];
    try {
      const { channels, flyer } = parseDraftConfig(c.publish_config);
      const r = await runPublish(sql, {
        campaignId: c.id,
        subject: c.subject,
        html: c.body,
        channels,
        flyer,
        origin,
        logoUrl,
      });
      if (r.ok) sent += 1;
    } catch {
      // Backstop only — runPublish handles its own per-channel failures. A
      // throw here means something unexpected; park the row as failed rather
      // than leaving it 'sending' forever.
      await sql`update campaigns set status = 'failed', sent_at = now() where id = ${c.id}`;
    }
  }

  return NextResponse.json({ processed, sent });
}
