import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CARD_SIZE, rewardForVisit, nextProgress, isBirthdayWeek, BIRTHDAY_REWARD } from "@/lib/rewards";

function normPhone(p: unknown): string | null {
  const d = String(p ?? "").replace(/\D/g, "");
  return d || null;
}

// "Today" must be the restaurant's local day (Arizona = America/Phoenix, no DST)
// so a late-night check-in doesn't roll into the next UTC day and break the
// one-punch-per-day rule.
function phoenixToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type Member = {
  id: string;
  name: string | null;
  punch_progress: number;
  birth_month: number | null;
  birth_day: number | null;
};

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const phone = normPhone(body.phone);
    const phone10 = phone ? phone.slice(-10) : null;
    const email = String(body.email ?? "").trim().toLowerCase() || null;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Phone or email is required." },
        { status: 400 },
      );
    }

    const found = (await sql`
      select id, name, punch_progress, birth_month, birth_day
      from members
      where (${phone10}::text is not null
              and right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ${phone10})
         or (${email}::text is not null and email = ${email})
      limit 1
    `) as Member[];

    if (found.length === 0) {
      // Not a member yet — the page should route them to the signup form.
      return NextResponse.json({ found: false });
    }
    const member = found[0];
    const today = phoenixToday();

    // One punch per day, enforced by unique (member_id, visit_date).
    const inserted = (await sql`
      insert into visits (member_id, visit_date)
      values (${member.id}, ${today})
      on conflict (member_id, visit_date) do nothing
      returning id
    `) as { id: string }[];

    if (inserted.length === 0) {
      return NextResponse.json({
        found: true,
        name: member.name,
        alreadyCheckedInToday: true,
        progress: member.punch_progress,
        target: CARD_SIZE,
      });
    }

    const progress = member.punch_progress + 1;
    const rewardEarned: string | null = rewardForVisit(progress);

    if (rewardEarned) {
      await sql`
        insert into rewards (member_id, type, status)
        values (${member.id}, ${rewardEarned}, 'earned')
      `;
    }

    const newProgress = nextProgress(progress);
    await sql`
      update members
      set punch_progress = ${newProgress},
          lifetime_visits = lifetime_visits + 1,
          last_visit_at = now()
      where id = ${member.id}
    `;

    // Birthday-week reward: once per year, independent of punch progress.
    let birthdayEarned = false;
    if (isBirthdayWeek(member.birth_month, member.birth_day)) {
      const recent = (await sql`
        select 1 from rewards
        where member_id = ${member.id} and type = ${BIRTHDAY_REWARD}
          and earned_at > now() - interval '330 days'
        limit 1
      `) as unknown[];
      if (recent.length === 0) {
        await sql`
          insert into rewards (member_id, type, status)
          values (${member.id}, ${BIRTHDAY_REWARD}, 'earned')
        `;
        birthdayEarned = true;
      }
    }

    return NextResponse.json({
      found: true,
      name: member.name,
      progress: newProgress,
      target: CARD_SIZE,
      rewardEarned,
      birthdayEarned,
    });
  } catch {
    return NextResponse.json(
      { error: "Check-in failed. Please try again." },
      { status: 500 },
    );
  }
}
