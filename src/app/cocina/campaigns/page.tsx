export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import Compose from "./Compose";
import { parseDraftConfig } from "@/lib/schedule";
import { type ChannelId } from "@/lib/publish";

type Row = {
  id: string;
  subject: string;
  sent_count: number;
  status: string;
  sent_at: string;
  opens: number;
  clicks: number;
  channels: string | null;
};

// Timestamps are stored UTC; the server renders in UTC on Vercel, so pin
// every display to Arizona wall-clock time.
function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}
const CHANNEL_SHORT: Record<string, string> = {
  email: "Email",
  hero: "Hero",
  grid: "Grid",
  fiestas_page: "Fiestas",
};
function fmtChannels(channels: string | null, sentCount: number): string {
  if (channels) {
    return channels
      .split(",")
      .map((c) => CHANNEL_SHORT[c] ?? c)
      .join(", ");
  }
  // Campaigns from before dispatch tracking were email-only sends.
  return sentCount > 0 ? "Email" : "—";
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const sql = db();
  const { draft } = await searchParams;

  const countRows = (await sql`
    select count(*)::int as subscribers
    from members
    where email_subscribed = true
      and email is not null
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
  `) as { subscribers: number }[];
  const subscribers = countRows[0].subscribers;

  // Load a draft or scheduled campaign into the composer if one is requested.
  let initialDraft:
    | {
        id: string;
        subject: string;
        body: string;
        channels: ChannelId[];
        flyer: ReturnType<typeof parseDraftConfig>["flyer"];
        status: string;
        scheduledFor: string | null;
      }
    | undefined;
  if (draft) {
    const drows = (await sql`
      select id, subject, body, publish_config, status, scheduled_for
      from campaigns where id = ${draft} and status in ('draft', 'scheduled')
    `) as {
      id: string;
      subject: string;
      body: string;
      publish_config: unknown;
      status: string;
      scheduled_for: string | null;
    }[];
    if (drows[0]) {
      const cfg = parseDraftConfig(drows[0].publish_config);
      initialDraft = {
        id: drows[0].id,
        subject: drows[0].subject,
        body: drows[0].body,
        channels: cfg.channels,
        flyer: cfg.flyer,
        status: drows[0].status,
        scheduledFor: drows[0].scheduled_for
          ? new Date(drows[0].scheduled_for).toISOString()
          : null,
      };
    }
  }

  const drafts = (await sql`
    select id, subject, created_at
    from campaigns where status = 'draft'
    order by created_at desc
    limit 20
  `) as { id: string; subject: string; created_at: string }[];

  const scheduled = (await sql`
    select id, subject, scheduled_for
    from campaigns where status = 'scheduled'
    order by scheduled_for asc
    limit 20
  `) as { id: string; subject: string; scheduled_for: string }[];

  const recent = (await sql`
    select c.id, c.subject, c.sent_count, c.status, c.sent_at,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = c.id and e.event_type = 'email.opened')::int as opens,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = c.id and e.event_type = 'email.clicked')::int as clicks,
      (select string_agg(d.channel, ',' order by d.channel)
        from campaign_dispatches d where d.campaign_id = c.id and d.status = 'ok') as channels
    from campaigns c
    where c.status not in ('draft', 'scheduled')
    order by coalesce(c.sent_at, c.created_at) desc
    limit 20
  `) as Row[];

  return (
    <>
      <h1>Campaigns</h1>
      <p className="lede">
        Email your opted-in members. Right now that&apos;s{" "}
        <strong>{subscribers}</strong> {subscribers === 1 ? "person" : "people"}.
      </p>

      <Compose
        key={initialDraft?.id ?? "new"}
        subscriberCount={subscribers}
        defaultTestEmail="ryan@casadeleyva.com"
        initialDraft={initialDraft}
      />

      {drafts.length > 0 ? (
        <div className="panel">
          <h2>Drafts</h2>
          <table className="t">
            <thead>
              <tr><th>Subject</th><th>Saved</th></tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/cocina/campaigns?draft=${d.id}`}>{d.subject || "(untitled draft)"}</Link></td>
                  <td className="muted">{fmtDateTime(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {scheduled.length > 0 ? (
        <div className="panel">
          <h2>Scheduled</h2>
          <table className="t">
            <thead>
              <tr><th>Subject</th><th>Goes out (Arizona time)</th></tr>
            </thead>
            <tbody>
              {scheduled.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/cocina/campaigns?draft=${s.id}`}>{s.subject || "(untitled)"}</Link></td>
                  <td className="muted">{fmtDateTime(s.scheduled_for)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="panel">
        <h2>Recent sends</h2>
        {recent.length === 0 ? (
          <p className="muted">Nothing sent yet.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Where</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Clicked</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/cocina/campaigns/${c.id}`}>{c.subject}</Link></td>
                  <td className="muted">{fmtChannels(c.channels, c.sent_count)}</td>
                  <td>{c.sent_count}</td>
                  <td>{c.opens} <span className="muted">· {pct(c.opens, c.sent_count)}</span></td>
                  <td>{c.clicks} <span className="muted">· {pct(c.clicks, c.sent_count)}</span></td>
                  <td>{c.sent_at ? fmtDateTime(c.sent_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
