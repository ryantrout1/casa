export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CARD_SIZE, rewardLabelDetailed } from "@/lib/rewards";
import Actions from "./Actions";

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birth_month: number | null;
  birth_day: number | null;
  punch_progress: number;
  lifetime_visits: number;
  last_visit_at: string | null;
  email_subscribed: boolean;
  sms_consent: boolean;
  source: string;
};
type Visit = { id: string; visit_date: string };
type Reward = {
  id: string;
  type: string;
  status: string;
  earned_at: string;
  redeemed_at: string | null;
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sql = db();

  const members = (await sql`
    select id, name, email, phone, birth_month, birth_day, punch_progress,
           lifetime_visits, last_visit_at, email_subscribed, sms_consent, source
    from members where id = ${id}
  `) as Member[];
  if (members.length === 0) notFound();
  const m = members[0];

  const visits = (await sql`
    select id, visit_date from visits where member_id = ${id} order by visit_date desc
  `) as Visit[];
  const rewards = (await sql`
    select id, type, status, earned_at, redeemed_at
    from rewards where member_id = ${id} order by earned_at desc
  `) as Reward[];

  const earned = rewards
    .filter((r) => r.status === "earned")
    .map((r) => ({ id: r.id, type: r.type }));

  const birthday =
    m.birth_month && m.birth_day
      ? `${String(m.birth_month).padStart(2, "0")}/${String(m.birth_day).padStart(2, "0")}`
      : "—";

  return (
    <>
      <Link href="/cocina/members" className="back">
        ← All members
      </Link>
      <h1>{m.name ?? "(no name)"}</h1>
      <p className="lede">
        Card progress: <strong>{m.punch_progress} / {CARD_SIZE}</strong>
        {" · "}Lifetime visits: <strong>{m.lifetime_visits}</strong>
      </p>

      <div className="panel">
        <dl className="kv">
          <dt>Email</dt>
          <dd>{m.email ?? <span className="muted">—</span>}</dd>
          <dt>Phone</dt>
          <dd>{m.phone ?? <span className="muted">—</span>}</dd>
          <dt>Birthday</dt>
          <dd>{birthday}</dd>
          <dt>Last visit</dt>
          <dd>{fmtDate(m.last_visit_at)}</dd>
          <dt>Email opt-in</dt>
          <dd>{m.email_subscribed ? "Yes" : "No"}</dd>
          <dt>SMS consent</dt>
          <dd>{m.sms_consent ? "Yes" : "No"}</dd>
          <dt>Source</dt>
          <dd>{m.source}</dd>
        </dl>
        <Actions memberId={m.id} earnedRewards={earned} />
      </div>

      <div className="panel">
        <h2>Rewards ({rewards.length})</h2>
        {rewards.length === 0 ? (
          <p className="muted">No rewards yet.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Reward</th>
                <th>Status</th>
                <th>Earned</th>
                <th>Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id}>
                  <td>{rewardLabelDetailed(r.type)}</td>
                  <td>
                    <span className={`pill ${r.status === "earned" ? "warn" : "good"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{fmtDate(r.earned_at)}</td>
                  <td>{fmtDate(r.redeemed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Visits ({visits.length})</h2>
        {visits.length === 0 ? (
          <p className="muted">No visits logged yet.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{fmtDate(v.visit_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
