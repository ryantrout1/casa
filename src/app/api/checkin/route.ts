import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const TARGET = 10; // free entrée at 10
const DESSERT_AT = 5; // free dessert at 5

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

type Member = { id: string; name: string | null; punch_progress: number };

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
      select id, name, punch_progress
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
        target: TARGET,
      });
    }

    const progress = member.punch_progress + 1;
    let rewardEarned: string | null = null;
    if (progress === DESSERT_AT) rewardEarned = "punch_dessert";
    if (progress >= TARGET) rewardEarned = "punch_entree";

    if (rewardEarned) {
      await sql`
        insert into rewards (member_id, type, status)
        values (${member.id}, ${rewardEarned}, 'earned')
      `;
    }

    const newProgress = progress >= TARGET ? 0 : progress; // reset after the entrée
    await sql`
      update members
      set punch_progress = ${newProgress}, last_visit_at = now()
      where id = ${member.id}
    `;

    return NextResponse.json({
      found: true,
      name: member.name,
      progress: newProgress,
      target: TARGET,
      rewardEarned,
    });
  } catch {
    return NextResponse.json(
      { error: "Check-in failed. Please try again." },
      { status: 500 },
    );
  }
}
