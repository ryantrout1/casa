export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import {
  CARD_SIZE,
  rewardQueueLabel,
  daysWaiting,
  isAgedWaiting,
} from "@/lib/rewards";
import RedeemButton from "./RedeemButton";

type Row = {
  id: string;
  type: string;
  earned_at: string;
  member_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lifetime_visits: number;
  punch_progress: number;
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: "America/Phoenix",
    month: "short", day: "numeric", year: "numeric",
  });
}

export default async function RewardsPage() {
  const sql = db();

  const rows = (await sql`
    select r.id, r.type, r.earned_at,
           m.id as member_id, m.name, m.email, m.phone,
           m.lifetime_visits, m.punch_progress
    from rewards r
    join members m on m.id = r.member_id
    where r.status = 'earned'
    order by r.earned_at asc
  `) as Row[];

  return (
    <>
      <h1>Rewards</h1>
      <p className="lede">
        Everyone with a reward waiting to be redeemed{rows.length ? ` — ${rows.length} right now` : ""}.
        Oldest first.
      </p>

      <div className="panel">
        {rows.length === 0 ? (
          <p className="muted">
            No rewards waiting yet. As members reach 5 and 10 visits, claim a birthday
            entrée, or sign up for their welcome chips &amp; queso, they&apos;ll show up here
            ready to redeem.
          </p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Member</th>
                <th>Reward</th>
                <th>Guest</th>
                <th>Waiting</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const days = daysWaiting(r.earned_at);
                const aged = isAgedWaiting(r.earned_at);
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/cocina/members/${r.member_id}`}>
                        {r.name ?? r.email ?? r.phone ?? "(no name)"}
                      </Link>
                    </td>
                    <td><span className="pill good">{rewardQueueLabel(r.type)}</span></td>
                    <td>
                      {r.lifetime_visits === 0 ? (
                        <>
                          <span className="pill bad">New signup</span>
                          <div className="muted">never visited</div>
                        </>
                      ) : (
                        <>
                          {r.lifetime_visits} visit{r.lifetime_visits === 1 ? "" : "s"}
                          <div className="muted">punch {r.punch_progress}/{CARD_SIZE}</div>
                        </>
                      )}
                    </td>
                    <td>
                      <div>{fmtDate(r.earned_at)}</div>
                      <span className={aged ? "pill warn" : "muted"}>
                        {days}d waiting
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}><RedeemButton rewardId={r.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
