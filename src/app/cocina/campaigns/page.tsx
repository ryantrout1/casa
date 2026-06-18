export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Compose from "./Compose";

type Campaign = {
  id: string;
  subject: string;
  sent_count: number;
  audience_count: number;
  status: string;
  sent_at: string;
};

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    select id, subject, sent_count, audience_count, status, sent_at
    from campaigns
    order by sent_at desc
    limit 20
  `) as Campaign[];

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
                <th>Sent to</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>{c.subject}</td>
                  <td>{c.sent_count}</td>
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
