import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normPhone(p: unknown): string | null {
  const d = String(p ?? "").replace(/\D/g, "");
  return d || null;
}

// Form collects "MM/DD" (no year). Store month + day; ignore year entirely.
function parseBirthday(mmdd: unknown): [number | null, number | null] {
  const s = String(mmdd ?? "").trim();
  const m = s.match(/^(\d{1,2})\D+(\d{1,2})$/);
  if (!m) return [null, null];
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return [null, null];
  return [month, day];
}

function isUniqueViolation(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: string }).code === "23505"
  );
}

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const name = String(body.name ?? "").trim() || null;
    const email = String(body.email ?? "").trim().toLowerCase() || null;
    const phone = normPhone(body.phone);
    const smsConsent = Boolean(body.smsConsent);

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone is required." },
        { status: 400 },
      );
    }
    const [bm, bd] = parseBirthday(body.birthday);

    let memberId: string;
    try {
      const rows = (await sql`
        insert into members
          (name, email, phone, birth_month, birth_day,
           email_subscribed, sms_consent, sms_consent_at, source)
        values
          (${name}, ${email}, ${phone}, ${bm}, ${bd},
           true, ${smsConsent}, ${smsConsent ? new Date().toISOString() : null},
           'rewards_signup')
        returning id
      `) as { id: string }[];
      memberId = rows[0].id;
    } catch (e) {
      // 23505 = unique violation: this email or phone is already a member
      if (isUniqueViolation(e)) {
        return NextResponse.json({ ok: true, alreadyMember: true });
      }
      throw e;
    }

    // Welcome treat: free chips & queso, redeemable on next visit
    await sql`
      insert into rewards (member_id, type, status)
      values (${memberId}, 'welcome_chips_queso', 'earned')
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 },
    );
  }
}
