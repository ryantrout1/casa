export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import DeleteCampaignButton from "./DeleteCampaignButton";
import {
  ALL_CHANNELS,
  resultEntries,
  type ChannelId,
  type PublishResults,
  type DispatchStatus,
} from "@/lib/publish";

type Campaign = {
  id: string;
  subject: string;
  body: string;
  fiesta_id: string | null;
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
    timeZone: "America/Phoenix",
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
    select id, subject, body, fiesta_id, sent_count, audience_count, status, sent_at
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

  // Which destinations this campaign went to (email + website surfaces).
  const dispatches = (await sql`
    select channel, status, detail from campaign_dispatches where campaign_id = ${id}
  `) as { channel: string; status: string; detail: string | null }[];
  const results: PublishResults = {};
  for (const d of dispatches) {
    if (ALL_CHANNELS.includes(d.channel as ChannelId)) {
      results[d.channel as ChannelId] = {
        status: d.status as DispatchStatus,
        detail: d.detail ?? undefined,
      };
    }
  }
  // Campaigns sent before dispatch tracking were email-only sends.
  if (Object.keys(results).length === 0 && c.sent_count > 0) {
    results.email = { status: "ok", detail: `${c.sent_count} sent` };
  }
  const dests = resultEntries(results);

  // The flyer this campaign put on the website, if any.
  let flyer: { image_url: string; caption: string | null } | null = null;
  if (c.fiesta_id) {
    const fr = (await sql`
      select image_url, caption from fiestas where id = ${c.fiesta_id}
    `) as { image_url: string; caption: string | null }[];
    flyer = fr[0] ?? null;
  }

  const bodyText = (c.body ?? "").replace(/<[^>]+>/g, "").trim();
  const hasBody = bodyText.length > 0 || (c.body ?? "").includes("<img");

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

      <div className="panel">
        <h2>What was published</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: hasBody || flyer ? 16 : 0 }}>
          {dests.length === 0 ? (
            <span className="muted">No destinations recorded.</span>
          ) : (
            dests.map((d) => (
              <span
                key={d.channel}
                className={`pill${d.ok ? " good" : ""}`}
                style={d.ok ? undefined : { background: "#fdecea", color: "#c0392b" }}
                title={d.detail ?? undefined}
              >
                {d.ok ? "✓ " : "✗ "}{d.label}{d.detail ? ` · ${d.detail}` : ""}
              </span>
            ))
          )}
        </div>

        {flyer ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: hasBody ? 16 : 0 }}>
            <img
              src={flyer.image_url}
              alt={flyer.caption ?? ""}
              style={{ width: 88, height: "auto", borderRadius: 8, border: "1px solid #eee" }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>Flyer</div>
              <div className="muted">{flyer.caption || "(no caption)"}</div>
            </div>
          </div>
        ) : null}

        {hasBody ? (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Email message</div>
            <div
              style={{
                border: "1px solid #e6e8ec",
                borderRadius: 8,
                padding: 16,
                background: "#fff",
                maxWidth: 640,
              }}
              dangerouslySetInnerHTML={{ __html: c.body }}
            />
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No email message — this was a website-only publish.
          </p>
        )}
      </div>

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

      <div className="panel">
        <h2>Danger zone</h2>
        <p className="lede" style={{ marginTop: 0 }}>
          Delete this campaign and its send history. Useful for clearing out tests. Won&apos;t touch any
          flyer it put on the website.
        </p>
        <DeleteCampaignButton id={c.id} subject={c.subject} />
      </div>
    </>
  );
}
