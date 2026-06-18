export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type Campaign = {
  id: string;
  subject: string;
  sent_count: number;
  audience_count: number;
  status: string;
  sent_at: string;
};
type Stats = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubs: number;
};
type Engaged = {
  id: string;
  name: string | null;
  email: string | null;
  opened: boolean;
  clicked: boolean;
};

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}
function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sql = db();

  const rows = (await sql`
    select id, subject, sent_count, audience_count, status, sent_at
    from campaigns where id = ${id}
  `) as Campaign[];
  if (rows.length === 0) notFound();
  const c = rows[0];

  const statRows = (await sql`
    select
      (select count(*) from email_sends where campaign_id = ${id})::int as sent,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = ${id} and e.event_type = 'email.delivered')::int as delivered,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = ${id} and e.event_type = 'email.opened')::int as opened,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = ${id} and e.event_type = 'email.clicked')::int as clicked,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = ${id} and e.event_type = 'email.bounced')::int as bounced,
      (select count(*) from unsubscribes where campaign_id = ${id})::int as unsubs
  `) as Stats[];
  const s = statRows[0];

  const engaged = (await sql`
    select m.id, m.name, m.email,
      bool_or(e.event_type = 'email.opened') as opened,
      bool_or(e.event_type = 'email.clicked') as clicked
    from email_sends es
    join members m on m.id = es.member_id
    left join email_events e on e.send_id = es.id
    where es.campaign_id = ${id}
    group by m.id, m.name, m.email
    having bool_or(e.event_type in ('email.opened', 'email.clicked'))
    order by clicked desc, opened desc, m.name asc
    limit 200
  `) as Engaged[];

  const denom = s.delivered || s.sent;

  const stat = (n: number, l: string, sub?: string) => (
    <div className="stat" key={l}>
      <div className="n">{n}</div>
      <div className="l">{l}{sub ? <> · <strong>{sub}</strong></> : null}</div>
    </div>
  );

  return (
    <>
      <Link href="/cocina/campaigns" className="back">← All campaigns</Link>
      <h1>{c.subject}</h1>
      <p className="lede">
        {c.status === "sent" ? "Sent" : c.status} {fmt(c.sent_at)} · {c.sent_count} recipients
      </p>

      <div className="stat-grid">
        {stat(s.sent, "Sent")}
        {stat(s.delivered, "Delivered")}
        {stat(s.opened, "Opened", pct(s.opened, denom))}
        {stat(s.clicked, "Clicked", pct(s.clicked, denom))}
        {stat(s.bounced, "Bounced")}
        {stat(s.unsubs, "Unsubscribed")}
      </div>

      <p className="lede" style={{ marginTop: "-8px" }}>
        Clicks are the honest signal — opens are inflated by Apple Mail auto-loading the tracking pixel.
      </p>

      <div className="panel">
        <h2>Opened or clicked ({engaged.length})</h2>
        {engaged.length === 0 ? (
          <p className="muted">No opens or clicks recorded yet. (Events arrive within a few minutes of sending, once the Resend webhook is set up.)</p>
        ) : (
          <table className="t">
            <thead>
              <tr><th>Member</th><th>Opened</th><th>Clicked</th></tr>
            </thead>
            <tbody>
              {engaged.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/cocina/members/${m.id}`}>{m.name ?? m.email ?? "(no name)"}</Link></td>
                  <td>{m.opened ? <span className="pill good">yes</span> : <span className="muted">—</span>}</td>
                  <td>{m.clicked ? <span className="pill good">yes</span> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
