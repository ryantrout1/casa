import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rewardForVisit, nextProgress, isBirthdayWeek, BIRTHDAY_REWARD } from "@/lib/rewards";

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

    if (action === "grant_birthday") {
      const memberId = String(body.memberId ?? "");
      if (!memberId) {
        return NextResponse.json({ error: "Missing memberId." }, { status: 400 });
      }
      const recent = (await sql`
        select 1 from rewards
        where member_id = ${memberId} and type = ${BIRTHDAY_REWARD}
          and earned_at > now() - interval '330 days'
        limit 1
      `) as unknown[];
      if (recent.length > 0) {
        return NextResponse.json({ ok: true, alreadyGranted: true });
      }
      await sql`
        insert into rewards (member_id, type, status)
        values (${memberId}, ${BIRTHDAY_REWARD}, 'earned')
      `;
      return NextResponse.json({ ok: true, birthdayGranted: true });
    }

    if (action === "checkin") {
      const memberId = String(body.memberId ?? "");
      if (!memberId) {
        return NextResponse.json({ error: "Missing memberId." }, { status: 400 });
      }
      const found = (await sql`
        select id, punch_progress, birth_month, birth_day from members where id = ${memberId} limit 1
      `) as { id: string; punch_progress: number; birth_month: number | null; birth_day: number | null }[];
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
      const rewardEarned: string | null = rewardForVisit(progress);

      if (rewardEarned) {
        await sql`
          insert into rewards (member_id, type, status)
          values (${memberId}, ${rewardEarned}, 'earned')
        `;
      }

      const newProgress = nextProgress(progress);
      await sql`
        update members set punch_progress = ${newProgress},
            lifetime_visits = lifetime_visits + 1,
            last_visit_at = now()
        where id = ${memberId}
      `;

      // Birthday-week reward: once per year, independent of punch progress.
      let birthdayEarned = false;
      if (isBirthdayWeek(member.birth_month, member.birth_day)) {
        const recent = (await sql`
          select 1 from rewards
          where member_id = ${memberId} and type = ${BIRTHDAY_REWARD}
            and earned_at > now() - interval '330 days'
          limit 1
        `) as unknown[];
        if (recent.length === 0) {
          await sql`
            insert into rewards (member_id, type, status)
            values (${memberId}, ${BIRTHDAY_REWARD}, 'earned')
          `;
          birthdayEarned = true;
        }
      }

      return NextResponse.json({ ok: true, progress: newProgress, rewardEarned, birthdayEarned });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Action failed. Please try again." }, { status: 500 });
  }
}
