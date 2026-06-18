export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import RedeemButton from "./RedeemButton";

type Row = {
  id: string;
  type: string;
  earned_at: string;
  member_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

const LABELS: Record<string, string> = {
  welcome_chips_queso: "Free chips & queso",
  punch_dessert: "Free dessert",
  punch_entree: "Free entrée",
  birthday_entree: "Birthday entrée",
};

function label(type: string): string {
  return LABELS[type] ?? type;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default async function RewardsPage() {
  const sql = db();

  const rows = (await sql`
    select r.id, r.type, r.earned_at,
           m.id as member_id, m.name, m.email, m.phone
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
                <th>Earned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/cocina/members/${r.member_id}`}>
                      {r.name ?? r.email ?? r.phone ?? "(no name)"}
                    </Link>
                  </td>
                  <td><span className="pill good">{label(r.type)}</span></td>
                  <td>{fmtDate(r.earned_at)}</td>
                  <td style={{ textAlign: "right" }}><RedeemButton rewardId={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
