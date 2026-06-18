import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const TARGET = 10;
const DESSERT_AT = 5;

function phoenixToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "redeem") {
      const rewardId = String(body.rewardId ?? "");
      if (!rewardId) {
        return NextResponse.json({ error: "Missing rewardId." }, { status: 400 });
      }
      await sql`
        update rewards set status = 'redeemed', redeemed_at = now()
        where id = ${rewardId} and status = 'earned'
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "checkin") {
      const memberId = String(body.memberId ?? "");
      if (!memberId) {
        return NextResponse.json({ error: "Missing memberId." }, { status: 400 });
      }
      const found = (await sql`
        select id, punch_progress from members where id = ${memberId} limit 1
      `) as { id: string; punch_progress: number }[];
      if (found.length === 0) {
        return NextResponse.json({ error: "Member not found." }, { status: 404 });
      }
      const member = found[0];
      const today = phoenixToday();

      const inserted = (await sql`
        insert into visits (member_id, visit_date)
        values (${memberId}, ${today})
        on conflict (member_id, visit_date) do nothing
        returning id
      `) as { id: string }[];

      if (inserted.length === 0) {
        return NextResponse.json({
          ok: true,
          alreadyCheckedInToday: true,
          progress: member.punch_progress,
        });
      }

      const progress = member.punch_progress + 1;
      let rewardEarned: string | null = null;
      if (progress === DESSERT_AT) rewardEarned = "punch_dessert";
      if (progress >= TARGET) rewardEarned = "punch_entree";

      if (rewardEarned) {
        await sql`
          insert into rewards (member_id, type, status)
          values (${memberId}, ${rewardEarned}, 'earned')
        `;
      }

      const newProgress = progress >= TARGET ? 0 : progress;
      await sql`
        update members set punch_progress = ${newProgress}, last_visit_at = now()
        where id = ${memberId}
      `;

      return NextResponse.json({ ok: true, progress: newProgress, rewardEarned });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Action failed. Please try again." }, { status: 500 });
  }
}
