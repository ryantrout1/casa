export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import Compose from "./Compose";

type Row = {
  id: string;
  subject: string;
  sent_count: number;
  status: string;
  sent_at: string;
  opens: number;
  clicks: number;
};

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export default async function CampaignsPage() {
  const sql = db();

  const countRows = (await sql`
    select count(*)::int as subscribers
    from members
    where email_subscribed = true and email is not null
  `) as { subscribers: number }[];
  const subscribers = countRows[0].subscribers;

  const recent = (await sql`
    select c.id, c.subject, c.sent_count, c.status, c.sent_at,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = c.id and e.event_type = 'email.opened')::int as opens,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = c.id and e.event_type = 'email.clicked')::int as clicks
    from campaigns c
    order by c.sent_at desc
    limit 20
  `) as Row[];

  return (
    <>
      <h1>Campaigns</h1>
      <p className="lede">
        Email your opted-in members. Right now that&apos;s{" "}
        <strong>{subscribers}</strong> {subscribers === 1 ? "person" : "people"}.
      </p>

      <Compose subscriberCount={subscribers} defaultTestEmail="ryan@casadeleyva.com" />

      <div className="panel">
        <h2>Recent sends</h2>
        {recent.length === 0 ? (
          <p className="muted">Nothing sent yet.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Subject</th>
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
                  <td>{c.sent_count}</td>
                  <td>{c.opens} <span className="muted">· {pct(c.opens, c.sent_count)}</span></td>
                  <td>{c.clicks} <span className="muted">· {pct(c.clicks, c.sent_count)}</span></td>
                  <td>{fmtDateTime(c.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
