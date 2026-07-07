export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import RewardsQueue, { type Row } from "./RewardsQueue";

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
          <RewardsQueue rows={rows} />
        )}
      </div>
    </>
  );
}
