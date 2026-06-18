export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

type Stats = {
  members: number;
  with_email: number;
  phone_only: number;
  with_birthday: number;
  active30: number;
  lapsed60: number;
  near_reward: number;
  outstanding: number;
  visits: number;
};

type NearRow = {
  id: string;
  name: string | null;
  punch_progress: number;
};

export default async function Dashboard() {
  const sql = db();

  const statsRows = (await sql`
    select
      (select count(*) from members)::int as members,
      (select count(*) from members where email is not null)::int as with_email,
      (select count(*) from members where email is null)::int as phone_only,
      (select count(*) from members where birth_month is not null)::int as with_birthday,
      (select count(*) from members where last_visit_at > now() - interval '30 days')::int as active30,
      (select count(*) from members where last_visit_at < now() - interval '60 days')::int as lapsed60,
      (select count(*) from members where punch_progress in (4, 9))::int as near_reward,
      (select count(*) from rewards where status = 'earned')::int as outstanding,
      (select count(*) from visits)::int as visits
  `) as Stats[];
  const s = statsRows[0];

  const near = (await sql`
    select id, name, punch_progress
    from members
    where punch_progress in (4, 9)
    order by punch_progress desc, name asc
    limit 30
  `) as NearRow[];

  const stat = (n: number, l: string) => (
    <div className="stat" key={l}>
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );

  return (
    <>
      <h1>Dashboard</h1>
      <p className="lede">Live snapshot of the Casa Rewards program.</p>

      <div className="stat-grid">
        {stat(s.members, "Members")}
        {stat(s.active30, "Visited in last 30 days")}
        {stat(s.lapsed60, "Lapsed (60+ days)")}
        {stat(s.near_reward, "One visit from a reward")}
        {stat(s.outstanding, "Unredeemed rewards")}
        {stat(s.visits, "Total visits logged")}
        {stat(s.with_email, "Reachable by email")}
        {stat(s.with_birthday, "Birthdays on file")}
      </div>

      <div className="panel">
        <h2>One visit from a reward ({near.length})</h2>
        {near.length === 0 ? (
          <p className="muted">Nobody&apos;s on the edge of a reward right now.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Member</th>
                <th>Progress</th>
                <th>Next reward</th>
              </tr>
            </thead>
            <tbody>
              {near.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/cocina/members/${m.id}`}>
                      {m.name ?? <span className="muted">(no name)</span>}
                    </Link>
                  </td>
                  <td>{m.punch_progress} / 10</td>
                  <td>
                    <span className="pill warn">
                      {m.punch_progress === 4 ? "Free dessert" : "Free entrée"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
